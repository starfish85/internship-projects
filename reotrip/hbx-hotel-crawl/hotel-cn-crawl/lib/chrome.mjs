/**
 * Connect to / launch Google Chrome for Bedsonline automation.
 *
 * Preferred order:
 * 1) Attach to existing CDP (port from config, default 9222)
 * 2) Launch persistent Chrome channel with project user-data-dir
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { PROJECT_ROOT, loadConfig, resolveFromRoot } from "./paths.mjs";

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const item of argv) {
    const m = item.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (item.startsWith("--")) args[item.slice(2)] = true;
  }
  return args;
}

export async function connectChrome(options = {}) {
  const config = await loadConfig();
  const args = parseArgs();
  const port = Number(options.port ?? args.port ?? config.chrome.remoteDebuggingPort);
  const cdpUrl = options.cdpUrl ?? args.cdpUrl ?? `http://127.0.0.1:${port}`;
  const headless = String(options.headless ?? args.headless ?? "false") === "true";
  const preferCdp = String(options.preferCdp ?? args.preferCdp ?? "true") !== "false";

  if (preferCdp) {
    try {
      const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 3000 });
      const context = browser.contexts()[0] ?? (await browser.newContext());
      const page = context.pages()[0] ?? (await context.newPage());
      return {
        mode: "cdp",
        browser,
        context,
        page,
        close: async () => {
          // Do not close user's Chrome when attached via CDP
        },
      };
    } catch {
      // fall through to launch
    }
  }

  const profileDir =
    options.userDataDir ??
    resolveFromRoot(config.chrome.userDataDir);

  await fs.mkdir(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless,
    viewport: { width: 1440, height: 960 },
    locale: "zh-CN",
    args: [
      `--remote-debugging-port=${port}`,
      "--disable-blink-features=AutomationControlled",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  const page = context.pages()[0] ?? (await context.newPage());
  return {
    mode: "launch",
    browser: context.browser(),
    context,
    page,
    profileDir,
    close: async () => {
      await context.close().catch(() => {});
    },
  };
}

export async function getSessionInfo(page) {
  return page.evaluate(() => {
    let token = localStorage.getItem("darwinToken");
    if (token) token = token.replace(/^"+|"+$/g, "");
    return {
      url: location.href,
      title: document.title,
      hasDarwin: Boolean(token),
      darwinLen: token ? token.length : 0,
      market: localStorage.getItem("market"),
      keys: Object.keys(localStorage),
      bodySnippet: document.body ? document.body.innerText.slice(0, 800) : "",
    };
  });
}

/** Clean darwinToken from localStorage (may be stored with quotes). */
export async function getDarwinToken(page) {
  return page.evaluate(() => {
    let token = localStorage.getItem("darwinToken") || "";
    return token.replace(/^"+|"+$/g, "");
  });
}

export async function acceptCookies(page) {
  const selectors = [
    "#CybotCookiebotDialogBodyButtonDecline",
    "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
    'button:has-text("拒绝")',
    'button:has-text("全部允许")',
    'button:has-text("Deny")',
    'button:has-text("Allow all")',
  ];
  for (const selector of selectors) {
    const loc = page.locator(selector);
    if (await loc.isVisible().catch(() => false)) {
      await loc.click().catch(() => {});
      await page.waitForTimeout(1500);
      return selector;
    }
  }
  return null;
}

/**
 * Ensure login. Uses env BEDSONLINE_USERNAME / BEDSONLINE_PASSWORD when needed.
 * Also tries Chrome saved password by focusing fields (may require user click once).
 */
export async function ensureLoggedIn(page, { username, password, waitUserMs = 0 } = {}) {
  const config = await loadConfig();
  const log = [];

  await page.goto(config.site.mainUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(4000);
  await acceptCookies(page);

  let info = await getSessionInfo(page);
  if (info.hasDarwin) {
    log.push("session: existing darwinToken on main");
    return { ok: true, info, log };
  }

  await page.goto(config.site.loginUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(4000);
  await acceptCookies(page);

  info = await getSessionInfo(page);
  if (info.hasDarwin) {
    log.push("session: token after login redirect");
    return { ok: true, info, log };
  }

  const userField = page.locator("#username");
  const ready = await userField.waitFor({ state: "visible", timeout: 60000 }).then(() => true).catch(() => false);
  if (!ready) {
    info = await getSessionInfo(page);
    if (info.hasDarwin) return { ok: true, info, log: [...log, "session: token without form"] };
    return { ok: false, info, log: [...log, "login form not visible"], error: "login_form_missing" };
  }

  const u = username ?? process.env.BEDSONLINE_USERNAME ?? "";
  const p = password ?? process.env.BEDSONLINE_PASSWORD ?? "";

  if (u) {
    await userField.click({ clickCount: 3 });
    await userField.fill(u);
    log.push(`filled username (${u.length} chars)`);
  } else {
    await userField.click();
    log.push("focused username (await Chrome autofill / user)");
  }

  const passField = page.locator("#password");
  await passField.click();
  if (p) {
    await passField.fill(p);
    log.push(`filled password (len=${p.length})`);
  } else {
    log.push("focused password (await Chrome saved password / user)");
  }

  if (waitUserMs > 0 && (!u || !p)) {
    log.push(`waiting user login up to ${waitUserMs}ms`);
    const deadline = Date.now() + waitUserMs;
    while (Date.now() < deadline) {
      info = await getSessionInfo(page);
      if (info.hasDarwin) return { ok: true, info, log: [...log, "session: user completed login"] };
      if (!page.url().includes("/auth/login")) {
        info = await getSessionInfo(page);
        if (info.hasDarwin) return { ok: true, info, log };
      }
      await page.waitForTimeout(2000);
    }
  }

  if (u && p) {
    await Promise.all([
      page.waitForLoadState("networkidle", { timeout: 120000 }).catch(() => null),
      page.locator('button[data-qa="login-button"]').click(),
    ]);
    await page.waitForTimeout(8000);
  }

  info = await getSessionInfo(page);
  if (info.hasDarwin) {
    log.push("session: login ok");
    return { ok: true, info, log };
  }

  // Still on login: give optional extra wait for Chrome password manager
  if (waitUserMs > 0) {
    log.push("login not confirmed; extra user wait");
    const deadline = Date.now() + Math.min(waitUserMs, 120000);
    while (Date.now() < deadline) {
      info = await getSessionInfo(page);
      if (info.hasDarwin) return { ok: true, info, log: [...log, "session: late token"] };
      await page.waitForTimeout(2000);
    }
  }

  return {
    ok: false,
    info,
    log,
    error: "no_darwin_token",
  };
}

export { PROJECT_ROOT };
