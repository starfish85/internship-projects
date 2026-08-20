/**
 * Batch crawl skeleton for mainland China hotels.
 *
 * Design (scale ~410k, staged):
 *  1) Coverage / destination list for CN (cities / destination codes)
 *  2) Per destination: hotel search / content APIs (zh + en when available)
 *  3) Per hotel (or page of hotels): calendar / availability rates in windows
 *  4) Flush every N hotels or every city into external batches/
 *
 * This script is intentionally gated: it will only run a real batch when
 *   --confirm=true  AND login session is valid AND (optional) --destinationName is set.
 *
 * Usage (probe-scale first):
 *   npm run crawl:batch -- --destinationName=北京 --maxHotels=20 --confirm=true
 *
 * Full country is multi-day; use state/checkpoint on external disk.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  acceptCookies,
  connectChrome,
  ensureLoggedIn,
  parseArgs,
} from "../lib/chrome.mjs";
import {
  ensureDirs,
  loadConfig,
  resolveFromRoot,
  stamp,
  writeLocalAndExternal,
} from "../lib/paths.mjs";

const args = parseArgs();
const config = await loadConfig();
const confirm = args.confirm === "true";
const destinationName = args.destinationName ?? null;
const maxHotels = Number(args.maxHotels ?? 20);
const waitUserMs = Number(args.waitUserMs ?? 60000);
const headless = args.headless === "true";
const runId = stamp("crawl-batch");

const externalBatches = config.storage.externalBatches;
const externalState = config.storage.externalState;
const localData = resolveFromRoot("data");
const localLogs = resolveFromRoot("artifacts/logs");
await ensureDirs([externalBatches, externalState, localData, localLogs]);

const plan = {
  runId,
  startedAt: new Date().toISOString(),
  confirm,
  destinationName,
  maxHotels,
  strategy: {
    phases: [
      "login+token",
      "discover CN destinations",
      "search hotels per destination (paginated)",
      "fetch hotel content zh/en",
      "fetch calendar rates in rolling windows",
      "flush batch JSONL/JSON to external disk",
    ],
    matchingNotes: [
      "Primary key candidates: hotelCode / code / giata / supplier hotel id from API",
      "Match zh/en by hotelCode (not by name)",
      "Calendar attach by hotelCode + checkIn + nights + board/rateKey",
      "Checkpoint destinations and hotel offsets on external state/",
    ],
    batchLayout: {
      root: externalBatches,
      example: `${externalBatches}/CN/by-city/<destCode>/<runId>/hotels.jsonl`,
      calendar: `${externalBatches}/CN/by-city/<destCode>/<runId>/calendar.jsonl`,
      manifest: `${externalBatches}/CN/manifest.json`,
    },
    rateLimit: {
      requestDelayMs: config.crawl.requestDelayMs,
      batchSizeHotels: config.crawl.batchSizeHotels,
    },
    scaleHint: config.crawl.targetScaleHint,
  },
  status: "planned",
  extracted: [],
  errors: [],
};

if (!confirm) {
  plan.status = "dry-run";
  plan.message =
    "Pass --confirm=true to execute. Default is plan-only to avoid accidental full crawl of ~410k hotels.";
  const out = `${JSON.stringify(plan, null, 2)}\n`;
  await writeLocalAndExternal(
    path.join(localData, `${runId}-plan.json`),
    path.join(externalState, `${runId}-plan.json`),
    out,
  );
  console.log(out);
  process.exit(0);
}

if (!destinationName) {
  plan.status = "blocked";
  plan.errors.push("require --destinationName=... for first confirmed batches");
  console.log(JSON.stringify(plan, null, 2));
  process.exit(2);
}

const session = await connectChrome({ headless, preferCdp: true });
const page = session.page;
const apiHotelBodies = [];

page.on("response", async (response) => {
  const url = response.url();
  if (!/hotel|avail|content|catalog/i.test(url)) return;
  if (!/gta-travel|bedsonline|hotelbeds/i.test(url)) return;
  const type = response.request().resourceType();
  if (type !== "xhr" && type !== "fetch") return;
  try {
    const ct = response.headers()["content-type"] || "";
    if (!ct.includes("json") && !url.includes("api")) return;
    const json = await response.json();
    apiHotelBodies.push({
      url,
      status: response.status(),
      at: new Date().toISOString(),
      json,
    });
  } catch {
    /* ignore */
  }
});

