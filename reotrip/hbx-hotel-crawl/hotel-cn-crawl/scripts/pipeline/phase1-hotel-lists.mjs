/**
 * Phase 1: Pull hotel lists per destination into region folders.
 * Strategy (gentle-xhr): pure XHR FTS only — no SPA UI thrashing.
 * Default: large ftsSize + multi-keyword union + merge existing lists.
 *
 * Usage:
 *   node scripts/pipeline/phase1-hotel-lists.mjs
 *   node scripts/pipeline/phase1-hotel-lists.mjs --only=PEK,PVG
 *   node scripts/pipeline/phase1-hotel-lists.mjs --tier=1
 *   node scripts/pipeline/phase1-hotel-lists.mjs --includeRest=true
 *   node scripts/pipeline/phase1-hotel-lists.mjs --only=PEK,PVG,CN1,SZX --force=true
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import {
  ensureSession,
  fetchCnDestinations,
  ftsHotels,
  mergeHotelRecords,
} from "../../lib/api-client.mjs";
import { appendProgress, loadCheckpoint, saveCheckpoint } from "../../lib/checkpoint.mjs";
import { guardDisk, loadPipelineConfig } from "../../lib/disk-guard.mjs";
import { loadConfig, resolveFromRoot } from "../../lib/paths.mjs";

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    const m = item.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (item.startsWith("--")) args[item.slice(2)] = true;
  }
  return args;
}

function slugDest(code, nameZh) {
  const safe = String(nameZh || code)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "")
    .slice(0, 40);
  return `${code}-${safe}`;
}

function escCsv(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

const args = parseArgs(process.argv.slice(2));
const siteConfig = await loadConfig();
const pipe = await loadPipelineConfig();
const dataRoot = pipe.dataRoot;
const only = args.only ? String(args.only).split(",").map((s) => s.trim()).filter(Boolean) : null;
const tierOnly = args.tier ? Number(args.tier) : null;
const includeRest = args.includeRest === "true" || args.includeRest === true;
const force = args.force === "true" || args.force === true;
const brandQueriesZh = pipe.phases?.list?.brandQueriesZh || [];
const destPauseMs = pipe.phases?.list?.destPauseMs ?? 2500;
const mergeExisting = pipe.phases?.list?.mergeExisting !== false;

const paths = {
  lists: path.join(dataRoot, "01-destination-lists"),
  state: path.join(dataRoot, "00-state"),
  localState: resolveFromRoot("hotel-data", "00-state"),
};
await fs.mkdir(paths.lists, { recursive: true });
await fs.mkdir(paths.state, { recursive: true });
await fs.mkdir(paths.localState, { recursive: true });

const cpFile = path.join(paths.state, "checkpoint.json");
const progressFile = path.join(paths.state, "progress.jsonl");
const localCp = path.join(paths.localState, "checkpoint.json");

let cp = await loadCheckpoint(cpFile);
cp.phase = "list";
await saveCheckpoint(cpFile, cp);
await saveCheckpoint(localCp, cp);

const writeCounter = { n: 0 };
const gate0 = await guardDisk(pipe, { forceCheck: true, writeCounter });
if (!gate0.allow) {
  cp = markPaused(cp, gate0.reason);
  await saveCheckpoint(cpFile, cp);
  await appendProgress(progressFile, { event: "pause", phase: "list", reason: gate0.reason });
  console.error(JSON.stringify({ ok: false, paused: true, reason: gate0.reason }, null, 2));
  process.exit(3);
}

// Chrome
const port = siteConfig.chrome.remoteDebuggingPort;
let browser;
try {
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 5000 });
} catch {
  console.error("CDP not available. Run: npm run chrome:launch  then login if needed.");
  process.exit(2);
}
const context = browser.contexts()[0];
// Dedicated worker tab — avoid thrashing the main SPA tab / concurrent enrich pages
const page = await context.newPage();

const session = await ensureSession(page, siteConfig.site);
if (!session.ok) {
  await appendProgress(progressFile, { event: "login_failed", phase: "list" });
  console.error(JSON.stringify({ ok: false, error: "login_failed", hint: "Use Chrome saved password on debug profile" }, null, 2));
  process.exit(2);
}
await appendProgress(progressFile, {
  event: "login_ok",
  via: session.via,
  mode: "gentle-xhr",
  force,
  ftsSize: pipe.phases?.list?.ftsSize ?? 2000,
});
console.log(
  `[list] mode=gentle-xhr force=${force} ftsSize=${pipe.phases?.list?.ftsSize ?? 2000} delayMs=${pipe.phases?.list?.requestDelayMs ?? 1200}`,
);

// Build destination queue
const priority = pipe.priorityDestinations || [];
let queue = [...priority];

async function loadDestPairs() {
  // 1) live API
  try {
    const all = await fetchCnDestinations(page, "zh");
    const en = await fetchCnDestinations(page, "en");
    if (Array.isArray(all.destinations) && all.destinations.length > 0) {
      const enMap = new Map((en.destinations || []).map((d) => [d.code, d.name]));
      return {
        source: "api",
        pairs: all.destinations.map((d) => ({
          code: d.code,
          nameZh: d.name || null,
          nameEn: enMap.get(d.code) || null,
        })),
      };
    }
  } catch (e) {
    console.warn(`[list] live destinations API failed: ${e.message || e}`);
  }

  // 2) fallback files from earlier probes
  const candidates = [
    path.join(paths.state, "cn-destinations-full.json"),
    path.join(pipe.dataRoot, "..", "state", "cn-destinations.json"),
    "/Volumes/CodexArchive/hbx-hotel-crawl/state/cn-destinations.json",
    resolveFromRoot("hotel-data", "00-state", "cn-destinations.json"),
  ];
  for (const f of candidates) {
    try {
      const raw = JSON.parse(await fs.readFile(f, "utf8"));
      let list = raw.destinations || raw;
      // full queue dump may already include tier fields
      if (Array.isArray(list) && list.length && list[0].code && (list[0].nameZh || list[0].name)) {
        const pairs = list.map((d) => ({
          code: d.code,
          nameZh: d.nameZh || d.name || null,
          nameEn: d.nameEn || null,
        }));
        // de-dupe by code
        const map = new Map(pairs.map((p) => [p.code, p]));
        return { source: f, pairs: [...map.values()] };
      }
    } catch {
      /* try next */
    }
  }
  return { source: "none", pairs: [] };
}

