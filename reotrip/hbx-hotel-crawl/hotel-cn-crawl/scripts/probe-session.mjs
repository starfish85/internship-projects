/**
 * Probe: attach/launch Chrome, check Bedsonline login (darwinToken).
 *
 * Usage:
 *   npm run chrome:launch
 *   # login once in that window if needed
 *   BEDSONLINE_USERNAME=... BEDSONLINE_PASSWORD=... npm run probe:session
 *   npm run probe:session -- --waitUserMs=120000
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  connectChrome,
  ensureLoggedIn,
  getSessionInfo,
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
const waitUserMs = Number(args.waitUserMs ?? 90000);
const headless = args.headless === "true";

const config = await loadConfig();
const runId = stamp("probe-session");
const localLogDir = resolveFromRoot(config.storage.localLogs);
const externalProbe = path.join(config.storage.externalRoot, "probe");
await ensureDirs([localLogDir, externalProbe, resolveFromRoot("data")]);

const session = await connectChrome({ headless, preferCdp: true });
const result = {
  runId,
  startedAt: new Date().toISOString(),
  mode: session.mode,
  login: null,
  final: null,
  ok: false,
};

try {
  result.login = await ensureLoggedIn(session.page, {
    waitUserMs,
    username: process.env.BEDSONLINE_USERNAME,
    password: process.env.BEDSONLINE_PASSWORD,
  });
  result.final = await getSessionInfo(session.page);
  result.ok = Boolean(result.login?.ok && result.final?.hasDarwin);

  const shot = resolveFromRoot("artifacts/screenshots", `${runId}.png`);
  await fs.mkdir(path.dirname(shot), { recursive: true });
  await session.page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  result.screenshot = shot;
} catch (err) {
  result.error = String(err);
  result.stack = err?.stack;
} finally {
  result.finishedAt = new Date().toISOString();
  const json = `${JSON.stringify(result, null, 2)}\n`;
  await writeLocalAndExternal(
    resolveFromRoot("data", `${runId}.json`),
    path.join(externalProbe, `${runId}.json`),
    json,
  );
  if (session.mode === "launch") await session.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 2);
