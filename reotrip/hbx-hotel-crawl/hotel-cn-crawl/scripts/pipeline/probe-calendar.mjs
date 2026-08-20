/**
 * Calendar price probe: discover availability API paths for released inventory.
 *
 * Usage (after phase1, Chrome logged in):
 *   node scripts/pipeline/probe-calendar.mjs --dest=PEK
 *   node scripts/pipeline/probe-calendar.mjs --dest=PEK --hotelCode=100399
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { ensureSession, probeCalendarApis } from "../../lib/api-client.mjs";
import { appendProgress } from "../../lib/checkpoint.mjs";
import { loadPipelineConfig } from "../../lib/disk-guard.mjs";
import { loadConfig, resolveFromRoot, stamp } from "../../lib/paths.mjs";

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

const args = parseArgs(process.argv.slice(2));
const dest = args.dest || "PEK";
const siteConfig = await loadConfig();
const pipe = await loadPipelineConfig();
const dataRoot = pipe.dataRoot;
const runId = stamp("calendar-probe");

const browser = await chromium.connectOverCDP(
  `http://127.0.0.1:${siteConfig.chrome.remoteDebuggingPort}`,
  { timeout: 5000 },
).catch(() => null);
if (!browser) {
  console.error("CDP unavailable — npm run chrome:launch");
  process.exit(2);
}
const context = browser.contexts()[0];
const page =
  context.pages().find((p) => /gta-travel|bedsonline/.test(p.url())) ||
  context.pages()[0] ||
  (await context.newPage());

const session = await ensureSession(page, siteConfig.site);
if (!session.ok) {
  console.error(JSON.stringify({ ok: false, error: "login_failed" }));
  process.exit(2);
}

// pick sample hotel from list
let hotelCode = args.hotelCode || null;
const listsRoot = path.join(dataRoot, "01-destination-lists");
if (!hotelCode) {
  const dirs = await fs.readdir(listsRoot).catch(() => []);
  const match = dirs.find((d) => d.startsWith(`${dest}-`));
  if (match) {
    const raw = await fs.readFile(path.join(listsRoot, match, "hotel-list.jsonl"), "utf8");
    const first = raw.split("\n").find((l) => l.trim());
    if (first) hotelCode = JSON.parse(first).hotelCode;
  }
}
if (!hotelCode) hotelCode = "100399";

const checkIn = args.checkIn || ymd(new Date(Date.now() + 14 * 86400000));
const checkOut =
  args.checkOut || ymd(new Date(new Date(checkIn).getTime() + 1 * 86400000));

// also capture network while trying UI search briefly
const netHits = [];
page.on("response", async (res) => {
  const url = res.url();
  if (!/webapi\.gta-travel\.cn/.test(url)) return;
  if (!/avail|hotel|rate|calendar|price|booking/i.test(url)) return;
  const type = res.request().resourceType();
  if (type !== "xhr" && type !== "fetch") return;
  let preview = null;
  try {
    preview = (await res.text()).slice(0, 500);
  } catch {
    /* ignore */
  }
  netHits.push({
    url,
    status: res.status(),
    method: res.request().method(),
    post: res.request().postData()?.slice(0, 1000) || null,
    preview,
  });
});

const probe = await probeCalendarApis(page, {
  hotelCode,
  checkIn,
  checkOut,
  destCode: dest,
});

const outDir = path.join(dataRoot, "00-state", "probes");
await fs.mkdir(outDir, { recursive: true });
const localProbe = resolveFromRoot("hotel-data", "00-state", "probes");
await fs.mkdir(localProbe, { recursive: true });

const result = {
  runId,
  dest,
  hotelCode,
  checkIn,
  checkOut,
  probe,
  netHits: netHits.slice(0, 50),
  at: new Date().toISOString(),
  note: probe.ok
    ? "HIT — wire phase3 to this path/body"
    : "No 200 hit yet — need UI search intercept or alternate API",
};

const outFile = path.join(outDir, `${runId}.json`);
await fs.writeFile(outFile, `${JSON.stringify(result, null, 2)}\n`);
await fs.writeFile(path.join(localProbe, `${runId}.json`), `${JSON.stringify(result, null, 2)}\n`);
// latest pointer
await fs.writeFile(path.join(outDir, "calendar-probe-latest.json"), `${JSON.stringify(result, null, 2)}\n`);
await fs.writeFile(
  path.join(localProbe, "calendar-probe-latest.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

await appendProgress(path.join(dataRoot, "00-state", "progress.jsonl"), {
  event: "calendar_probe",
  ok: probe.ok,
  dest,
  hotelCode,
  hit: probe.hit || null,
});

console.log(
  JSON.stringify(
    {
      ok: probe.ok,
      outFile,
      hit: probe.hit || null,
      probeCount: probe.probes?.length,
      interesting: (probe.probes || []).filter((p) => p.status && p.status !== 404).slice(0, 15),
      netHits: netHits.length,
    },
    null,
    2,
  ),
);

process.exit(probe.ok ? 0 : 1);