try {
  const login = await ensureLoggedIn(page, {
    waitUserMs,
    username: process.env.BEDSONLINE_USERNAME,
    password: process.env.BEDSONLINE_PASSWORD,
  });
  if (!login.ok) throw new Error(`login failed: ${login.error}`);

  await page.goto(config.site.mainUrl, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(4000);
  await acceptCookies(page);

  // Minimal UI path: hotel tab + city search (API capture is primary deliverable)
  const hotelBtn = page.locator('button[data-qa="HOTEL"], button:has-text("酒店")').first();
  if (await hotelBtn.isVisible().catch(() => false)) {
    await hotelBtn.click();
    await page.waitForTimeout(3000);
  }

  const country = page.locator('input[data-qa="countries-dropDown"]');
  const dest = page.locator('input[data-qa="destination-dropDown"]');
  if ((await country.isVisible().catch(() => false)) && (await dest.isVisible().catch(() => false))) {
    await country.click();
    await country.fill("中国");
    await page.waitForTimeout(2000);
    await page.getByText("中国", { exact: true }).last().click().catch(async () => {
      await page.keyboard.press("Enter");
    });
    await page.waitForTimeout(1000);
    await dest.click();
    await dest.fill(destinationName);
    await page.waitForTimeout(2500);
    await page.getByText(destinationName, { exact: true }).last().click().catch(async () => {
      await page.keyboard.press("Enter");
    });
    const search = page
      .locator(
        'button[data-qa="btn_search_hotels"], button[data-qa="btn_search"], button:has-text("搜索")',
      )
      .first();
    if (await search.isVisible().catch(() => false)) {
      await search.click();
      await page.waitForTimeout(15000);
    }
  }

  // Normalize a light hotel list from captured JSON (structure unknown until probe succeeds)
  function walkCollectHotels(node, acc = [], depth = 0) {
    if (depth > 8 || acc.length >= maxHotels) return acc;
    if (!node || typeof node !== "object") return acc;
    if (Array.isArray(node)) {
      for (const item of node) walkCollectHotels(item, acc, depth + 1);
      return acc;
    }
    const code = node.hotelCode || node.code || node.hotelId || node.id;
    const name = node.name || node.hotelName || node.hotel?.name;
    if (code && name && String(name).length < 200) {
      acc.push({
        hotelCode: String(code),
        name: String(name),
        destination: node.destination || node.destinationName || destinationName,
        rawKeys: Object.keys(node).slice(0, 30),
      });
    }
    for (const v of Object.values(node)) {
      if (typeof v === "object") walkCollectHotels(v, acc, depth + 1);
    }
    return acc;
  }

  const hotels = [];
  for (const body of apiHotelBodies) {
    walkCollectHotels(body.json, hotels);
    if (hotels.length >= maxHotels) break;
  }
  // de-dupe
  const seen = new Set();
  for (const h of hotels) {
    if (seen.has(h.hotelCode)) continue;
    seen.add(h.hotelCode);
    plan.extracted.push(h);
    if (plan.extracted.length >= maxHotels) break;
  }

  const batchDir = path.join(
    externalBatches,
    "CN",
    "by-city",
    destinationName.replace(/[^\w\u4e00-\u9fff-]+/g, "_"),
    runId,
  );
  await ensureDirs([batchDir]);
  await fs.writeFile(
    path.join(batchDir, "hotels.jsonl"),
    plan.extracted.map((h) => JSON.stringify(h)).join("\n") + (plan.extracted.length ? "\n" : ""),
  );
  await fs.writeFile(
    path.join(batchDir, "api-capture.json"),
    `${JSON.stringify(
      apiHotelBodies.map((b) => ({
        url: b.url,
        status: b.status,
        at: b.at,
        preview: JSON.stringify(b.json).slice(0, 4000),
      })),
      null,
      2,
    )}\n`,
  );
  plan.batchDir = batchDir;
  plan.status = plan.extracted.length ? "partial-success" : "no-hotels-captured";
  plan.message =
    plan.extracted.length === 0
      ? "No hotel objects parsed from captured APIs yet. Run probe:hotel-ui after login to map real endpoints, then extend this crawler."
      : `Captured ${plan.extracted.length} hotel-like records (probe batch).`;
} catch (err) {
  plan.status = "error";
  plan.errors.push(String(err));
} finally {
  plan.finishedAt = new Date().toISOString();
  plan.apiCaptured = apiHotelBodies.length;
  const out = `${JSON.stringify(plan, null, 2)}\n`;
  await writeLocalAndExternal(
    path.join(localData, `${runId}.json`),
    path.join(externalState, `${runId}.json`),
    out,
  );
  if (session.mode === "launch") await session.close();
  console.log(out);
}

process.exit(plan.status === "error" || plan.status === "blocked" ? 2 : 0);
