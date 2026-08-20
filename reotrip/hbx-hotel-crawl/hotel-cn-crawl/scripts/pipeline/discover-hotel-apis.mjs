/**
 * Deep discovery: SPA path scan + UI hotel search network capture + brute path probe.
 *
 * Usage:
 *   node scripts/pipeline/discover-hotel-apis.mjs --dest=PEK --destName=北京 --hotelCode=100399
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { ensureSession, injectXhrHelpers } from "../../lib/api-client.mjs";
import { loadPipelineConfig } from "../../lib/disk-guard.mjs";
import { loadConfig, resolveFromRoot, stamp } from "../../lib/paths.mjs";

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    const m = item.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (item.startsWith("--")) args[item.slice(2)] = true;
  }
  return args;
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

function isApi(url) {
  if (!/gta-travel|bedsonline|hotelbeds|hb-cdn|cloudfront/i.test(url)) return false;
  if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ico|map)(\?|$)/i.test(url)) return false;
  return true;
}

const args = parseArgs(process.argv.slice(2));
const dest = args.dest || "PEK";
const destName = args.destName || "北京";
const hotelCode = args.hotelCode || "100399";
const siteConfig = await loadConfig();
const pipe = await loadPipelineConfig();
const dataRoot = pipe.dataRoot;
const runId = stamp("api-discover");
const outDir = path.join(dataRoot, "00-state", "probes");
const localOut = resolveFromRoot("hotel-data", "00-state", "probes");
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(localOut, { recursive: true });

const browser = await chromium.connectOverCDP(
  `http://127.0.0.1:${siteConfig.chrome.remoteDebuggingPort}`,
  { timeout: 8000 },
).catch(() => null);
if (!browser) {
  console.error("CDP unavailable");
  process.exit(2);
}
const context = browser.contexts()[0];
const page =
  context.pages().find((p) => /gta-travel|bedsonline/.test(p.url())) ||
  context.pages()[0] ||
  (await context.newPage());

const net = [];
const pushNet = (entry) => {
  net.push({ ...entry, at: new Date().toISOString() });
};

page.on("request", (req) => {
  const url = req.url();
  if (!isApi(url)) return;
  const type = req.resourceType();
  if (!["xhr", "fetch", "other", "document"].includes(type)) return;
  pushNet({
    phase: "request",
    method: req.method(),
    url,
    type,
    postData: req.postData()?.slice(0, 4000) || null,
  });
});

page.on("response", async (res) => {
  const url = res.url();
  if (!isApi(url)) return;
  const type = res.request().resourceType();
  if (!["xhr", "fetch", "other"].includes(type)) return;
  let text = null;
  try {
    text = (await res.text()).slice(0, 1500);
  } catch {
    /* ignore */
  }
  pushNet({
    phase: "response",
    method: res.request().method(),
    url,
    status: res.status(),
    type,
    postData: res.request().postData()?.slice(0, 2000) || null,
    preview: text,
  });
});

const session = await ensureSession(page, siteConfig.site);
if (!session.ok) {
  console.error(JSON.stringify({ ok: false, error: "login_failed" }));
  process.exit(2);
}
console.log("[session]", session.via, "tokenLen=", session.token?.length);

