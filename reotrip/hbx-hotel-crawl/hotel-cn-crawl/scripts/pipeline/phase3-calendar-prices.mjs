/**
 * Phase 3: Calendar prices — full room-type × date matrix (required business model).
 *
 * Price is always tied to room + board (meal plan), not hotel-level only.
 *
 * Modes:
 *   --mode=fullRoom      (default) POST 3.0/hotels per day, flatten rooms→boards→rates
 *   --mode=priceCalendar  daily min-price only (legacy / fast overview)
 *
 * Usage:
 *   node scripts/pipeline/phase3-calendar-prices.mjs --dest=PEK --limit=20 --mode=fullRoom --daysAhead=90
 *   node scripts/pipeline/phase3-calendar-prices.mjs --dest=PEK,PVG --mode=fullRoom --hotelBatch=10 --delayMs=1000
 *
 * Output per hotel:
 *   calendar-meta.json       progress + summary
 *   calendar-by-room.jsonl   one line per (date, room, board, rate)
 *   calendar.json            compact summary + sample (for xlsx)
 *   rooms.json               unique room types seen
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import {
  ensureSession,
  ensureFreshToken,
  injectXhrHelpers,
  readDarwinToken,
} from "../../lib/api-client.mjs";
import { appendProgress, loadCheckpoint, saveCheckpoint } from "../../lib/checkpoint.mjs";
import { guardDisk, loadPipelineConfig } from "../../lib/disk-guard.mjs";
import { loadConfig, resolveFromRoot } from "../../lib/paths.mjs";

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    const m = item.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Flatten hotel.rooms → boards → rates into row objects. */
function flattenRoomRates(hotel, checkIn, checkOut) {
  const rows = [];
  const roomsIndex = [];
  if (!hotel?.rooms?.length) return { rows, roomsIndex };
  for (const room of hotel.rooms) {
    const roomCode = room.code != null ? String(room.code) : null;
    const roomName = room.name || room.description || null;
    roomsIndex.push({
      code: roomCode,
      name: roomName,
      occupancy: room.occupancy || null,
    });
    const boards = Array.isArray(room.boards) ? room.boards : [];
    if (!boards.length) {
      rows.push({
        checkIn,
        checkOut,
        nights: 1,
        roomCode,
        roomName,
        boardCode: null,
        boardName: null,
        status: "no_board",
        price: null,
        currency: null,
      });
      continue;
    }
    for (const board of boards) {
      const boardCode = board.code || board.boardCode || null;
      const boardName = board.name || board.boardName || null;
      const rates = Array.isArray(board.rates) ? board.rates : [];
      if (!rates.length) {
        rows.push({
          checkIn,
          checkOut,
          nights: 1,
          roomCode,
          roomName,
          boardCode,
          boardName,
          status: "no_rate",
          price: null,
          currency: null,
        });
        continue;
      }
      for (const rate of rates) {
        const pb = rate.priceBreakdown || {};
        const currency =
          pb?.currency?.code ||
          rate.currency?.code ||
          rate.currency ||
          rate.cancellationPolicies?.[0]?.amount?.currency?.code ||
          "CNY";
        const price = pb.net ?? pb.sellingRate ?? pb.baseAmount ?? rate.net ?? rate.sellingRate ?? null;
        rows.push({
          checkIn,
          checkOut,
          nights: 1,
          roomCode,
          roomName,
          boardCode,
          boardName,
          boardGroupCode: board.boardGroup?.code || null,
          boardGroupName: board.boardGroup?.name || null,
          rateClass: rate.rateClass || null,
          rateType: rate.rateType || null,
          allotment: rate.allotment ?? null,
          price,
          sellingRate: pb.sellingRate ?? null,
          net: pb.net ?? null,
          currency,
          rateKey: rate.rateKey || null,
          status: price != null ? "ok" : "ok_no_price",
        });
      }
    }
  }
  return { rows, roomsIndex };
}

const args = parseArgs(process.argv.slice(2));
const destFilter = args.dest
  ? String(args.dest)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : ["PEK"];
const limit = args.limit != null ? Number(args.limit) : 999999;
const siteConfig = await loadConfig();
const pipe = await loadPipelineConfig();
const dataRoot = pipe.dataRoot;
const probeFile = path.join(dataRoot, "00-state", "probes", "calendar-probe-latest.json");
const cpFile = path.join(dataRoot, "00-state", "checkpoint.json");
const progressFile = path.join(dataRoot, "00-state", "progress.jsonl");
const writeCounter = { n: 0 };

