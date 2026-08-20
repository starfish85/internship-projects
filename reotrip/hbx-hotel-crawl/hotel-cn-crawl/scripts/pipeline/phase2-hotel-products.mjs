/**
 * Phase 2: For each destination hotel list, create per-hotel folders with
 * product.json + product.xlsx (+ images when endpoints available).
 *
 * Usage:
 *   node scripts/pipeline/phase2-hotel-products.mjs --dest=PEK --limit=20
 *   node scripts/pipeline/phase2-hotel-products.mjs --dest=PEK,PVG --limit=5
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { ensureSession, injectXhrHelpers } from "../../lib/api-client.mjs";
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

const args = parseArgs(process.argv.slice(2));
const destFilter = args.dest ? String(args.dest).split(",").map((s) => s.trim()) : null;
const limit = args.limit != null ? Number(args.limit) : null;
const probeContent = args.probeContent === "true";
const siteConfig = await loadConfig();
const pipe = await loadPipelineConfig();
const dataRoot = pipe.dataRoot;
const listsRoot = path.join(dataRoot, "01-destination-lists");
const productsRoot = path.join(dataRoot, "02-hotel-products");
const stateDir = path.join(dataRoot, "00-state");
const cpFile = path.join(stateDir, "checkpoint.json");
const progressFile = path.join(stateDir, "progress.jsonl");
const writeCounter = { n: 0 };

let cp = await loadCheckpoint(cpFile);
cp.phase = "product";
await saveCheckpoint(cpFile, cp);

const gate0 = await guardDisk(pipe, { forceCheck: true, writeCounter });
if (!gate0.allow) {
  console.error(JSON.stringify({ ok: false, paused: true, reason: gate0.reason }));
  process.exit(3);
}

const browser = await chromium.connectOverCDP(
  `http://127.0.0.1:${siteConfig.chrome.remoteDebuggingPort}`,
  { timeout: 5000 },
).catch(() => null);
if (!browser) {
  console.error("CDP unavailable");
  process.exit(2);
}
const page =
  browser.contexts()[0].pages().find((p) => /gta-travel|bedsonline/.test(p.url())) ||
  browser.contexts()[0].pages()[0] ||
  (await browser.contexts()[0].newPage());

const session = await ensureSession(page, siteConfig.site);
if (!session.ok) {
  console.error(JSON.stringify({ ok: false, error: "login_failed" }));
  process.exit(2);
}

const listDirs = (await fs.readdir(listsRoot)).filter((d) => !d.startsWith("."));
const jobs = [];
for (const folder of listDirs) {
  const code = folder.split("-")[0];
  if (destFilter && !destFilter.includes(code)) continue;
  const listPath = path.join(listsRoot, folder, "hotel-list.jsonl");
  let lines = [];
  try {
    lines = (await fs.readFile(listPath, "utf8")).split("\n").filter(Boolean);
  } catch {
    continue;
  }
  let hotels = lines.map((l) => JSON.parse(l));
  if (limit != null) hotels = hotels.slice(0, limit);
  jobs.push({ code, folder, hotels });
}

const pyWriter = resolveFromRoot("scripts/write-hotel-workbook.py");
let done = 0;
let errors = 0;

for (const job of jobs) {
  const destCode = job.code;
  for (const hotel of job.hotels) {
    const hotelCode = String(hotel.hotelCode);
    const hotelDir = path.join(productsRoot, destCode, hotelCode);
    const doneMark = path.join(hotelDir, "product.json");
    try {
      await fs.access(doneMark);
      // already has product — skip unless force
      if (args.force !== "true") continue;
    } catch {
      /* need create */
    }

    const gate = await guardDisk(pipe, { writeCounter });
    if (!gate.allow) {
      cp.phase = "paused";
      cp.lastPauseReason = gate.reason;
      cp.currentDestinationCode = destCode;
      cp.currentHotelCode = hotelCode;
      await saveCheckpoint(cpFile, cp);
      await appendProgress(progressFile, {
        event: "pause",
        phase: "product",
        reason: gate.reason,
        dest: destCode,
        hotel: hotelCode,
      });
      console.error(JSON.stringify({ ok: false, paused: true, reason: gate.reason }));
      process.exit(3);
    }

    await fs.mkdir(path.join(hotelDir, "images"), { recursive: true });

    // Optional content API probe (slow; most paths currently 404)
    let detail = null;
    if (probeContent) {
      detail = await page.evaluate(
        async ({ hotelCode, helpers }) => {
          eval(helpers);
          const token = __hbxCleanToken();
          const paths = [
            `/client-content-api/1.0/hotels/${hotelCode}?locale=zh`,
            `/client-content-api/1.0/hotels/${hotelCode}?locale=en`,
            `/client-content-api/1.0/hotels/${hotelCode}/details?locale=zh`,
            `/client-btb-content-api/1.0/hotels/${hotelCode}?locale=zh`,
            `/client-content-api/1.0/hotels?codes=${hotelCode}&locale=zh`,
          ];
          const out = {};
          for (const p of paths) {
            const r = await __hbxXhrGet("https://webapi.gta-travel.cn" + p, token);
            out[p] = {
              status: r.status,
              keys: r.json && Object.keys(r.json).slice(0, 30),
              preview: (r.text || "").slice(0, 300),
            };
          }
          return out;
        },
        { hotelCode, helpers: injectXhrHelpers() },
      );
    }

    const product = {
      ...hotel,
      hotelCode,
      destinationId: destCode,
      source: probeContent ? "phase2-list+content-probe" : "phase2-list",
      capturedAt: new Date().toISOString(),
      contentProbe: detail,
      imageCount: 0,
      imagePaths: [],
      notes:
        "详情/图片/日历价接口待探针命中后补全；当前以目的地清单字段为主（中英名、区县、目的地码）",
    };

    await fs.writeFile(path.join(hotelDir, "product.json"), `${JSON.stringify(product, null, 2)}\n`);
    await fs.writeFile(
      path.join(hotelDir, "calendar.json"),
      `${JSON.stringify({ rates: [], status: "pending_probe" }, null, 2)}\n`,
    );

    const xlsxOut = path.join(hotelDir, "product.xlsx");
    const py = spawnSync(
      "python3",
      [
        pyWriter,
        "--product",
        path.join(hotelDir, "product.json"),
        "--calendar",
        path.join(hotelDir, "calendar.json"),
        "--out",
        xlsxOut,
      ],
      { encoding: "utf8" },
    );
    if (py.status !== 0) {
      errors += 1;
      await appendProgress(progressFile, {
        event: "product_xlsx_error",
        hotel: hotelCode,
        err: py.stderr || py.stdout,
      });
    } else {
      done += 1;
      cp.stats.productsDone = (cp.stats.productsDone || 0) + 1;
      await appendProgress(progressFile, { event: "product_done", dest: destCode, hotel: hotelCode });
    }

    // local thin mirror
    const localHotel = resolveFromRoot("hotel-data", "02-hotel-products", destCode, hotelCode);
    await fs.mkdir(localHotel, { recursive: true });
    await fs.copyFile(path.join(hotelDir, "product.json"), path.join(localHotel, "product.json")).catch(() => {});
    await fs.copyFile(xlsxOut, path.join(localHotel, "product.xlsx")).catch(() => {});
  }

  if (cp.destinations?.[destCode]) {
    cp.destinations[destCode].productStatus = limit != null ? "partial" : "done";
  }
  await saveCheckpoint(cpFile, cp);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      phase: "product",
      done,
      errors,
      productsRoot,
      note: "Full detail/images after content API lock-in; xlsx sheet1 ready, calendar sheets empty until phase3",
    },
    null,
    2,
  ),
);
process.exit(errors ? 1 : 0);
