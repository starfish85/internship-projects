/**
 * §52 + §53 CDP session
 *
 * §52 viewport:
 * 1. Never set viewport smaller than 1440×900
 * 2. Connect existing Chrome: default DO NOT call setViewportSize
 * 3. If must set: only 1440×900 or 1512×982, once
 * 4. No zoom / no mobile emulation
 * 5. Before ops: if window.innerWidth < 1280 → throw
 * 6. Only one CDP script at a time
 *
 * §53 runtime:
 * 1. Kill residual listing scripts before ops (optional killPeers)
 * 2. Short steps + per-step verify (caller discipline)
 * 3. Explicit timeouts — setDefaultTimeout; no infinite waitFor
 * 4. Fail with exit≠0 (caller)
 * 5. Agent: >2 min no report → interrupt (process convention)
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

export const CDP_URL = 'http://127.0.0.1:9222';
export const ALLOWED_VIEWPORTS = Object.freeze([
  { width: 1440, height: 900 },
  { width: 1512, height: 982 },
]);
export const MIN_INNER_WIDTH = 1280;
export const MIN_VIEWPORT_WIDTH = 1440;
/** Default Playwright action timeout (ms) — §53 禁止无限 wait */
export const DEFAULT_ACTION_TIMEOUT_MS = 30_000;
/** Default navigation timeout (ms) */
export const DEFAULT_NAV_TIMEOUT_MS = 60_000;
/** Agent report gate (minutes) — §53 */
export const AGENT_REPORT_MAX_MINUTES = 2;

const PEER_GREP =
  'node .*(list-|fix-|pkx-|pek-|popmart|pearl|jinmao|tussauds|create-option|create-pearl|create-popmart|continue-|finish-|fill-|inspect-|audit-|save-include)';

/**
 * @param {object} [opts]
 * @param {string} [opts.cdpUrl]
 * @param {string} [opts.urlIncludes='triple.partners']
 * @param {boolean} [opts.forceViewport=false]
 * @param {{width:number,height:number}} [opts.viewport]
 * @param {boolean} [opts.skipPeerCheck=false]
 * @param {boolean} [opts.killPeers=false] — §53: kill residual before connect
 * @param {string} [opts.selfHint] — basename to spare when killing/warning
 * @param {number} [opts.actionTimeoutMs]
 * @param {number} [opts.navTimeoutMs]
 */
export async function connectNolPage(opts = {}) {
  const {
    cdpUrl = CDP_URL,
    urlIncludes = 'triple.partners',
    forceViewport = false,
    viewport = null,
    skipPeerCheck = false,
    killPeers = false,
    selfHint = '',
    actionTimeoutMs = DEFAULT_ACTION_TIMEOUT_MS,
    navTimeoutMs = DEFAULT_NAV_TIMEOUT_MS,
  } = opts;

  if (killPeers) {
    killPeerCdpScripts(selfHint);
  } else if (!skipPeerCheck) {
    warnIfPeerCdpScripts(selfHint);
  }

  const browser = await chromium.connectOverCDP(cdpUrl);
  const pages = browser.contexts().flatMap((c) => c.pages());
  const page =
    pages.find((p) => p.url().includes(urlIncludes)) ||
    pages.find((p) => /triple\.partners|nol/i.test(p.url())) ||
    null;
  if (!page) {
    throw new Error(`[§52] no NOL tab (url includes "${urlIncludes}") — open partner center first`);
  }
  await page.bringToFront().catch(() => {});

  // §53: explicit timeouts — never infinite default waits
  page.setDefaultTimeout(actionTimeoutMs);
  page.setDefaultNavigationTimeout(navTimeoutMs);
  console.log(`[§53] defaultTimeout=${actionTimeoutMs}ms navTimeout=${navTimeoutMs}ms`);

  // §52: default DO NOT setViewportSize
  if (forceViewport) {
    const vp = viewport || ALLOWED_VIEWPORTS[0];
    assertAllowedViewport(vp);
    await page.setViewportSize(vp);
    console.log(`[§52] setViewportSize once ${vp.width}×${vp.height}`);
  } else {
    console.log('[§52] setViewportSize skipped — using user Chrome window');
  }

  const geom = await assertInnerWidthOk(page);
  console.log(`[§52] innerWidth×innerHeight ${geom.w}×${geom.h}`);
  return { browser, page, geom };
}

export function assertAllowedViewport(vp) {
  if (!vp || typeof vp.width !== 'number' || typeof vp.height !== 'number') {
    throw new Error('[§52] invalid viewport');
  }
  if (vp.width < MIN_VIEWPORT_WIDTH) {
    throw new Error(
      `[§52] viewport width ${vp.width} < ${MIN_VIEWPORT_WIDTH} forbidden (narrow → miss clicks / hang)`,
    );
  }
  const ok = ALLOWED_VIEWPORTS.some((a) => a.width === vp.width && a.height === vp.height);
  if (!ok) {
    throw new Error(
      `[§52] viewport must be 1440×900 or 1512×982 (got ${vp.width}×${vp.height})`,
    );
  }
}

export async function assertInnerWidthOk(page) {
  const geom = await page.evaluate(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
    dpr: window.devicePixelRatio,
  }));
  if (geom.w < MIN_INNER_WIDTH) {
    throw new Error(
      `[§52] innerWidth ${geom.w} < ${MIN_INNER_WIDTH} — widen Chrome before clicking (narrow viewport → miss clicks / dead wait)`,
    );
  }
  return geom;
}

function listPeerLines(selfHint = '') {
  try {
    const out = execSync(
      `ps -ax -o pid=,command= 2>/dev/null | grep -E '${PEER_GREP}' | grep -v grep || true`,
      { encoding: 'utf8', timeout: 3000 },
    ).trim();
    if (!out) return [];
    return out
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => (selfHint ? !l.includes(selfHint) : true))
      .filter((l) => !l.includes('cdp-session')); // self unit tests etc.
  } catch {
    return [];
  }
}

/** Soft warn if other node listing scripts may race the same tab */
export function warnIfPeerCdpScripts(selfHint = '') {
  const lines = listPeerLines(selfHint);
  if (lines.length > 0) {
    console.warn(
      '[§53] WARN peer CDP scripts (run only one; prefer killPeers:true):\n' +
        lines.slice(0, 8).join('\n'),
    );
  }
}

/**
 * §53: kill residual listing automation node processes (not Chrome).
 * Spares current pid and optional selfHint basename.
 */
export function killPeerCdpScripts(selfHint = '') {
  const lines = listPeerLines(selfHint);
  const myPid = String(process.pid);
  let killed = 0;
  for (const line of lines) {
    const m = line.match(/^(\d+)\s+/);
    if (!m) continue;
    const pid = m[1];
    if (pid === myPid) continue;
    try {
      process.kill(Number(pid), 'SIGTERM');
      killed++;
      console.log(`[§53] killed residual pid=${pid}`);
    } catch (e) {
      console.warn(`[§53] kill ${pid} failed:`, e.message);
    }
  }
  if (killed === 0) console.log('[§53] no residual peer CDP scripts');
  else {
    // brief grace so ports/tabs settle
    try {
      execSync('sleep 0.4');
    } catch {
      /* ignore */
    }
  }
  return killed;
}

/** Norm UI price for compare: "1,017" → "1017" */
export function normPrice(p) {
  return String(p ?? '').replace(/[,\s]/g, '');
}

/**
 * Fail-fast helper for scripts: log + exit 2
 * @param {string} msg
 */
export function failExit(msg) {
  console.log('【失败】', msg);
  process.exit(2);
}