// default: full room × date (business requirement)
const mode = String(args.mode || pipe.phases?.calendar?.mode || "fullRoom");
const fullRoom = mode === "fullRoom" || mode === "full-room" || mode === "room";
const dailyPath = "/client-hotel-avail-api/3.0/hotels?locale=zh";
const calendarPath = "/client-hotel-avail-api/1.0/hotels/calendar?locale=zh";
const daysAhead = Number(args.daysAhead || pipe.phases?.calendar?.daysAhead || 90);
const dayStep = Math.max(1, Number(args.dayStep || 1));
const hotelBatch = Math.max(1, Math.min(20, Number(args.hotelBatch || 8)));
const delay = Number(args.delayMs || pipe.phases?.calendar?.requestDelayMs || 1000);
const force = args.force === "true" || args.force === true;
const startOffsetDays = Number(args.startOffsetDays || 1); // from tomorrow by default

console.log(
  `[calendar] mode=${fullRoom ? "fullRoom(date×room×board)" : mode} daysAhead=${daysAhead} dayStep=${dayStep} hotelBatch=${hotelBatch} delayMs=${delay}`,
);

// probe optional for fullRoom (we know the path); still load if present
let probeMeta = null;
try {
  probeMeta = JSON.parse(await fs.readFile(probeFile, "utf8"));
} catch {
  /* ok for fullRoom */
}
if (!fullRoom && (!probeMeta?.probe?.ok || !probeMeta.probe?.hit)) {
  console.error(JSON.stringify({ ok: false, error: "no_calendar_probe", hint: "use --mode=fullRoom or run probe" }));
  process.exit(2);
}

const gate0 = await guardDisk(pipe, { forceCheck: true, writeCounter });
if (!gate0.allow) {
  console.error(JSON.stringify({ ok: false, paused: true, reason: gate0.reason }));
  process.exit(3);
}

const browser = await chromium
  .connectOverCDP(`http://127.0.0.1:${siteConfig.chrome.remoteDebuggingPort}`, { timeout: 8000 })
  .catch(() => null);
if (!browser) {
  console.error("CDP unavailable");
  process.exit(2);
}
const context = browser.contexts()[0];
let page =
  context.pages().find((p) => /gta-travel|bedsonline/.test(p.url()) && !p.isClosed()) ||
  context.pages().find((p) => !p.isClosed()) ||
  (await context.newPage());

async function ensurePage() {
  if (page && !page.isClosed()) return page;
  page =
    context.pages().find((p) => /gta-travel|bedsonline/.test(p.url()) && !p.isClosed()) ||
    context.pages().find((p) => !p.isClosed()) ||
    (await context.newPage());
  await ensureSession(page, siteConfig.site);
  return page;
}

const session = await ensureSession(page, siteConfig.site);
if (!session.ok) {
  console.error(JSON.stringify({ ok: false, error: "login_failed" }));
  process.exit(2);
}
{
  const meta = await readDarwinToken(page);
  console.log(
    `[session] start tokenLen=${meta.len || 0} expInMin=${meta.expInMin ?? "?"} ttlH=${meta.ttlHours ?? "?"}`,
  );
  if (meta.expired || (meta.expInSec != null && meta.expInSec < 20 * 60)) {
    const fresh = await ensureFreshToken(page, siteConfig.site, { minRemainingSec: 15 * 60 });
    if (!fresh.token) {
      console.error(JSON.stringify({ ok: false, error: "token_refresh_failed" }));
      process.exit(2);
    }
  }
}

let cp = await loadCheckpoint(cpFile);
cp.phase = "calendar-full-room";
cp.stats = cp.stats || {};
await saveCheckpoint(cpFile, cp);

const pyWriter = resolveFromRoot("scripts/write-hotel-workbook.py");
const startDate = addDays(ymd(new Date()), startOffsetDays);
const dateList = [];
for (let i = 0; i < daysAhead; i += dayStep) dateList.push(addDays(startDate, i));

let hotelsProcessed = 0;
let hotelsSkipped = 0;
let rateRowsWritten = 0;
const tokenTouchEvery = 20;

