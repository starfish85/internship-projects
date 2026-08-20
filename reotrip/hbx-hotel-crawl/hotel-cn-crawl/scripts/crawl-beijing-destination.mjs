/**
 * Crawl Beijing (PEK) destination results for review.
 * Path: destination list UI + network capture + FTS zh/en merge.
 *
 * Requires: Chrome CDP :9222 logged in.
 *   npm run chrome:launch
 *   node scripts/crawl-beijing-destination.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { loadConfig, resolveFromRoot, stamp } from "../lib/paths.mjs";

const config = await loadConfig();
const runId = stamp("beijing-dest");
const externalRoot = config.storage.externalRoot;
const batchDir = path.join(externalRoot, "batches", "CN", "by-city", "PEK", runId);
const localData = resolveFromRoot("data");
const shotDir = resolveFromRoot("artifacts/screenshots");
const logDir = resolveFromRoot("artifacts/logs");

for (const d of [batchDir, localData, shotDir, logDir]) {
  await fs.mkdir(d, { recursive: true });
}

const browser = await chromium.connectOverCDP(
  `http://127.0.0.1:${config.chrome.remoteDebuggingPort}`,
);
const context = browser.contexts()[0];
if (!context) throw new Error("No CDP context — run npm run chrome:launch and login");
const page =
  context.pages().find((p) => /gta-travel|bedsonline/.test(p.url())) ||
  context.pages()[0] ||
  (await context.newPage());

const apiLog = [];
const hotelHits = new Map(); // hotelCode -> record

function noteHotel(obj, source) {
  if (!obj || typeof obj !== "object") return;
  const code = String(
    obj.hotelCode ?? obj.code ?? obj.id ?? obj.hotel?.code ?? obj.hotel?.id ?? "",
  );
  if (!code || code === "undefined" || code === "null") return;
  const name =
    obj.name ??
    obj.hotelName ??
    obj.hotelDescription ??
    obj.hotel?.name ??
    obj.description ??
    null;
  const prev = hotelHits.get(code) || { hotelCode: code, sources: [] };
  if (name && !prev.nameZh && source.includes("zh")) prev.nameZh = name;
  if (name && !prev.nameEn && source.includes("en")) prev.nameEn = name;
  if (name && !prev.nameZh && !source.includes("en")) prev.nameZh = prev.nameZh || name;
  prev.destinationId = prev.destinationId || obj.destinationId || obj.destination?.code || "PEK";
  prev.destinationName =
    prev.destinationName || obj.destinationDescription || obj.destination?.name || "北京";
  prev.zoneId = prev.zoneId || obj.zoneId || obj.zone?.code || null;
  prev.zoneName = prev.zoneName || obj.zoneDescription || obj.zone?.name || null;
  prev.countryId = prev.countryId || obj.countryId || obj.country?.code || "CN";
  if (obj.price || obj.priceAmount || obj.minRate || obj.amount) {
    prev.priceSample = obj.price ?? obj.priceAmount ?? obj.minRate ?? obj.amount;
  }
  if (obj.category || obj.categoryCode || obj.stars) {
    prev.category = obj.category ?? obj.categoryCode ?? obj.stars;
  }
  if (!prev.sources.includes(source)) prev.sources.push(source);
  prev.rawKeys = Object.keys(obj).slice(0, 40);
  hotelHits.set(code, prev);
}

function walkHotels(node, source, depth = 0) {
  if (!node || depth > 10) return;
  if (Array.isArray(node)) {
    for (const item of node) walkHotels(item, source, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const looksHotel =
    node.hotelCode ||
    node.hotelDescription ||
    (node.code && node.name && (node.category || node.destination || node.destinationId)) ||
    (node.id && node.hotelDescription) ||
    (node.hotel && (node.hotel.code || node.hotel.name));
  if (looksHotel) noteHotel(node.hotel ? { ...node.hotel, ...node } : node, source);
  for (const v of Object.values(node)) {
    if (v && typeof v === "object") walkHotels(v, source, depth + 1);
  }
}

page.on("response", async (res) => {
  const url = res.url();
  if (!/webapi\.gta-travel\.cn|gta-travel\.cn\/client/.test(url)) return;
  if (/\.(js|css|png|jpg|svg|woff)/i.test(url)) return;
  const type = res.request().resourceType();
  if (type !== "xhr" && type !== "fetch") return;
  let body = null;
  let text = null;
  try {
    const ct = res.headers()["content-type"] || "";
    if (ct.includes("json") || /api|fts|avail|hotel|dest|content/i.test(url)) {
      text = await res.text();
      try {
        body = JSON.parse(text);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  const entry = {
    url,
    status: res.status(),
    method: res.request().method(),
    post: res.request().postData()?.slice(0, 6000) || null,
    at: new Date().toISOString(),
    preview: text?.slice(0, 2000) || null,
  };
  apiLog.push(entry);
  if (body) walkHotels(body, `net:${new URL(url).pathname}`);
});

const processLog = [];
const summary = {
  runId,
  startedAt: new Date().toISOString(),
  destination: { name: "北京", code: "PEK", country: "CN" },
  ok: false,
  steps: processLog,
  hotelCount: 0,
  batchDir,
  errors: [],
};

async function shot(name) {
  const p = path.join(shotDir, `${runId}-${name}.png`);
  await page.screenshot({ path: p, fullPage: true }).catch(() => {});
  return p;
}

async function clickText(texts, opts = {}) {
  for (const t of texts) {
    const loc = page.getByText(t, { exact: opts.exact ?? false }).first();
    if (await loc.isVisible().catch(() => false)) {
      await loc.click({ timeout: 5000 }).catch(async () => {
        await loc.click({ force: true });
      });
      return t;
    }
  }
  return null;
}

try {
  await page.goto(config.site.mainUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(5000);
  await page.keyboard.press("Escape").catch(() => {});

  // cookie
  for (const sel of [
    "#CybotCookiebotDialogBodyButtonDecline",
    'button:has-text("拒绝")',
    'button:has-text("全部允许")',
  ]) {
    const el = page.locator(sel);
    if (await el.isVisible().catch(() => false)) {
      await el.click().catch(() => {});
      processLog.push(`cookie: ${sel}`);
      break;
    }
  }

  // ensure hotel product
  const hotelBtn = page.locator('button[data-qa="HOTEL"]');
  if (await hotelBtn.isVisible().catch(() => false)) {
    await hotelBtn.click().catch(() => {});
    processLog.push("clicked HOTEL tab");
    await page.waitForTimeout(1500);
  }

  // open destination control
  const dest = page.locator('input[data-qa="destinationsControl"]');
  await dest.waitFor({ state: "visible", timeout: 30000 });
  await dest.click();
  await page.waitForTimeout(1200);
  processLog.push("opened destinationsControl");
  await shot("01-dest-open");

  // open 目的地列表
  let openedList =
    (await clickText(["目的地列表"], { exact: true })) ||
    (await page
      .locator('text=目的地列表')
      .first()
      .click()
      .then(() => "目的地列表")
      .catch(() => null));
  processLog.push(`destination list: ${openedList || "not found via text"}`);
  await page.waitForTimeout(2000);
  await shot("02-dest-list");

  // continent 亚洲
  const asia = await clickText(["亚洲"], { exact: true });
  processLog.push(`continent: ${asia || "skip"}`);
  await page.waitForTimeout(1000);

  // country 中国
  const china = await clickText(["中国"], { exact: true });
  processLog.push(`country: ${china || "skip"}`);
  await page.waitForTimeout(2500);
  await shot("03-china");

  // city 北京 — may need scroll; try exact first
  let beijing = null;
  const beijingCandidates = ["北京", "北京市", "Beijing"];
  for (const t of beijingCandidates) {
    const all = page.getByText(t, { exact: true });
    const n = await all.count();
    for (let i = 0; i < n; i++) {
      const item = all.nth(i);
      if (!(await item.isVisible().catch(() => false))) continue;
      const box = await item.boundingBox().catch(() => null);
      // skip tiny header bits
      await item.click({ timeout: 3000 }).catch(() => null);
      beijing = t;
      break;
    }
    if (beijing) break;
  }

  // if not found, try evaluate scroll + click in overlay
  if (!beijing) {
    beijing = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll("a,button,li,div,span")];
      const hit = nodes.find((n) => {
        const t = (n.innerText || "").trim();
        return (t === "北京" || t === "北京市" || t.startsWith("北京")) && n.children.length < 3;
      });
      if (hit) {
        hit.scrollIntoView({ block: "center" });
        hit.click();
        return (hit.innerText || "").trim();
      }
      return null;
    });
  }
  processLog.push(`city: ${beijing || "NOT FOUND"}`);
  await page.waitForTimeout(1500);
  await shot("04-beijing-selected");

  // search
  const searchBtn = page.locator('button[data-qa="btn_search_stay_themepark"]');
  if (await searchBtn.isVisible().catch(() => false)) {
    await searchBtn.click({ force: true }).catch(async () => {
      await page.evaluate(() => {
        document.querySelector('[data-qa="btn_search_stay_themepark"]')?.click();
      });
    });
    processLog.push("search clicked");
  } else {
    await page.evaluate(() => {
      document.querySelector('[data-qa="btn_search_stay_themepark"]')?.click();
    });
    processLog.push("search clicked via evaluate");
  }

  // wait for results / URL change
  await page.waitForTimeout(20000);
  await shot("05-search-result");
  summary.resultUrl = page.url();
  summary.bodySnippet = (await page.locator("body").innerText().catch(() => "")).slice(0, 1200);
  processLog.push(`result url: ${summary.resultUrl}`);

  // try load more a few times
  for (let i = 0; i < 8; i++) {
    const more = page.getByRole("button", { name: /加载更多|Load more|显示更多|更多/i });
    if (!(await more.isVisible().catch(() => false))) break;
    await more.click().catch(() => {});
    processLog.push(`load more #${i + 1}`);
    await page.waitForTimeout(6000);
  }
  await shot("06-after-loadmore");

  // FTS enrichment via XHR (stable path)
  const fts = await page.evaluate(async () => {
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
          resolve({ status: x.status, json });
        };
        x.onerror = () => resolve({ status: 0 });
        x.ontimeout = () => resolve({ status: 0 });
        x.send();
      });
    }
    let token = (localStorage.getItem("darwinToken") || "").replace(/^"+|"+$/g, "");
    if (!token) return { ok: false, error: "no_token" };
    const base = "https://webapi.gta-travel.cn/client-content-api/1.0/fts";
    // multiple queries to broaden Beijing coverage
    const queriesZh = ["北京", "北京市", "朝阳", "海淀", "东城", "西城", "通州", "大兴"];
    const queriesEn = ["Beijing", "Peking", "Chaoyang Beijing", "Haidian"];
    const hotelsZh = [];
    const hotelsEn = [];
    for (const q of queriesZh) {
      const r = await xhrGet(
        `${base}?query=${encodeURIComponent(q)}&size=100&type=HOTEL&locale=zh`,
        token,
      );
      if (r.json?.hotels) hotelsZh.push(...r.json.hotels);
    }
    for (const q of queriesEn) {
      const r = await xhrGet(
        `${base}?query=${encodeURIComponent(q)}&size=100&type=HOTEL&locale=en`,
        token,
      );
      if (r.json?.hotels) hotelsEn.push(...r.json.hotels);
    }
    return {
      ok: true,
      hotelsZh,
      hotelsEn,
      tokenLen: token.length,
    };
  });

  processLog.push(
    `fts: ok=${fts.ok} zh=${fts.hotelsZh?.length || 0} en=${fts.hotelsEn?.length || 0}`,
  );

  if (fts.hotelsZh) {
    for (const h of fts.hotelsZh) {
      if (h.destinationId && h.destinationId !== "PEK" && h.countryId === "CN") {
        // keep only PEK-ish for this batch review, but tag others
        if (!/北京|PEK|Beijing/i.test(`${h.destinationDescription || ""}${h.hotelDescription || ""}`)) {
          continue;
        }
      }
      noteHotel(h, "fts-zh");
    }
  }
  if (fts.hotelsEn) {
    for (const h of fts.hotelsEn) {
      const code = String(h.id || "");
      if (!code) continue;
      // merge EN names for known codes or PEK
      if (hotelHits.has(code) || h.destinationId === "PEK") {
        noteHotel(h, "fts-en");
      }
    }
  }

  // Prefer PEK destination filter for review batch
  const allHotels = [...hotelHits.values()];
  const pekHotels = allHotels.filter(
    (h) =>
      h.destinationId === "PEK" ||
      /北京|Beijing/i.test(h.destinationName || "") ||
      /北京|Beijing/i.test(h.nameZh || "") ||
      /Beijing/i.test(h.nameEn || ""),
  );
  // if PEK filter too aggressive empty, keep all
  const finalHotels = pekHotels.length ? pekHotels : allHotels;

  // sort by code
  finalHotels.sort((a, b) => String(a.hotelCode).localeCompare(String(b.hotelCode)));

  summary.hotelCount = finalHotels.length;
  summary.apiCount = apiLog.length;
  summary.uniqueApiPaths = [
    ...new Set(
      apiLog.map((a) => {
        try {
          return `${a.method} ${new URL(a.url).pathname}`;
        } catch {
          return a.url;
        }
      }),
    ),
  ].sort();
  summary.ok = finalHotels.length > 0;

  // write batch
  await fs.writeFile(
    path.join(batchDir, "hotels.jsonl"),
    finalHotels.map((h) => JSON.stringify(h)).join("\n") + (finalHotels.length ? "\n" : ""),
  );
  await fs.writeFile(
    path.join(batchDir, "hotels.json"),
    `${JSON.stringify(finalHotels, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(batchDir, "api-capture.json"),
    `${JSON.stringify(
      apiLog.map((a) => ({
        method: a.method,
        status: a.status,
        url: a.url,
        post: a.post,
        preview: a.preview,
        at: a.at,
      })),
      null,
      2,
    )}\n`,
  );

  // simple CSV for human review
  const csvHeader = [
    "hotelCode",
    "nameZh",
    "nameEn",
    "destinationId",
    "destinationName",
    "zoneId",
    "zoneName",
    "countryId",
    "category",
    "sources",
  ];
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const csv = [
    csvHeader.join(","),
    ...finalHotels.map((h) =>
      csvHeader
        .map((k) => esc(k === "sources" ? (h.sources || []).join("|") : h[k]))
        .join(","),
    ),
  ].join("\n");
  await fs.writeFile(path.join(batchDir, "hotels.csv"), `${csv}\n`);

  summary.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(batchDir, "meta.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(
    path.join(localData, `${runId}-summary.json`),
    `${JSON.stringify({ ...summary, sample: finalHotels.slice(0, 15) }, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(logDir, `${runId}-process.md`),
    [
      `# ${runId}`,
      "",
      `- hotels: ${summary.hotelCount}`,
      `- batch: ${batchDir}`,
      "",
      "## Steps",
      ...processLog.map((s) => `- ${s}`),
      "",
      "## API paths",
      ...summary.uniqueApiPaths.map((p) => `- ${p}`),
      "",
    ].join("\n"),
  );

  // also mirror summary to external probe
  await fs.mkdir(path.join(externalRoot, "probe"), { recursive: true });
  await fs.writeFile(
    path.join(externalRoot, "probe", `${runId}-summary.json`),
    `${JSON.stringify({ ...summary, sample: finalHotels.slice(0, 15) }, null, 2)}\n`,
  );

  console.log(
    JSON.stringify(
      {
        ok: summary.ok,
        hotelCount: summary.hotelCount,
        batchDir,
        resultUrl: summary.resultUrl,
        sample: finalHotels.slice(0, 10),
        apiPaths: summary.uniqueApiPaths.slice(0, 40),
        steps: processLog,
      },
      null,
      2,
    ),
  );
} catch (err) {
  summary.errors.push(String(err));
  summary.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(batchDir, "meta.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await shot("error");
  console.error(JSON.stringify(summary, null, 2));
  process.exit(2);
}

process.exit(summary.ok ? 0 : 2);
