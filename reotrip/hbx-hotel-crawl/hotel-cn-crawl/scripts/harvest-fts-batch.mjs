/**
 * Harvest hotels via FTS API (XHR in browser context).
 *
 * Requires Chrome CDP on port 9222 (npm run chrome:launch) and logged-in session.
 *
 * Usage:
 *   node scripts/harvest-fts-batch.mjs --query=北京 --queryEn=Beijing --destCode=PEK --size=100
 *   node scripts/harvest-fts-batch.mjs --query=中国 --type=DESTINATION --size=100
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { loadConfig, resolveFromRoot, stamp, writeLocalAndExternal } from "../lib/paths.mjs";

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    const m = item.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const config = await loadConfig();
const query = args.query ?? "北京";
const queryEn = args.queryEn ?? "Beijing";
const type = args.type ?? "HOTEL"; // HOTEL | DESTINATION
const size = Number(args.size ?? 100);
const destCode = args.destCode ?? "PEK";
const port = Number(args.port ?? config.chrome.remoteDebuggingPort);
const runId = stamp(`fts-${type.toLowerCase()}`);

const cdpUrl = `http://127.0.0.1:${port}`;
const browser = await chromium.connectOverCDP(cdpUrl);
const context = browser.contexts()[0];
if (!context) throw new Error("No browser context on CDP — run npm run chrome:launch and login");
const page =
  context.pages().find((p) => p.url().includes("bedsonline") || p.url().includes("gta-travel")) ||
  context.pages()[0] ||
  (await context.newPage());

if (!page.url().includes("gta-travel")) {
  await page.goto(config.site.mainUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(3000);
}

const harvest = await page.evaluate(
  async ({ query, queryEn, type, size }) => {
    function xhrGet(url, token) {
      return new Promise((resolve) => {
        const x = new XMLHttpRequest();
        x.open("GET", url, true);
        x.setRequestHeader("Accept", "application/json");
        if (token) x.setRequestHeader("Authorization", `Bearer ${token}`);
        x.timeout = 90000;
        x.onload = () => {
          let json = null;
          try {
            json = JSON.parse(x.responseText);
          } catch {
            /* ignore */
          }
          resolve({ status: x.status, json, len: x.responseText.length });
        };
        x.onerror = () => resolve({ status: 0, error: "network" });
        x.ontimeout = () => resolve({ status: 0, error: "timeout" });
        x.send();
      });
    }

    let token = localStorage.getItem("darwinToken") || "";
    token = token.replace(/^"+|"+$/g, "");
    if (!token) return { ok: false, error: "no_darwin_token" };

    const base = "https://webapi.gta-travel.cn/client-content-api/1.0/fts";
    const zh = await xhrGet(
      `${base}?query=${encodeURIComponent(query)}&size=${size}&type=${type}&locale=zh`,
      token,
    );
    const en =
      type === "HOTEL"
        ? await xhrGet(
            `${base}?query=${encodeURIComponent(queryEn)}&size=${size}&type=${type}&locale=en`,
            token,
          )
        : { status: 0, json: null };

    return {
      ok: true,
      tokenLen: token.length,
      zhStatus: zh.status,
      enStatus: en.status,
      hotelsZh: zh.json?.hotels || [],
      hotelsEn: en.json?.hotels || [],
      destinations: zh.json?.destinations || [],
      zones: zh.json?.zones || [],
    };
  },
  { query, queryEn, type, size },
);

if (!harvest.ok) {
  console.error(JSON.stringify(harvest, null, 2));
  process.exit(2);
}

const enMap = new Map((harvest.hotelsEn || []).map((h) => [String(h.id), h]));
const hotels = (harvest.hotelsZh || []).map((h) => ({
  hotelCode: String(h.id),
  nameZh: h.hotelDescription || null,
  nameEn: enMap.get(String(h.id))?.hotelDescription || null,
  countryId: h.countryId || null,
  countryZh: h.countryDescription || null,
  destinationId: h.destinationId || null,
  destinationZh: h.destinationDescription || null,
  zoneId: h.zoneId || null,
  zoneZh: h.zoneDescription || null,
  weight: h.weight ?? null,
  capturedAt: new Date().toISOString(),
  source: "fts",
  query,
}));

const batchDir = path.join(
  config.storage.externalBatches,
  "CN",
  "by-city",
  destCode,
  runId,
);
await fs.mkdir(batchDir, { recursive: true });

if (type === "HOTEL") {
  await fs.writeFile(
    path.join(batchDir, "hotels.jsonl"),
    hotels.map((h) => JSON.stringify(h)).join("\n") + (hotels.length ? "\n" : ""),
  );
} else {
  await fs.writeFile(
    path.join(batchDir, "destinations.json"),
    `${JSON.stringify(harvest.destinations || [], null, 2)}\n`,
  );
}

const meta = {
  runId,
  type,
  query,
  queryEn,
  destCode,
  size,
  counts: {
    hotels: hotels.length,
    hotelsEn: (harvest.hotelsEn || []).length,
    destinations: (harvest.destinations || []).length,
  },
  statuses: { zh: harvest.zhStatus, en: harvest.enStatus },
  batchDir,
  at: new Date().toISOString(),
};
await fs.writeFile(path.join(batchDir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);

await writeLocalAndExternal(
  resolveFromRoot("data", `${runId}-meta.json`),
  path.join(config.storage.externalRoot, "probe", `${runId}-meta.json`),
  `${JSON.stringify(meta, null, 2)}\n`,
);

console.log(JSON.stringify({ ...meta, sample: hotels.slice(0, 5) }, null, 2));
// do not close user's chrome