async function postAvail(hotelCodes, checkIn, checkOut) {
  await ensurePage();
  return page.evaluate(
    async ({ hotelCodes, checkIn, checkOut, helpers, pathName }) => {
      eval(helpers);
      const token = __hbxCleanToken();
      const url = "https://webapi.gta-travel.cn" + pathName;
      return __hbxXhrPost(url, token, {
        hotelCodes,
        stay: { checkIn, checkOut },
        occupancies: [{ rooms: 1, adults: 2, children: 0 }],
        pageSize: Math.max(hotelCodes.length, 5),
      });
    },
    {
      hotelCodes,
      checkIn,
      checkOut,
      helpers: injectXhrHelpers(),
      pathName: dailyPath,
    },
  );
}

async function touchToken(processed) {
  if (processed > 0 && processed % tokenTouchEvery !== 0) return;
  try {
    await ensurePage();
    const meta = await readDarwinToken(page).catch(() => ({}));
    if (!meta.token || meta.expired || (meta.expInSec != null && meta.expInSec < 20 * 60)) {
      console.warn(`[session] refresh expInMin=${meta.expInMin ?? "n/a"}`);
      const fresh = await ensureFreshToken(page, siteConfig.site, { minRemainingSec: 15 * 60 });
      if (!fresh.token) {
        console.error(JSON.stringify({ ok: false, error: "token_lost", hotelsProcessed }));
        process.exit(2);
      }
      console.log(`[session] ok via=${fresh.via} expInMin=${fresh.expInMin ?? "?"}`);
    } else if (processed > 0) {
      console.log(`[session] ok expInMin=${meta.expInMin} hotelsProcessed=${processed}`);
    }
  } catch (e) {
    console.warn(`[session] touch fail: ${e.message || e}`);
    await ensurePage();
  }
}

async function loadMeta(hotelDir) {
  try {
    return JSON.parse(await fs.readFile(path.join(hotelDir, "calendar-meta.json"), "utf8"));
  } catch {
    return null;
  }
}

async function isComplete(hotelDir) {
  if (force) return false;
  const meta = await loadMeta(hotelDir);
  if (meta?.mode === "fullRoom" && meta?.status === "ok" && (meta.daysDone || 0) >= daysAhead) {
    return true;
  }
  // also accept previous fullRoom ok with enough rate rows
  try {
    const cal = JSON.parse(await fs.readFile(path.join(hotelDir, "calendar.json"), "utf8"));
    if (cal?.mode === "fullRoom" && cal?.status === "ok" && (cal.daysDone || 0) >= daysAhead) return true;
  } catch {
    /* no */
  }
  return false;
}

/**
 * Process one destination: for each date, batch hotels that still need that date.
 * Per-hotel files are updated incrementally for resume.
 */