if (includeRest) {
  const loaded = await loadDestPairs();
  console.log(
    `[list] destinations source=${loaded.source} count=${loaded.pairs.length}`,
  );
  await appendProgress(progressFile, {
    event: "dest_source",
    source: loaded.source,
    count: loaded.pairs.length,
  });
  const priCodes = new Set(priority.map((d) => d.code));
  const rest = loaded.pairs
    .filter((d) => d.code && !priCodes.has(d.code))
    .map((d) => {
      const nameZh = d.nameZh || d.nameEn || d.code;
      const nameEn = d.nameEn || null;
      // FTS queries: full name + short city token before " - "
      const shortZh = String(nameZh).split(/\s*-\s*/)[0].trim();
      const shortEn = nameEn ? String(nameEn).split(/\s*-\s*/)[0].trim() : null;
      const ftsQueriesZh = [...new Set([nameZh, shortZh].filter(Boolean))];
      const ftsQueriesEn = [...new Set([nameEn, shortEn].filter(Boolean))];
      return {
        code: d.code,
        nameZh,
        nameEn,
        tier: 2,
        ftsQueriesZh,
        ftsQueriesEn,
      };
    });
  rest.sort((a, b) => a.code.localeCompare(b.code));
  queue = queue.concat(rest);
  await fs.writeFile(
    path.join(paths.state, "cn-destinations-full.json"),
    `${JSON.stringify(
      {
        count: queue.length,
        source: loaded.source,
        at: new Date().toISOString(),
        destinations: queue,
      },
      null,
      2,
    )}\n`,
  );
}

if (only) queue = queue.filter((d) => only.includes(d.code));
if (tierOnly) queue = queue.filter((d) => (d.tier || 2) === tierOnly);

console.log(
  `[list] queue size=${queue.length} (done already will skip) includeRest=${includeRest}`,
);

const delay = pipe.phases?.list?.requestDelayMs ?? 400;
const ftsSize = pipe.phases?.list?.ftsSize ?? 100;
const results = [];