// --- 1) SPA script path scan (all scripts + performance resources) ---
const spaScan = await page.evaluate(async () => {
  const scripts = [...document.querySelectorAll("script[src]")].map((s) => s.src);
  const perf = performance
    .getEntriesByType("resource")
    .map((r) => r.name)
    .filter((n) => /\.js(\?|$)/i.test(n));
  const urls = [...new Set([...scripts, ...perf])];
  const patterns = [
    /\/client-[a-z0-9\-]+\/[0-9.]+\/[a-z0-9\-_/{}]+/gi,
    /client-[a-z0-9\-]+-api\/[0-9.]+\/[a-z0-9\-_/{}]+/gi,
    /["'`](\/?(?:client|hotel|btb|booking|content|avail|search)[^"'`]{3,120})["'`]/gi,
  ];
  const hits = new Map();
  for (const u of urls.slice(0, 80)) {
    try {
      const t = await fetch(u).then((r) => r.text());
      for (const re of patterns) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(t))) {
          const p = m[1] || m[0];
          if (/client-|avail|hotel|content|image|calendar|rate|booking|search|product/i.test(p)) {
            hits.set(p, (hits.get(p) || 0) + 1);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  return {
    scriptCount: urls.length,
    sampleScripts: urls.slice(0, 20),
    hits: [...hits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 300),
  };
});
console.log("[spa] scripts=", spaScan.scriptCount, "hits=", spaScan.hits.length);

// --- 2) UI hotel search for destination ---
const uiLog = [];
async function tryUiSearch() {
  await page.goto(siteConfig.site.mainUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2500);

  // hotel product tab
  for (const sel of ['button[data-qa="HOTEL"]', 'button:has-text("酒店")', '[data-qa="HOTEL_radioButton_search"]']) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click().catch(() => {});
      uiLog.push(`clicked ${sel}`);
      break;
    }
  }
  await page.waitForTimeout(800);

  // destination control
  const destInput = page.locator('input[data-qa="destinationsControl"]').first();
  if (!(await destInput.isVisible().catch(() => false))) {
    uiLog.push("destinationsControl not visible");
    return { ok: false };
  }

  await destInput.click({ clickCount: 3 });
  await destInput.fill("");
  await destInput.type(destName, { delay: 80 });
  await page.waitForTimeout(2000);

  // try list item containing dest name
  const options = [
    page.locator(`[role="option"]:has-text("${destName}")`).first(),
    page.locator(`mat-option:has-text("${destName}")`).first(),
    page.locator(`.cdk-overlay-pane >> text=${destName}`).first(),
    page.getByRole("option", { name: new RegExp(destName) }).first(),
    page.locator(`text=/^${destName}/`).first(),
  ];
  let selected = false;
  for (const opt of options) {
    if (await opt.isVisible().catch(() => false)) {
      await opt.click({ force: true }).catch(() => {});
      selected = true;
      uiLog.push("selected option via locator");
      break;
    }
  }
  if (!selected) {
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    uiLog.push("selected via keyboard");
  }
  await page.waitForTimeout(800);
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(400);

  // set dates if needed
  const checkIn = ymd(new Date(Date.now() + 14 * 86400000)).replace(/-/g, "/");
  const checkOut = ymd(new Date(Date.now() + 15 * 86400000)).replace(/-/g, "/");
  const dateInputs = page.locator('input[placeholder="yyyy/mm/dd"]');
  const n = await dateInputs.count();
  if (n >= 2) {
    await dateInputs.nth(0).fill(checkIn).catch(() => {});
    await dateInputs.nth(1).fill(checkOut).catch(() => {});
    uiLog.push(`dates ${checkIn} -> ${checkOut}`);
  }

  // search button
  const searchBtn = page.locator('button[data-qa="btn_search_stay_themepark"]').first();
  if (await searchBtn.isVisible().catch(() => false)) {
    // CDK overlay may block
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(300);
    await searchBtn.click({ force: true }).catch(async () => {
      await page.evaluate(() => {
        document.querySelector('button[data-qa="btn_search_stay_themepark"]')?.click();
      });
    });
    uiLog.push("search clicked");
  } else {
    uiLog.push("search button missing");
  }

  // wait for results / APIs
  await page.waitForTimeout(12000);
  const body = await page.evaluate(() => document.body?.innerText?.slice(0, 1200) || "");
  const shot = resolveFromRoot("artifacts/screenshots", `${runId}-search.png`);
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
  return { ok: true, body, shot, checkIn, checkOut };
}

const ui = await tryUiSearch();
console.log("[ui]", uiLog.join(" | "), "bodySnippet=", (ui.body || "").slice(0, 200).replace(/\n/g, " "));

// If results list, click first hotel card
let detailUi = null;
try {
  const hotelCards = page.locator(
    '[data-qa*="hotel"], .hotel-card, [class*="hotel-result"], [class*="HotelCard"], a[href*="hotel"]',
  );
  const count = await hotelCards.count();
  uiLog.push(`hotelCards=${count}`);
  if (count > 0) {
    await hotelCards.first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(8000);
    detailUi = {
      url: page.url(),
      body: await page.evaluate(() => document.body?.innerText?.slice(0, 1500) || ""),
    };
    await page
      .screenshot({ path: resolveFromRoot("artifacts/screenshots", `${runId}-detail.png`), fullPage: false })
      .catch(() => {});
  }
} catch (e) {
  uiLog.push(`detail click err: ${e.message}`);
}

// --- 3) Brute probe expanded paths (GET content + POST avail) ---
const checkInIso = ymd(new Date(Date.now() + 14 * 86400000));
const checkOutIso = ymd(new Date(Date.now() + 15 * 86400000));

const brute = await page.evaluate(
  async ({ hotelCode, dest, checkIn, checkOut, helpers, spaHints }) => {
    eval(helpers);
    const token = __hbxCleanToken();
    if (!token) return { ok: false, error: "no_token" };

    const contentPaths = [
      `/client-content-api/1.0/hotels/${hotelCode}`,
      `/client-content-api/1.0/hotels/${hotelCode}?locale=zh`,
      `/client-content-api/1.0/hotels/${hotelCode}/details?locale=zh`,
      `/client-content-api/1.0/hotels/${hotelCode}/content?locale=zh`,
      `/client-content-api/1.0/hotels/${hotelCode}/images?locale=zh`,
      `/client-content-api/1.0/hotels?codes=${hotelCode}&locale=zh`,
      `/client-content-api/1.0/hotel/${hotelCode}?locale=zh`,
      `/client-content-api/1.0/accommodations/${hotelCode}?locale=zh`,
      `/client-content-api/1.0/accommodation/${hotelCode}?locale=zh`,
      `/client-btb-content-api/1.0/hotels/${hotelCode}?locale=zh`,
      `/client-btb-content-api/1.0/hotels/${hotelCode}/details?locale=zh`,
      `/client-btb-content-api/1.0/accommodations/${hotelCode}?locale=zh`,
      `/client-hotel-content-api/1.0/hotels/${hotelCode}?locale=zh`,
      `/client-hotel-content-api/1.0/hotels/${hotelCode}/details?locale=zh`,
      `/hotel-content-api/1.0/hotels/${hotelCode}/details?language=CHS`,
      `/hotel-content-api/1.0/hotels?codes=${hotelCode}&language=CHS`,
      `/client-content-api/1.0/destinations/${dest}/hotels?locale=zh`,
      `/client-content-api/1.0/destinations/${dest}/hotels?size=50&locale=zh`,
      `/client-catalog-api/1.0/hotels/${hotelCode}?locale=zh`,
      `/client-product-api/1.0/hotels/${hotelCode}?locale=zh`,
    ];

    // include spa-hint paths that look like hotel content
    for (const [hint] of spaHints || []) {
      if (!/hotel|accom|content|image|product/i.test(hint)) continue;
      let p = hint.startsWith("/") ? hint : "/" + hint;
      p = p.replace(/\{code\}|\{hotelCode\}|\{id\}/gi, hotelCode);
      if (!contentPaths.includes(p)) contentPaths.push(p);
    }

    const getResults = [];
    for (const p of contentPaths.slice(0, 60)) {
      const r = await __hbxXhrGet("https://webapi.gta-travel.cn" + p, token);
      const interesting = r.status && r.status !== 404 && r.status !== 0;
      getResults.push({
        path: p,
        status: r.status,
        preview: (r.text || "").slice(0, 350),
        keys: r.json && !Array.isArray(r.json) ? Object.keys(r.json).slice(0, 25) : null,
        interesting,
      });
      if (r.status === 200 && (r.text || "").length > 100) {
        // keep going but mark hit
      }
    }

    const availPaths = [
      "/client-btb-avail-api/1.0/hotels/availability",
      "/client-btb-avail-api/1.0/hotels/avail",
      "/client-btb-avail-api/1.0/availability",
      "/client-btb-avail-api/1.0/hotels",
      "/client-hotel-avail-api/1.0/hotels/availability",
      "/client-hotel-avail-api/1.0/availability",
      "/client-avail-api/1.0/hotels/availability",
      "/client-booking-api/1.0/hotels/availability",
      "/client-btb-hotel-api/1.0/availability",
      "/client-btb-hotel-api/1.0/hotels/availability",
      "/client-search-api/1.0/hotels",
      "/client-search-api/1.0/hotels/availability",
      "/client-search-api/1.0/accommodations",
      "/client-accommodation-api/1.0/availability",
      "/client-accommodation-api/1.0/hotels/availability",
      "/hotel-api/1.0/hotels",
      "/hotel-api/1.0/hotels/availability",
    ];
    for (const [hint] of spaHints || []) {
      if (!/avail|search|rate|booking|price/i.test(hint)) continue;
      let p = hint.startsWith("/") ? hint : "/" + hint;
      if (!availPaths.includes(p) && !p.includes("{")) availPaths.push(p);
    }

    const bodies = [
      {
        name: "dest",
        body: {
          stay: { checkIn, checkOut },
          occupancies: [{ rooms: 1, adults: 2, children: 0 }],
          destination: { code: dest },
        },
      },
      {
        name: "hotels",
        body: {
          stay: { checkIn, checkOut },
          occupancies: [{ rooms: 1, adults: 2, children: 0 }],
          hotels: { hotel: [String(hotelCode)] },
        },
      },
      {
        name: "filter_dest",
        body: {
          stay: { checkIn, checkOut },
          occupancies: [{ rooms: 1, adults: 2, childrenAges: [] }],
          filter: { destinationCode: dest },
        },
      },
      {
        name: "hb_style",
        body: {
          stay: { checkIn, checkOut },
          occupancies: [{ rooms: 1, adults: 2, children: 0 }],
          hotels: { hotel: [Number(hotelCode)] },
          language: "CAS",
          sourceMarket: "CN",
        },
      },
    ];

    const postResults = [];
    for (const p of availPaths.slice(0, 40)) {
      for (const b of bodies) {
        const r = await __hbxXhrPost("https://webapi.gta-travel.cn" + p, token, b.body);
        const interesting = r.status && r.status !== 404;
        postResults.push({
          path: p,
          body: b.name,
          status: r.status,
          preview: (r.text || "").slice(0, 350),
          keys: r.json && !Array.isArray(r.json) ? Object.keys(r.json).slice(0, 25) : null,
          interesting,
        });
        if (r.status === 200 && (r.text || "").length > 80 && !/Not Found/.test(r.text || "")) {
          return {
            ok: true,
            hit: postResults[postResults.length - 1],
            getResults: getResults.filter((x) => x.interesting || x.status === 200),
            postResults: postResults.filter((x) => x.interesting || x.status === 200).concat(
              postResults.slice(-1),
            ),
          };
        }
      }
    }

    // also try alternate hosts if known
    const altHosts = ["https://api.gta-travel.cn", "https://webapi.gta-travel.com"];
    for (const host of altHosts) {
      for (const p of [
        `/client-content-api/1.0/hotels/${hotelCode}?locale=zh`,
        `/client-btb-avail-api/1.0/hotels/availability`,
      ]) {
        const r =
          p.includes("availability")
            ? await __hbxXhrPost(host + p, token, bodies[1].body)
            : await __hbxXhrGet(host + p, token);
        postResults.push({
          host,
          path: p,
          status: r.status,
          preview: (r.text || "").slice(0, 200),
          interesting: r.status && r.status !== 404,
        });
      }
    }

    return {
      ok: false,
      getInteresting: getResults.filter((x) => x.interesting || (x.status && x.status !== 404)),
      postInteresting: postResults.filter((x) => x.interesting),
      getSample404: getResults.slice(0, 5),
      postSample404: postResults.filter((x) => x.status === 404).slice(0, 5),
      getTotal: getResults.length,
      postTotal: postResults.length,
    };
  },
  {
    hotelCode,
    dest,
    checkIn: checkInIso,
    checkOut: checkOutIso,
    helpers: injectXhrHelpers(),
    spaHints: spaScan.hits,
  },
);

// summarize unique net paths
const netSummary = [];
const seen = new Set();
for (const n of net) {
  try {
    const u = new URL(n.url);
    const key = `${n.method || ""} ${u.host}${u.pathname} ${n.status ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    netSummary.push({
      method: n.method,
      host: u.host,
      path: u.pathname,
      status: n.status,
      query: u.search?.slice(0, 120),
      post: n.postData?.slice(0, 300) || null,
      preview: n.preview?.slice(0, 200) || null,
    });
  } catch {
    /* ignore */
  }
}

const result = {
  runId,
  dest,
  destName,
  hotelCode,
  checkIn: checkInIso,
  checkOut: checkOutIso,
  session: { via: session.via, tokenLen: session.token?.length },
  spaScan: {
    scriptCount: spaScan.scriptCount,
    sampleScripts: spaScan.sampleScripts,
    topHits: spaScan.hits.slice(0, 100),
  },
  uiLog,
  ui,
  detailUi,
  brute,
  netSummary,
  netCount: net.length,
  at: new Date().toISOString(),
};

const outFile = path.join(outDir, `${runId}.json`);
await fs.writeFile(outFile, `${JSON.stringify(result, null, 2)}\n`);
await fs.writeFile(path.join(outDir, "api-discover-latest.json"), `${JSON.stringify(result, null, 2)}\n`);
await fs.writeFile(path.join(localOut, `${runId}.json`), `${JSON.stringify(result, null, 2)}\n`);
await fs.writeFile(path.join(localOut, "api-discover-latest.json"), `${JSON.stringify(result, null, 2)}\n`);

const interestingNet = netSummary.filter(
  (n) =>
    n.status &&
    n.status !== 404 &&
    /hotel|avail|content|search|rate|image|product|catalog|accom/i.test(n.path),
);

console.log(
  JSON.stringify(
    {
      ok: Boolean(brute?.ok || interestingNet.length),
      outFile,
      spaHits: spaScan.hits.length,
      netUnique: netSummary.length,
      interestingNet: interestingNet.slice(0, 30),
      bruteOk: brute?.ok || false,
      bruteHit: brute?.hit || null,
      getInteresting: brute?.getInteresting?.slice?.(0, 20) || brute?.getResults?.slice?.(0, 10),
      postInteresting: brute?.postInteresting?.slice?.(0, 20),
      uiLog,
    },
    null,
    2,
  ),
);