async function processDestFullRoom(dest, hotels) {
  const destDir = path.join(dataRoot, "02-hotel-products", dest);
  // prepare hotel state
  const work = [];
  for (const h of hotels) {
    const hotelCode = String(h.hotelCode);
    const hotelDir = path.join(destDir, hotelCode);
    await fs.mkdir(hotelDir, { recursive: true });
    if (await isComplete(hotelDir)) {
      hotelsSkipped += 1;
      continue;
    }
    const meta = (await loadMeta(hotelDir)) || {
      mode: "fullRoom",
      status: "partial",
      hotelCode,
      dest,
      startDate,
      daysAhead,
      dayStep,
      daysDone: 0,
      completedDates: [],
      roomTypes: {},
      rateRows: 0,
    };
    // resume: skip dates already in completedDates
    const doneSet = new Set(meta.completedDates || []);
    work.push({ hotelCode, hotelDir, meta, doneSet, h });
  }
  if (!work.length) {
    console.log(`[dest] ${dest} all hotels fullRoom complete (or empty)`);
    return;
  }
  console.log(`[dest] ${dest} fullRoom hotels=${work.length} dates=${dateList.length} hotelBatch=${hotelBatch}`);

  for (const checkIn of dateList) {
    const checkOut = addDays(checkIn, 1);
    // hotels that still need this date
    const need = work.filter((w) => !w.doneSet.has(checkIn));
    if (!need.length) continue;

    for (let i = 0; i < need.length; i += hotelBatch) {
      const gate = await guardDisk(pipe, { writeCounter });
      if (!gate.allow) {
        cp.phase = "paused";
        cp.lastPauseReason = gate.reason;
        await saveCheckpoint(cpFile, cp);
        console.error(JSON.stringify({ ok: false, paused: true, reason: gate.reason }));
        process.exit(3);
      }
      await touchToken(hotelsProcessed + i);

      const chunk = need.slice(i, i + hotelBatch);
      const codes = chunk.map((c) => c.hotelCode);
      let res;
      try {
        res = await postAvail(codes, checkIn, checkOut);
      } catch (e) {
        console.warn(`[avail] evaluate fail ${checkIn}: ${e.message || e}`);
        await ensurePage();
        await ensureFreshToken(page, siteConfig.site, { minRemainingSec: 15 * 60 });
        try {
          res = await postAvail(codes, checkIn, checkOut);
        } catch (e2) {
          console.warn(`[avail] retry fail ${checkIn}: ${e2.message || e2}`);
          await sleep(delay);
          continue;
        }
      }
      if (res.status === 401 || res.status === 403) {
        console.warn(`[session] HTTP ${res.status} on ${checkIn} — refresh`);
        await ensureFreshToken(page, siteConfig.site, { minRemainingSec: 15 * 60 });
        res = await postAvail(codes, checkIn, checkOut);
      }

      const byCode = new Map();
      if (res.status === 200 && Array.isArray(res.json?.hotels)) {
        for (const hotel of res.json.hotels) {
          byCode.set(String(hotel.code), hotel);
        }
      }

      for (const w of chunk) {
        const hotel = byCode.get(w.hotelCode);
        const { rows, roomsIndex } = hotel
          ? flattenRoomRates(hotel, checkIn, checkOut)
          : {
              rows: [
                {
                  checkIn,
                  checkOut,
                  nights: 1,
                  roomCode: null,
                  roomName: null,
                  boardCode: null,
                  boardName: null,
                  status: res.status === 200 ? "no_hotel_in_response" : `http_${res.status}`,
                  price: null,
                  currency: null,
                },
              ],
              roomsIndex: [],
            };

        // append jsonl
        if (rows.length) {
          const lines = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
          await fs.appendFile(path.join(w.hotelDir, "calendar-by-room.jsonl"), lines);
          rateRowsWritten += rows.length;
          w.meta.rateRows = (w.meta.rateRows || 0) + rows.length;
        }
        for (const rt of roomsIndex) {
          if (rt.code) w.meta.roomTypes[rt.code] = rt.name || w.meta.roomTypes[rt.code] || null;
        }
        w.doneSet.add(checkIn);
        w.meta.completedDates = [...w.doneSet].sort();
        w.meta.daysDone = w.doneSet.size;
        w.meta.lastCheckIn = checkIn;
        w.meta.updatedAt = new Date().toISOString();
        w.meta.status = w.doneSet.size >= dateList.length ? "ok" : "partial";
        await fs.writeFile(path.join(w.hotelDir, "calendar-meta.json"), JSON.stringify(w.meta, null, 2) + "\n");

        // rooms.json snapshot
        const roomsArr = Object.entries(w.meta.roomTypes).map(([code, name]) => ({ code, name }));
        await fs.writeFile(path.join(w.hotelDir, "rooms.json"), JSON.stringify(roomsArr, null, 2) + "\n");

        // compact calendar.json for compatibility / xlsx (sample + aggregates)
        if (w.meta.status === "ok" || w.doneSet.size % 10 === 0) {
          const prices = [];
          // read tail of jsonl is expensive; store running min/max on meta
          for (const r of rows) {
            if (r.price != null) {
              w.meta.minPrice =
                w.meta.minPrice == null ? r.price : Math.min(w.meta.minPrice, r.price);
              w.meta.maxPrice =
                w.meta.maxPrice == null ? r.price : Math.max(w.meta.maxPrice, r.price);
              prices.push(r);
            }
          }
          const summary = {
            hotelCode: w.hotelCode,
            dest,
            mode: "fullRoom",
            status: w.meta.status,
            startDate,
            daysAhead,
            dayStep,
            daysDone: w.meta.daysDone,
            roomCount: roomsArr.length,
            rateRows: w.meta.rateRows,
            minPrice: w.meta.minPrice ?? null,
            maxPrice: w.meta.maxPrice ?? null,
            currency: "CNY",
            note: "Full room×board×date matrix in calendar-by-room.jsonl",
            sampleRates: prices.slice(0, 5),
            at: new Date().toISOString(),
          };
          await fs.writeFile(path.join(w.hotelDir, "calendar.json"), JSON.stringify(summary, null, 2) + "\n");

          if (w.meta.status === "ok") {
            hotelsProcessed += 1;
            cp.stats.calendarsDone = (cp.stats.calendarsDone || 0) + 1;
            // workbook
            const productPath = path.join(w.hotelDir, "product.json");
            try {
              await fs.access(productPath);
              spawnSync(
                "python3",
                [
                  pyWriter,
                  "--product",
                  productPath,
                  "--calendar",
                  path.join(w.hotelDir, "calendar.json"),
                  "--out",
                  path.join(w.hotelDir, "product.xlsx"),
                ],
                { encoding: "utf8" },
              );
            } catch {
              /* no product */
            }
            await appendProgress(progressFile, {
              event: "calendar_fullroom_done",
              dest,
              hotel: w.hotelCode,
              days: w.meta.daysDone,
              rooms: roomsArr.length,
              rateRows: w.meta.rateRows,
            });
            console.log(
              `[calendar-full] ${dest}/${w.hotelCode} days=${w.meta.daysDone} rooms=${roomsArr.length} rates=${w.meta.rateRows}`,
            );
          }
        }
      }

      await saveCheckpoint(cpFile, cp);
      await sleep(delay);
    }
    console.log(`[date] ${dest} ${checkIn} batch-pass done need=${need.length}`);
  }
}