for (const dest of queue) {
  const code = dest.code;
  // skip completed unless force re-list
  if (!force && cp.destinations?.[code]?.listStatus === "done") {
    results.push({ code, skipped: true, hotelCount: cp.destinations[code].hotelCount });
    continue;
  }

  const gate = await guardDisk(pipe, { writeCounter });
  if (!gate.allow) {
    cp = markPaused(cp, gate.reason, { currentDestinationCode: code });
    await saveCheckpoint(cpFile, cp);
    await saveCheckpoint(localCp, cp);
    await appendProgress(progressFile, {
      event: "pause",
      phase: "list",
      reason: gate.reason,
      dest: code,
      temp: gate.monitor?.temp_c,
    });
    console.error(JSON.stringify({ ok: false, paused: true, reason: gate.reason, dest: code }, null, 2));
    process.exit(3);
  }

  cp.currentDestinationCode = code;
  cp.destinations[code] = {
    ...(cp.destinations[code] || {}),
    listStatus: "running",
    nameZh: dest.nameZh,
    nameEn: dest.nameEn,
    tier: dest.tier || 2,
  };
  await saveCheckpoint(cpFile, cp);

  const folderName = slugDest(code, dest.nameZh);
  const destDir = path.join(paths.lists, folderName);
  await fs.mkdir(destDir, { recursive: true });

  const zhAll = [];
  const enAll = [];
  const baseZh = dest.ftsQueriesZh?.length ? dest.ftsQueriesZh : [dest.nameZh || code, code].filter(Boolean);
  // short city name without province suffix helps FTS
  const shortZh = String(dest.nameZh || "")
    .replace(/\s*[-–].*$/, "")
    .replace(/市$/, "")
    .trim();
  // Brand fan-out only for tier1 / force re-list — keeps national crawl from thrashing FTS
  const extraBrands = dest.tier === 1 || force ? brandQueriesZh : [];
  const queriesZh = [
    ...new Set(
      [...baseZh, shortZh, shortZh ? `${shortZh}市` : null, code, ...extraBrands].filter(Boolean),
    ),
  ];
  const queriesEn = dest.ftsQueriesEn?.length
    ? dest.ftsQueriesEn
    : [dest.nameEn || code].filter(Boolean);

  try {
    for (const q of queriesZh) {
      const r = await ftsHotels(page, { query: q, locale: "zh", size: ftsSize });
      if (r.status && r.status !== 200) {
        console.warn(`[list] FTS zh q=${q} status=${r.status} — backoff`);
        await sleep(delay * 3);
      }
      if (r.hotels?.length) zhAll.push(...r.hotels);
      await sleep(delay);
    }
    for (const q of queriesEn) {
      const r = await ftsHotels(page, { query: q, locale: "en", size: ftsSize });
      if (r.status && r.status !== 200) {
        console.warn(`[list] FTS en q=${q} status=${r.status} — backoff`);
        await sleep(delay * 3);
      }
      if (r.hotels?.length) enAll.push(...r.hotels);
      await sleep(delay);
    }

    let hotels = mergeHotelRecords(zhAll, enAll, code);
    // if filter too strict empty, keep destination match soft
    if (!hotels.length) {
      hotels = mergeHotelRecords(zhAll, enAll, null).filter(
        (h) => h.destinationId === code || h.countryId === "CN",
      );
    }

    // Never shrink: merge previous list on force / re-run
    if (mergeExisting) {
      try {
        const prevRaw = await fs.readFile(path.join(destDir, "hotel-list.jsonl"), "utf8");
        const prev = prevRaw
          .split("\n")
          .filter(Boolean)
          .map((l) => {
            try {
              return JSON.parse(l);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        if (prev.length) {
          const map = new Map(hotels.map((h) => [String(h.hotelCode), h]));
          for (const h of prev) {
            const id = String(h.hotelCode);
            if (!map.has(id)) map.set(id, h);
            else {
              const cur = map.get(id);
              map.set(id, {
                ...h,
                ...cur,
                nameZh: cur.nameZh || h.nameZh,
                nameEn: cur.nameEn || h.nameEn,
                zoneId: cur.zoneId || h.zoneId,
                zoneZh: cur.zoneZh || h.zoneZh,
                zoneEn: cur.zoneEn || h.zoneEn,
              });
            }
          }
          hotels = [...map.values()];
        }
      } catch {
        /* no previous list */
      }
    }

    const headers = [
      "hotelCode",
      "nameZh",
      "nameEn",
      "countryId",
      "destinationId",
      "destinationZh",
      "destinationEn",
      "zoneId",
      "zoneZh",
      "zoneEn",
      "weight",
    ];
    await fs.writeFile(
      path.join(destDir, "hotel-list.jsonl"),
      hotels.map((h) => JSON.stringify(h)).join("\n") + (hotels.length ? "\n" : ""),
    );
    await fs.writeFile(path.join(destDir, "hotel-list.json"), `${JSON.stringify(hotels, null, 2)}\n`);
    await fs.writeFile(
      path.join(destDir, "hotel-list.csv"),
      [headers.join(","), ...hotels.map((h) => headers.map((k) => escCsv(h[k])).join(","))].join("\n") +
        "\n",
    );

    const meta = {
      destination: dest,
      folder: folderName,
      hotelCount: hotels.length,
      queriesZh,
      queriesEn,
      ftsSize,
      requestDelayMs: delay,
      mode: "gentle-xhr",
      force,
      rawZhHits: zhAll.length,
      rawEnHits: enAll.length,
      at: new Date().toISOString(),
      phase: "list",
    };
    await fs.writeFile(path.join(destDir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);

    // seed per-hotel product dirs (empty scaffold)
    const productsRoot = path.join(dataRoot, "02-hotel-products", code);
    await fs.mkdir(productsRoot, { recursive: true });
    // only write index for list phase (avoid millions of empty dirs until product phase)
    await fs.writeFile(
      path.join(productsRoot, "_hotel-index.jsonl"),
      hotels.map((h) => JSON.stringify({ hotelCode: h.hotelCode, nameZh: h.nameZh, nameEn: h.nameEn })).join("\n") +
        (hotels.length ? "\n" : ""),
    );

    // local mirror of meta only
    const localDest = resolveFromRoot("hotel-data", "01-destination-lists", folderName);
    await fs.mkdir(localDest, { recursive: true });
    await fs.writeFile(path.join(localDest, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
    await fs.copyFile(path.join(destDir, "hotel-list.csv"), path.join(localDest, "hotel-list.csv"));

    cp.destinations[code] = {
      ...cp.destinations[code],
      listStatus: "done",
      hotelCount: hotels.length,
      folder: folderName,
      listPath: destDir,
      finishedAt: new Date().toISOString(),
    };
    cp.stats.destinationsListed = (cp.stats.destinationsListed || 0) + 1;
    cp.stats.hotelsListed = (cp.stats.hotelsListed || 0) + hotels.length;
    cp.lastPauseReason = null;
    await saveCheckpoint(cpFile, cp);
    await saveCheckpoint(localCp, cp);
    await appendProgress(progressFile, {
      event: "list_done",
      dest: code,
      hotelCount: hotels.length,
      folder: folderName,
    });

    results.push({ code, hotelCount: hotels.length, folder: destDir });
    console.log(`[list] ${code} ${dest.nameZh} → ${hotels.length} hotels → ${destDir}`);
    // pause between destinations to keep SPA/token healthy
    await sleep(destPauseMs);
  } catch (err) {
    cp.destinations[code] = {
      ...cp.destinations[code],
      listStatus: "error",
      error: String(err),
    };
    cp.lastError = String(err);
    await saveCheckpoint(cpFile, cp);
    await appendProgress(progressFile, { event: "list_error", dest: code, error: String(err) });
    results.push({ code, error: String(err) });
    console.error(`[list] ERROR ${code}:`, err);
    await sleep(delay * 4);
  }
}

try {
  await page.close();
} catch {
  /* ignore */
}

const newly = results.filter((r) => !r.skipped && !r.error).length;
const skipped = results.filter((r) => r.skipped).length;
const errored = results.filter((r) => r.error).length;

cp.phase = newly > 0 || skipped === results.length ? "list-done" : "list";
cp.currentDestinationCode = null;
await saveCheckpoint(cpFile, cp);
await saveCheckpoint(localCp, cp);
await appendProgress(progressFile, {
  event: "list_wave_done",
  queue: queue.length,
  newly,
  skipped,
  errored,
  hotelsListed: cp.stats?.hotelsListed,
});

const summary = {
  ok: true,
  phase: "list",
  dataRoot,
  queue: queue.length,
  newly,
  skipped,
  errored,
  results: results.slice(0, 30),
  resultsTail: results.slice(-10),
  checkpoint: cpFile,
  stats: cp.stats,
};
console.log(JSON.stringify(summary, null, 2));

// close CDP hang: exit hard (do not keep browser open)
process.exit(errored && newly === 0 ? 1 : 0);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function markPaused(cp, reason, extra = {}) {
  cp.phase = "paused";
  cp.lastPauseReason = reason;
  if (extra.currentDestinationCode) cp.currentDestinationCode = extra.currentDestinationCode;
  return cp;
}
