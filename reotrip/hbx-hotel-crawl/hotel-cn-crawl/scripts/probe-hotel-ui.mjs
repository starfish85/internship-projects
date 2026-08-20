/**
 * Phase-0 exploration: after login, map hotel UI + capture hotel-related XHR APIs.
 * Goal: discover endpoints for CN hotel list / content / calendar rates before full crawl.
 *
 * Usage (recommended):
 *   npm run chrome:launch
 *   # complete login in debug Chrome if needed
 *   npm run probe:hotel-ui -- --destinationName=北京 --waitUserMs=120000
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  acceptCookies,
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
const config = await loadConfig();
const destinationName = args.destinationName ?? "北京";
const countryName = args.countryName ?? "中国";
const waitUserMs = Number(args.waitUserMs ?? 90000);
const headless = args.headless === "true";
const runId = stamp("probe-hotel-ui");

const localDirs = {
  data: resolveFromRoot("data"),
  shots: resolveFromRoot("artifacts/screenshots"),
  logs: resolveFromRoot("artifacts/logs"),
};
const externalProbe = path.join(config.storage.externalRoot, "probe");
await ensureDirs([...Object.values(localDirs), externalProbe]);

function isInterestingApi(url) {
  const u = url.toLowerCase();
  if (!(u.includes("gta-travel") || u.includes("bedsonline") || u.includes("hotelbeds"))) {
    return false;
  }
  if (/\.(js|css|png|jpg|svg|woff2?|ico)(\?|$)/i.test(u)) return false;
  return (
    u.includes("hotel") ||
    u.includes("avail") ||
    u.includes("content") ||
    u.includes("destina") ||
    u.includes("catalog") ||
    u.includes("search") ||
    u.includes("calendar") ||
    u.includes("rate") ||
    u.includes("product") ||
    u.includes("locale") ||
    u.includes("client-btb") ||
    u.includes("webapi") ||
    u.includes("booking")
  );
}

async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector);
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      return selector;
    }
  }
  return null;
}

async function selectDropdownValue(page, inputSelector, value, log) {
  const input = page.locator(inputSelector);
  await input.waitFor({ state: "visible", timeout: 30000 });
  await input.click();
  await input.fill("");
  await input.fill(value);
  await page.waitForTimeout(2500);
  const option = page.getByText(value, { exact: true }).last();
  if (await option.isVisible().catch(() => false)) {
    await option.click();
    log.push(`dropdown ${inputSelector} => ${value}`);
  } else {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    log.push(`dropdown ${inputSelector} => ${value} (keyboard)`);
  }
  await page.waitForTimeout(1000);
}

const apiCalls = [];
const apiBodies = [];
const processLog = [];

const session = await connectChrome({ headless, preferCdp: true });
const page = session.page;

page.on("request", (request) => {
  const url = request.url();
  if (!isInterestingApi(url)) return;
  const type = request.resourceType();
  if (type !== "xhr" && type !== "fetch" && type !== "other") return;
  apiCalls.push({
    phase: "request",
    url,
    method: request.method(),
    resourceType: type,
    postData: request.postData()?.slice(0, 6000) ?? null,
    at: new Date().toISOString(),
  });
});

page.on("response", async (response) => {
  const url = response.url();
  if (!isInterestingApi(url)) return;
  const type = response.request().resourceType();
  if (type !== "xhr" && type !== "fetch" && type !== "other") return;
  const entry = {
    phase: "response",
    url,
    status: response.status(),
    method: response.request().method(),
    at: new Date().toISOString(),
    contentType: response.headers()["content-type"] ?? "",
    bodyPreview: null,
  };
  try {
    const ct = entry.contentType;
    if (ct.includes("json") || url.includes("api")) {
      const text = await response.text();
      entry.bodyPreview = text.slice(0, 12000);
      try {
        entry.bodyJson = JSON.parse(text);
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    entry.bodyPreview = `read_error: ${err.message}`;
  }
  apiBodies.push(entry);
});

const summary = {
  runId,
  startedAt: new Date().toISOString(),
  mode: session.mode,
  countryName,
  destinationName,
  ok: false,
  darwinTokenPresent: false,
  hotelButtonFound: false,
  searchAttempted: false,
  uniqueApiPaths: [],
  hotelRelatedPaths: [],
  uiHints: {},
  processLog,
  errors: [],
};

try {
  const login = await ensureLoggedIn(page, {
    waitUserMs,
    username: process.env.BEDSONLINE_USERNAME,
    password: process.env.BEDSONLINE_PASSWORD,
  });
  processLog.push(...(login.log || []));
  summary.darwinTokenPresent = Boolean(login.ok);
  if (!login.ok) {
    throw new Error(`Login failed: ${login.error || "unknown"} url=${login.info?.url}`);
  }

  await page.goto(config.site.mainUrl, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(5000);
  await acceptCookies(page);

  summary.uiHints.productButtons = await page.evaluate(() => {
    return [...document.querySelectorAll("button, [role=tab], a")]
      .map((el) => ({
        text: (el.innerText || el.textContent || "").trim().slice(0, 80),
        qa: el.getAttribute("data-qa") || "",
        id: el.id || "",
      }))
      .filter((b) => b.text || b.qa)
      .slice(0, 150);
  });

  const hotelSelectors = [
    'button[data-qa="HOTEL"]',
    'button[data-qa="hotel"]',
    'button[data-qa="HOTELS"]',
    '[data-qa="product-type-HOTEL"]',
    'button:has-text("酒店")',
    'button:has-text("Hotel")',
    '[role=tab]:has-text("酒店")',
    '[role=tab]:has-text("Hotel")',
  ];
  const hotelClicked = await clickFirstVisible(page, hotelSelectors);
  summary.hotelButtonFound = Boolean(hotelClicked);
  processLog.push(hotelClicked ? `hotel tab: ${hotelClicked}` : "hotel tab: not found");
  await page.waitForTimeout(4000);

  await page.screenshot({
    path: path.join(localDirs.shots, `${runId}-main.png`),
    fullPage: true,
  });

  summary.uiHints.formFields = await page.evaluate(() => {
    return [...document.querySelectorAll("input, select, button, [data-qa]")]
      .map((el) => ({
        tag: el.tagName,
        type: el.getAttribute("type") || "",
        qa: el.getAttribute("data-qa") || "",
        name: el.getAttribute("name") || "",
        placeholder: el.getAttribute("placeholder") || "",
        text: (el.innerText || "").trim().slice(0, 60),
      }))
      .filter(
        (n) =>
          n.qa ||
          n.placeholder ||
          /search|hotel|dest|country|date|check|入住/i.test(JSON.stringify(n)),
      )
      .slice(0, 250);
  });

  const countryInput = page.locator('input[data-qa="countries-dropDown"]');
  const destInput = page.locator('input[data-qa="destination-dropDown"]');
  const hasCountry = await countryInput.isVisible().catch(() => false);
  const hasDest = await destInput.isVisible().catch(() => false);

  if (hasCountry && hasDest) {
    summary.searchAttempted = true;
    await selectDropdownValue(page, 'input[data-qa="countries-dropDown"]', countryName, processLog);
    await selectDropdownValue(page, 'input[data-qa="destination-dropDown"]', destinationName, processLog);

    // Check-in / nights if present
    for (const sel of [
      'input[data-qa="check-in"]',
      'input[data-qa="checkIn"]',
      'input[data-qa="date-from"]',
      'input[placeholder*="入住"]',
      'input[placeholder*="Check-in"]',
    ]) {
      if (await page.locator(sel).isVisible().catch(() => false)) {
        processLog.push(`date field: ${sel}`);
      }
    }

    const searchClicked = await clickFirstVisible(page, [
      'button[data-qa="btn_search_hotels"]',
      'button[data-qa="btn_search_hotel"]',
      'button[data-qa="btn_search"]',
      'button:has-text("搜索")',
      'button:has-text("Search")',
    ]);
    processLog.push(searchClicked ? `search: ${searchClicked}` : "search button not found");
    if (searchClicked) {
      await page.waitForTimeout(18000);
      await page.screenshot({
        path: path.join(localDirs.shots, `${runId}-search.png`),
        fullPage: true,
      });
    }
  } else {
    processLog.push(`dropdowns missing country=${hasCountry} dest=${hasDest}`);
  }

  // Try common SPA hotel routes
  for (const route of [
    "/hotel/search",
    "/hotels/search",
    "/main/hotel",
    "/booking/hotel",
  ]) {
    try {
      await page.goto(`${config.site.baseUrl}${route}?mkt=CN`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2500);
      processLog.push(`route try ${route} => ${page.url()}`);
    } catch (err) {
      processLog.push(`route fail ${route}: ${err.message}`);
    }
  }

  const paths = [
    ...new Set(
      [...apiCalls, ...apiBodies].map((x) => {
        try {
          const u = new URL(x.url);
          return u.pathname;
        } catch {
          return x.url;
        }
      }),
    ),
  ].sort();
  summary.uniqueApiPaths = paths;
  summary.hotelRelatedPaths = paths.filter((p) => /hotel|avail|content|calendar|rate|dest/i.test(p));
  summary.session = await getSessionInfo(page);
  summary.ok = summary.darwinTokenPresent;
  summary.finalUrl = page.url();
} catch (err) {
  summary.errors.push(String(err));
  summary.finalUrl = page.url();
  await page.screenshot({
    path: path.join(localDirs.shots, `${runId}-error.png`),
    fullPage: true,
  }).catch(() => {});
} finally {
  summary.finishedAt = new Date().toISOString();
  summary.interestingApiCount = apiBodies.length;

  const payload = {
    summary,
    apiCalls: apiCalls.slice(0, 500),
    apiBodies: apiBodies.map((b) => ({
      ...b,
      // keep preview only in summary dump to control size
      bodyJson: b.bodyJson
        ? Array.isArray(b.bodyJson)
          ? { _type: "array", length: b.bodyJson.length, sample: b.bodyJson.slice(0, 2) }
          : typeof b.bodyJson === "object"
            ? {
                _type: "object",
                keys: Object.keys(b.bodyJson).slice(0, 40),
                sample: JSON.stringify(b.bodyJson).slice(0, 2000),
              }
            : b.bodyJson
        : null,
    })),
  };

  await writeLocalAndExternal(
    path.join(localDirs.data, `${runId}.json`),
    path.join(externalProbe, `${runId}.json`),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  await writeLocalAndExternal(
    path.join(localDirs.data, `${runId}-summary.json`),
    path.join(externalProbe, `${runId}-summary.json`),
    `${JSON.stringify(summary, null, 2)}\n`,
  );

  if (session.mode === "launch") await session.close();
}

console.log(JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 2);