// ---------- priceCalendar legacy (min price only) ----------
async function processDestMinPrice(dest, hotels) {
  // kept for optional --mode=priceCalendar
  const destDir = path.join(dataRoot, "02-hotel-products", dest);
  for (const h of hotels) {
    const hotelCode = String(h.hotelCode);
    const hotelDir = path.join(destDir, hotelCode);
    await fs.mkdir(hotelDir, { recursive: true });
    // skip if fullRoom already done
    if (await isComplete(hotelDir)) {
      hotelsSkipped += 1;
      continue;
    }
    await touchToken(hotelsProcessed);
    const checkIn = startDate;
    const checkOut = addDays(checkIn, 1);
    const body = {
      hotelCode,
      shiftDays: Number(args.shiftDays || 90),
      stay: { checkIn, checkOut },
      occupancies: [{ rooms: 1, adults: 2, children: 0 }],
    };
    const res = await page.evaluate(
      async ({ pathName, body, helpers }) => {
        eval(helpers);
        const token = __hbxCleanToken();
        return __hbxXhrPost("https://webapi.gta-travel.cn" + pathName, token, body);
      },
      { pathName: calendarPath, body, helpers: injectXhrHelpers() },
    );
    const rates = [];
    if (res.status === 200 && res.json?.priceCalendar) {
      for (const row of res.json.priceCalendar) {
        rates.push({
          checkIn: row.checkIn,
          checkOut: row.checkOut,
          price: row.price ?? null,
          roomDescription: row.roomDescription || null,
          currency: res.json.currency?.code || "CNY",
          status: row.price != null ? "ok" : "no_price",
          note: "min-price-only (not full room matrix)",
        });
      }
    }
    await fs.writeFile(
      path.join(hotelDir, "calendar.json"),
      JSON.stringify(
        {
          hotelCode,
          dest,
          mode: "priceCalendar",
          status: rates.some((r) => r.price != null) ? "ok_min_only" : "empty",
          rates,
          minPrice: res.json?.minPrice,
          maxPrice: res.json?.maxPrice,
          at: new Date().toISOString(),
        },
        null,
        2,
      ) + "\n",
    );
    hotelsProcessed += 1;
    await sleep(delay);
  }
}

// ---------- main loop ----------
for (const dest of destFilter) {
  const destDir = path.join(dataRoot, "02-hotel-products", dest);
  let hotels = [];
  try {
    const idx = await fs.readFile(path.join(destDir, "_hotel-index.jsonl"), "utf8");
    hotels = idx
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    const lists = path.join(dataRoot, "01-destination-lists");
    const folder = (await fs.readdir(lists)).find((d) => d.startsWith(`${dest}-`));
    if (folder) {
      const raw = await fs.readFile(path.join(lists, folder, "hotel-list.jsonl"), "utf8");
      hotels = raw
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
    }
  }
  hotels = hotels.slice(0, limit);
  if (!hotels.length) {
    console.log(`[dest] ${dest} no hotels`);
    continue;
  }
  if (fullRoom) await processDestFullRoom(dest, hotels);
  else await processDestMinPrice(dest, hotels);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: fullRoom ? "fullRoom" : mode,
      hotelsProcessed,
      hotelsSkipped,
      rateRowsWritten,
      daysAhead,
      hotelBatch,
      startDate,
    },
    null,
    2,
  ),
);
