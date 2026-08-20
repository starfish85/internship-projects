/**
 * Coverage probe: compare FTS listing vs multi-date availability/UI search.
 * Tests whether check-in dates expand hotel inventory counts.
 *
 * Usage:
 *   node scripts/pipeline/probe-inventory-coverage.mjs --dest=PEK --destName=北京
 *   node scripts/pipeline/probe-inventory-coverage.mjs --dest=PEK --destName=北京 --uiDates=8 --skipUi=false
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { ensureSession, injectXhrHelpers } from "../../lib/api-client.mjs";
import { loadPipelineConfig } from "../../lib/disk-guard.mjs";
import { loadConfig, stamp } from "../../lib/paths.mjs";

function parseArgs(argv) {
  const out = {};
  for (const item of argv) {
    const m = item.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
    else if (item.startsWith("--")) out[item.slice(2)] = true;
  }
  return out;
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(base, n) {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function walkHotelCodes(json, maxDepth = 10) {
  const codes = new Set();
  const walk = (n, depth = 0) => {
    if (!n || depth > maxDepth) return;
    if (Array.isArray(n)) {
      for (const x of n) walk(x, depth + 1);
      return;
    }
    if (typeof n === "object") {
      const c = n.hotelCode ?? n.code ?? n.hotel?.code ?? n.hotel?.hotelCode ?? n.id;
      const name = n.name ?? n.hotelName ?? n.hotelDescription ?? n.hotel?.name;
      const looksHotel =
        c &&
        (name ||
          n.category ||
          n.destination ||
          n.rooms ||
          n.rates ||
          n.minRate != null ||
          n.hotel ||
          n.currency ||
          n.price != null ||
          n.totalNet != null);
      if (looksHotel) codes.add(String(c));
      for (const v of Object.values(n)) if (v && typeof v === "object") walk(v, depth + 1);
    }
  };
  if (json) walk(json);
  return codes;
}

const args = parseArgs(process.argv.slice(2));
const dest = args.dest || "PEK";
const destName = args.destName || "北京";
const skipUi = args.skipUi === "true" || args.skipUi === true;
const uiDateLimit = Math.max(3, Number(args.uiDates || 6));
const siteConfig = await loadConfig();
const pipe = await loadPipelineConfig();
const runId = stamp("inventory-coverage");
const outDir = path.join(pipe.dataRoot, "00-state", "probes");
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium
  .connectOverCDP(`http://127.0.0.1:${siteConfig.chrome.remoteDebuggingPort}`, { timeout: 10000 })
  .catch(() => null);
if (!browser) {
  console.error("CDP unavailable");
  process.exit(2);
}
const context = browser.contexts()[0];
// Dedicated page so concurrent enrich is less disturbed
const page = await context.newPage();

const session = await ensureSession(page, siteConfig.site);
if (!session.ok) {
  console.error(JSON.stringify({ ok: false, error: "login_failed" }));
  process.exit(2);
}
console.log(`[session] ok via=${session.via} tokenLen=${session.token?.length || 0}`);

const netHits = [];
page.on("response", async (res) => {
  const url = res.url();
  if (!/webapi\.gta-travel\.cn|gta-travel\.cn\/client/.test(url)) return;
  const type = res.request().resourceType();
  if (type !== "xhr" && type !== "fetch") return;
  let text = null;
  try {
    text = await res.text();
  } catch {
    /* ignore */
  }
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  const codes = walkHotelCodes(json);
  netHits.push({
    method: res.request().method(),
    status: res.status(),
    url,
    post: res.request().postData()?.slice(0, 3000) || null,
    hotelCodesFound: [...codes],
    hotelCount: codes.size,
    preview: text?.slice(0, 1000) || null,
    at: new Date().toISOString(),
  });
});

// ---------- A) FTS size ladder + zone diversity ----------
const ftsSizes = [50, 100, 200, 500, 1000, 2000];
const ftsQueries = [
  destName,
  `${destName}市`,
  dest,
  "酒店",
  "Hotel",
  "宾馆",
  "度假",
  "万豪",
  "希尔顿",
  "如家",
  "汉庭",
  "全季",
  "亚朵",
  "喜来登",
  "凯悦",
];
const ftsResults = [];
const ftsUnionCodes = new Set();
const ftsUnionByQuery = {};

for (const q of ftsQueries) {
  ftsUnionByQuery[q] = new Set();
  for (const size of ftsSizes) {
    const r = await page.evaluate(
      async ({ q, size, helpers, destCode }) => {
        eval(helpers);
        const token = __hbxCleanToken();
        const url = `https://webapi.gta-travel.cn/client-content-api/1.0/fts?query=${encodeURIComponent(q)}&size=${size}&type=HOTEL&locale=zh`;
        const res = await __hbxXhrGet(url, token);
        const hotels = res.json?.hotels || [];
        const match = hotels.filter((h) => h.destinationId === destCode);
        return {
          status: res.status,
          total: hotels.length,
          destMatch: match.length,
          codes: match.map((h) => String(h.id)),
          zones: [...new Set(match.map((h) => h.zoneId).filter(Boolean))],
          sample: hotels.slice(0, 3).map((h) => ({
            id: h.id,
            dest: h.destinationId,
            zone: h.zoneId,
            name: h.hotelDescription,
          })),
        };
      },
      { q, size, helpers: injectXhrHelpers(), destCode: dest },
    );
    ftsResults.push({
      query: q,
      size,
      status: r.status,
      total: r.total,
      destMatch: r.destMatch,
      zoneCount: r.zones?.length || 0,
      sample: r.sample,
    });
    for (const c of r.codes || []) {
      ftsUnionCodes.add(c);
      ftsUnionByQuery[q].add(c);
    }
    if (size === 100 || size === 1000) {
      console.log(
        `[fts] q=${q} size=${size} status=${r.status} total=${r.total} destMatch=${r.destMatch} zones=${r.zones?.length || 0}`,
      );
    }
  }
}

// Also try destination-code as type=DESTINATION then hotels by zone
const destMeta = await page.evaluate(
  async ({ destCode, helpers }) => {
    eval(helpers);
    const token = __hbxCleanToken();
    const paths = [
      `https://webapi.gta-travel.cn/client-content-api/1.0/destinations/${destCode}?locale=zh`,
      `https://webapi.gta-travel.cn/client-content-api/1.0/destinations/${destCode}/zones?locale=zh`,
      `https://webapi.gta-travel.cn/client-content-api/1.0/destinations/${destCode}/hotels?locale=zh`,
      `https://webapi.gta-travel.cn/client-content-api/1.0/hotels?destinationCode=${destCode}&locale=zh&size=500`,
      `https://webapi.gta-travel.cn/client-content-api/1.0/hotels?destination=${destCode}&locale=zh&size=500`,
      `https://webapi.gta-travel.cn/client-content-api/1.0/hotels/by-destination/${destCode}?locale=zh`,
      `https://webapi.gta-travel.cn/client-content-api/2.0/hotels?destinationCode=${destCode}&locale=zh`,
    ];
    const out = [];
    for (const url of paths) {
      const r = await __hbxXhrGet(url, token);
      out.push({
        url: url.replace("https://webapi.gta-travel.cn", ""),
        status: r.status,
        textLen: (r.text || "").length,
        preview: (r.text || "").slice(0, 300),
        keys: r.json && !Array.isArray(r.json) ? Object.keys(r.json).slice(0, 15) : null,
        arrLen: Array.isArray(r.json) ? r.json.length : r.json?.hotels?.length ?? r.json?.zones?.length ?? null,
      });
    }
    return out;
  },
  { destCode: dest, helpers: injectXhrHelpers() },
);
console.log(
  `[dest-meta] hits:`,
  destMeta.filter((x) => x.status === 200 && x.textLen > 20).map((x) => `${x.url} arr=${x.arrLen}`),
);

// ---------- B) Multi-date availability brute ----------
const dateWindows = [];
const today = new Date();
// denser offsets: near-term + monthly ladder + weekend samples
const offsets = [1, 2, 3, 5, 7, 10, 14, 21, 28, 30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 300, 365];
for (const offset of offsets) {
  const cin = addDays(today, offset);
  const cout = addDays(cin, 1);
  dateWindows.push({
    label: `+${offset}d_1n`,
    checkIn: ymd(cin),
    checkOut: ymd(cout),
    nights: 1,
  });
  if ([7, 14, 30, 60, 90].includes(offset)) {
    dateWindows.push({
      label: `+${offset}d_2n`,
      checkIn: ymd(cin),
      checkOut: ymd(addDays(cin, 2)),
      nights: 2,
    });
    dateWindows.push({
      label: `+${offset}d_3n`,
      checkIn: ymd(cin),
      checkOut: ymd(addDays(cin, 3)),
      nights: 3,
    });
  }
}

const availPaths = [
  "/client-btb-avail-api/1.0/hotels/availability",
  "/client-btb-avail-api/1.0/hotels",
  "/client-btb-avail-api/2.0/hotels/availability",
  "/client-hotel-avail-api/1.0/hotels/availability",
  "/client-hotel-avail-api/1.0/availability",
  "/client-btb-hotel-api/1.0/availability",
  "/client-btb-hotel-api/1.0/hotels/availability",
  "/client-avail-api/1.0/hotels/availability",
  "/client-booking-api/1.0/hotels/availability",
  "/client-content-api/1.0/hotels/availability",
  "/client-search-api/1.0/hotels",
  "/client-search-api/1.0/hotels/availability",
  "/client-hotel-search-api/1.0/availability",
  "/client-hotel-search-api/1.0/hotels",
  "/client-btb-search-api/1.0/hotels/availability",
  "/client-btb-search-api/1.0/hotels",
  "/client-btb-availability-api/1.0/hotels",
  "/client-btb-availability-api/1.0/hotels/availability",
  "/clientb2b-front-booking-api/1.0/hotels/availability",
  "/client-activity-api/1.0/hotels/availability",
];

const bodyBuilders = (checkIn, checkOut) => [
  {
    name: "dest_v1",
    body: {
      stay: { checkIn, checkOut },
      occupancies: [{ rooms: 1, adults: 2, children: 0 }],
      destination: { code: dest },
    },
  },
  {
    name: "dest_filter",
    body: {
      stay: { checkIn, checkOut },
      occupancies: [{ rooms: 1, adults: 2, children: 0 }],
      destination: { code: dest },
      filter: { maxHotels: 5000 },
    },
  },
  {
    name: "sourceMarket",
    body: {
      stay: { checkIn, checkOut },
      occupancies: [{ rooms: 1, adults: 2, children: 0 }],
      destination: { code: dest },
      sourceMarket: "CN",
    },
  },
  {
    name: "destCode_flat",
    body: {
      checkIn,
      checkOut,
      rooms: 1,
      adults: 2,
      destinationCode: dest,
    },
  },
  {
    name: "search_rq",
    body: {
      language: "zh",
      currency: "CNY",
      destinationCode: dest,
      stay: { checkIn, checkOut },
      occupancies: [{ rooms: 1, adults: 2, children: 0 }],
    },
  },
];

// Path discovery on one mid date
const probeDate = dateWindows.find((w) => w.label === "+14d_1n") || dateWindows[0];
const pathProbe = [];
for (const p of availPaths) {
  for (const b of bodyBuilders(probeDate.checkIn, probeDate.checkOut)) {
    const r = await page.evaluate(
      async ({ pathName, body, helpers }) => {
        eval(helpers);
        const token = __hbxCleanToken();
        return __hbxXhrPost("https://webapi.gta-travel.cn" + pathName, token, body);
      },
      { pathName: p, body: b.body, helpers: injectXhrHelpers() },
    );
    pathProbe.push({
      path: p,
      body: b.name,
      status: r.status,
      textLen: (r.text || "").length,
      preview: (r.text || "").slice(0, 250),
    });
    if (r.status && ![404, 0, 405].includes(r.status) && (r.text || "").length > 50) {
      console.log(`[path-hit] ${p} body=${b.name} status=${r.status} len=${(r.text || "").length}`);
    }
  }
}

const hits200 = pathProbe.filter((x) => x.status === 200 && x.textLen > 50);
const interestingStatus = pathProbe.filter((x) => x.status && ![404, 0].includes(x.status));

// Multi-date using first hit path if any
const multiDate = [];
const multiDateUnion = new Set();
if (hits200.length) {
  const hit = hits200[0];
  console.log(`[multi-date] using ${hit.path} body=${hit.body} across ${dateWindows.length} windows`);
  for (const w of dateWindows) {
    const builders = bodyBuilders(w.checkIn, w.checkOut);
    const b = builders.find((x) => x.name === hit.body) || builders[0];
    const r = await page.evaluate(
      async ({ pathName, body, helpers }) => {
        eval(helpers);
        const token = __hbxCleanToken();
        return __hbxXhrPost("https://webapi.gta-travel.cn" + pathName, token, body);
      },
      { pathName: hit.path, body: b.body, helpers: injectXhrHelpers() },
    );
    let json = null;
    try {
      json = JSON.parse(r.text || "");
    } catch {
      /* ignore */
    }
    const codes = walkHotelCodes(json);
    for (const c of codes) multiDateUnion.add(c);
    multiDate.push({
      ...w,
      status: r.status,
      hotelCount: codes.size,
      codes: [...codes].slice(0, 80),
      preview: (r.text || "").slice(0, 300),
    });
    console.log(`[date] ${w.label} ${w.checkIn} hotels=${codes.size} status=${r.status}`);
    await page.waitForTimeout(250);
  }
} else {
  console.log("[multi-date] no avail API 200 hit — will rely on UI capture");
}

// ---------- C) SPA JS path scrape for availability endpoints ----------
const spaPaths = await page.evaluate(async () => {
  const scripts = [...document.querySelectorAll("script[src]")]
    .map((s) => s.src)
    .filter((u) => /app-bedsonline\.gta-travel\.cn\/.+\.js/.test(u));
  const found = new Set();
  for (const src of scripts.slice(0, 40)) {
    try {
      const t = await fetch(src).then((r) => r.text());
      const re = /\/client-[a-z0-9-]+-api\/[0-9.]+\/[a-zA-Z0-9_./-]*(?:avail|hotel|search|rate|booking|content)[a-zA-Z0-9_./-]*/gi;
      let m;
      while ((m = re.exec(t))) found.add(m[0]);
      // also bare path strings
      const re2 = /["'`](\/client-[a-z0-9-]+-api\/[^"'`]+)["'`]/gi;
      while ((m = re2.exec(t))) {
        if (/hotel|avail|search|rate|booking/i.test(m[1])) found.add(m[1]);
      }
    } catch {
      /* ignore */
    }
  }
  return [...found].sort();
});
console.log(`[spa] found ${spaPaths.length} candidate API paths`);
for (const p of spaPaths.slice(0, 40)) console.log(`  ${p}`);

// Probe SPA-discovered POST paths with dest body
const spaProbe = [];
const spaCandidates = spaPaths.filter((p) => /avail|search|hotel/i.test(p)).slice(0, 30);
for (const p of spaCandidates) {
  for (const b of bodyBuilders(probeDate.checkIn, probeDate.checkOut).slice(0, 3)) {
    const r = await page.evaluate(
      async ({ pathName, body, helpers }) => {
        eval(helpers);
        const token = __hbxCleanToken();
        // path may already start with /
        const url = pathName.startsWith("http")
          ? pathName
          : "https://webapi.gta-travel.cn" + pathName;
        return __hbxXhrPost(url, token, body);
      },
      { pathName: p, body: b.body, helpers: injectXhrHelpers() },
    );
    const entry = {
      path: p,
      body: b.name,
      status: r.status,
      textLen: (r.text || "").length,
      preview: (r.text || "").slice(0, 200),
    };
    spaProbe.push(entry);
    if (r.status === 200 && (r.text || "").length > 80) {
      console.log(`[spa-hit] ${p} body=${b.name} len=${(r.text || "").length}`);
    }
  }
}
const spaHits200 = spaProbe.filter((x) => x.status === 200 && x.textLen > 80);

// If SPA hit, multi-date on that path too
if (spaHits200.length && !hits200.length) {
  const hit = spaHits200[0];
  console.log(`[multi-date-spa] using ${hit.path}`);
  for (const w of dateWindows.filter((_, i) => i % 2 === 0)) {
    const b = bodyBuilders(w.checkIn, w.checkOut).find((x) => x.name === hit.body) || bodyBuilders(w.checkIn, w.checkOut)[0];
    const r = await page.evaluate(
      async ({ pathName, body, helpers }) => {
        eval(helpers);
        const token = __hbxCleanToken();
        const url = pathName.startsWith("http") ? pathName : "https://webapi.gta-travel.cn" + pathName;
        return __hbxXhrPost(url, token, body);
      },
      { pathName: hit.path, body: b.body, helpers: injectXhrHelpers() },
    );
    let json = null;
    try {
      json = JSON.parse(r.text || "");
    } catch {
      /* ignore */
    }
    const codes = walkHotelCodes(json);
    for (const c of codes) multiDateUnion.add(c);
    multiDate.push({
      ...w,
      path: hit.path,
      status: r.status,
      hotelCount: codes.size,
      codes: [...codes].slice(0, 50),
      preview: (r.text || "").slice(0, 250),
    });
    console.log(`[date-spa] ${w.label} hotels=${codes.size} status=${r.status}`);
    await page.waitForTimeout(250);
  }
}

// ---------- D) UI multi-date search (capture real network) ----------
const uiDateRuns = [];
async function uiSearchOnce(checkIn, checkOut, label) {
  const before = netHits.length;
  await page.goto(siteConfig.site.mainUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(3500);
  await page.keyboard.press("Escape").catch(() => {});

  // select hotel product tab
  await page.evaluate(() => {
    const el =
      document.querySelector('[data-qa="HOTEL"]') ||
      [...document.querySelectorAll("button,a,span,div")].find((e) => (e.innerText || "").trim() === "酒店");
    el?.click?.();
  });
  await page.waitForTimeout(800);

  const destInput = page.locator('input[data-qa="destinationsControl"]').first();
  const hasDest = (await destInput.count()) > 0;
  if (hasDest) {
    await destInput.click({ timeout: 5000 });
    await page.waitForTimeout(400);
    // clear and type destination name, pick from autocomplete
    await destInput.fill("");
    await destInput.pressSequentially(destName, { delay: 60 });
    await page.waitForTimeout(2500);
    // click first dropdown option that contains dest name or PEK
    const picked = await page.evaluate((name) => {
      const opts = [...document.querySelectorAll('[role="option"], li, .ng-option, button, a, div, span')];
      const hit =
        opts.find((el) => {
          const t = (el.innerText || "").trim();
          return t.includes(name) && t.length < 40;
        }) ||
        opts.find((el) => {
          const t = (el.innerText || "").trim();
          return /北京|PEK/.test(t) && t.length < 40;
        });
      if (hit) {
        hit.scrollIntoView({ block: "center" });
        hit.click();
        return (hit.innerText || "").trim().slice(0, 80);
      }
      return null;
    }, destName);
    if (!picked) {
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
    }
    await page.waitForTimeout(800);
  }

  // dates
  const cin = checkIn.replace(/-/g, "/");
  const cout = checkOut.replace(/-/g, "/");
  const dateInputs = page.locator('input[placeholder="yyyy/mm/dd"]');
  if ((await dateInputs.count()) >= 2) {
    await dateInputs.nth(0).click();
    await dateInputs.nth(0).fill("");
    await dateInputs.nth(0).fill(cin).catch(() => {});
    await dateInputs.nth(1).click();
    await dateInputs.nth(1).fill("");
    await dateInputs.nth(1).fill(cout).catch(() => {});
  } else {
    // try type into any date-like inputs
    await page.evaluate(
      ({ cin, cout }) => {
        const inputs = [...document.querySelectorAll("input")].filter((i) =>
          /date|check|in|out|yyyy/i.test((i.placeholder || "") + (i.name || "") + (i.getAttribute("data-qa") || "")),
        );
        if (inputs[0]) {
          inputs[0].value = cin;
          inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (inputs[1]) {
          inputs[1].value = cout;
          inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
        }
      },
      { cin, cout },
    );
  }

  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const btn =
      document.querySelector('button[data-qa="btn_search_stay_themepark"]') ||
      [...document.querySelectorAll("button")].find((b) => /搜索|Search/.test(b.innerText || ""));
    btn?.click?.();
  });
  // wait for results / network settle
  await page.waitForTimeout(20000);

  const body = await page.evaluate(() => document.body?.innerText?.slice(0, 2500) || "");
  const totalMatch =
    body.match(/(\d[\d,]*)\s*(家|个)?\s*(酒店|结果|Hotel)/i) ||
    body.match(/共\s*(\d[\d,]*)/) ||
    body.match(/(\d[\d,]*)\s*hotels?/i) ||
    body.match(/显示\s*(\d[\d,]*)/) ||
    body.match(/(\d[\d,]*)\s*\/\s*(\d[\d,]*)/);

  const after = netHits.slice(before);
  const hotelApis = after.filter(
    (h) => h.hotelCount > 0 || /avail|hotel|search|rate|booking/i.test(h.url),
  );
  const maxHotels = hotelApis.reduce((m, h) => Math.max(m, h.hotelCount || 0), 0);
  const unionFromNet = new Set();
  for (const h of hotelApis) for (const c of h.hotelCodesFound || []) unionFromNet.add(c);

  const paths = [
    ...new Set(
      hotelApis.map((h) => {
        try {
          return `${h.method} ${h.status} ${new URL(h.url).pathname}`;
        } catch {
          return h.url;
        }
      }),
    ),
  ];

  const shotDir = path.join(process.cwd(), "artifacts/screenshots");
  await fs.mkdir(shotDir, { recursive: true });
  const shot = path.join(shotDir, `${runId}-ui-${label.replace(/[^a-zA-Z0-9_+-]/g, "_")}.png`);
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});

  // try extract result count from DOM more carefully
  const domCount = await page.evaluate(() => {
    const text = document.body?.innerText || "";
    const candidates = [];
    for (const m of text.matchAll(/(\d{1,5})\s*(家酒店|个酒店|酒店|results?|hotels?)/gi)) {
      candidates.push({ n: Number(m[1]), snip: m[0] });
    }
    for (const m of text.matchAll(/(?:共|总计|显示|找到)\s*(\d{1,5})/g)) {
      candidates.push({ n: Number(m[1]), snip: m[0] });
    }
    return candidates.slice(0, 10);
  });

  return {
    label,
    checkIn,
    checkOut,
    bodySnippet: body.slice(0, 600).replace(/\n/g, " | "),
    totalMatch: totalMatch?.[0] || null,
    domCount,
    maxHotelsFromApi: maxHotels,
    unionHotelCodes: unionFromNet.size,
    sampleCodes: [...unionFromNet].slice(0, 30),
    hotelApiPaths: paths,
    netDelta: after.length,
    topApis: hotelApis
      .filter((h) => h.hotelCount > 0 || h.status === 200)
      .slice(0, 15)
      .map((h) => ({
        method: h.method,
        status: h.status,
        path: (() => {
          try {
            return new URL(h.url).pathname + (new URL(h.url).search || "");
          } catch {
            return h.url;
          }
        })(),
        hotelCount: h.hotelCount,
        post: h.post?.slice(0, 400),
        preview: h.preview?.slice(0, 300),
      })),
    validationError: /请从列表中选择|该字段必填/.test(body),
    screenshot: shot,
  };
}

if (!skipUi) {
  const preferredLabels = ["+3d_1n", "+7d_1n", "+14d_1n", "+30d_1n", "+60d_1n", "+90d_1n", "+120d_1n", "+180d_1n"];
  const uiDates = preferredLabels
    .map((l) => dateWindows.find((w) => w.label === l))
    .filter(Boolean)
    .slice(0, uiDateLimit);

  for (const w of uiDates) {
    try {
      const r = await uiSearchOnce(w.checkIn, w.checkOut, w.label);
      uiDateRuns.push(r);
      console.log(
        `[ui-date] ${w.label} match=${r.totalMatch} apiHotels=${r.maxHotelsFromApi} union=${r.unionHotelCodes} err=${r.validationError} paths=${r.hotelApiPaths.length}`,
      );
      if (r.topApis?.length) {
        for (const a of r.topApis.slice(0, 5)) {
          console.log(`    api ${a.method} ${a.status} ${a.path} hotels=${a.hotelCount}`);
        }
      }
    } catch (e) {
      uiDateRuns.push({ label: w.label, error: String(e.message || e) });
      console.warn(`[ui-date] fail ${w.label}`, e.message || e);
    }
  }
}

// UI multi-date union
const uiUnion = new Set();
for (const r of uiDateRuns) {
  for (const c of r.sampleCodes || []) uiUnion.add(c);
  // also re-scan netHits for all hotel codes from UI period
}
// full net union of hotel codes
const netUnion = new Set();
for (const h of netHits) {
  for (const c of h.hotelCodesFound || []) netUnion.add(c);
}

// load current list size
let currentListCount = null;
let currentListCodes = new Set();
try {
  const folders = await fs.readdir(path.join(pipe.dataRoot, "01-destination-lists"));
  const folder = folders.find((n) => n.startsWith(`${dest}-`));
  if (folder) {
    const listPath = path.join(pipe.dataRoot, "01-destination-lists", folder, "hotel-list.jsonl");
    const raw = await fs.readFile(listPath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    currentListCount = lines.length;
    for (const line of lines) {
      try {
        currentListCodes.add(String(JSON.parse(line).hotelCode));
      } catch {
        /* ignore */
      }
    }
  }
} catch {
  /* ignore */
}

const maxFts = Math.max(...ftsResults.map((x) => x.destMatch || 0), 0);
const maxFtsTotal = Math.max(...ftsResults.map((x) => x.total || 0), 0);
const maxDateApi = Math.max(...multiDate.map((x) => x.hotelCount || 0), 0);
const maxUi = Math.max(...uiDateRuns.map((x) => x.maxHotelsFromApi || 0), 0);
const maxUiDom = Math.max(
  ...uiDateRuns.flatMap((r) => (r.domCount || []).map((d) => d.n || 0)),
  0,
);

// codes only in multi-date / ui but not in current list
const onlyInMultiDate = [...multiDateUnion].filter((c) => !currentListCodes.has(c));
const onlyInUi = [...netUnion].filter((c) => !currentListCodes.has(c));
const onlyInFtsUnion = [...ftsUnionCodes].filter((c) => !currentListCodes.has(c));

const conclusionHints = [];
conclusionHints.push(
  `FTS 单次最大 destMatch=${maxFts}，多关键词并集=${ftsUnionCodes.size}，当前清单=${currentListCount ?? "?"}（FTS 不带入住日期，清单缺口主因是关键词召回/size 上限，不是查价日期）`,
);
conclusionHints.push(
  `可售 API path 200 命中=${hits200.length + spaHits200.length}；多日期 API hotelCount 最大=${maxDateApi}，并集=${multiDateUnion.size}`,
);
if (multiDate.length >= 2) {
  const counts = multiDate.map((x) => x.hotelCount);
  const minC = Math.min(...counts);
  const maxC = Math.max(...counts);
  conclusionHints.push(
    `多日期酒店数范围 ${minC}–${maxC}：${maxC - minC > 50 ? "日期显著影响可售酒店集合，价格日历需多日期/并集" : maxC === 0 ? "响应未解析到酒店或路径仍未真正命中" : "日期对酒店数量影响有限"}`,
  );
}
if (uiDateRuns.length) {
  conclusionHints.push(
    `UI 多日期: maxApiHotels=${maxUi}, maxDomCount=${maxUiDom}, netUnion=${netUnion.size}, 相对清单新增候选=${onlyInUi.length}`,
  );
  const uiMatches = uiDateRuns
    .filter((r) => r.totalMatch || (r.domCount && r.domCount.length))
    .map((r) => `${r.label}:${r.totalMatch || (r.domCount || []).map((d) => d.snip).join("/")}`);
  if (uiMatches.length) conclusionHints.push(`UI 文案: ${uiMatches.join(", ")}`);
}
if (hits200.length + spaHits200.length === 0 && maxUi === 0) {
  conclusionHints.push(
    "查价 API 与 UI 均未拿到可售酒店列表：多日期扩清单实验尚未真正跑通，下一步优先修 UI 目的地选择/抓包",
  );
}

const summary = {
  runId,
  dest,
  destName,
  at: new Date().toISOString(),
  currentListCount,
  ftsUnionSize: ftsUnionCodes.size,
  ftsUnionByQuery: Object.fromEntries(
    Object.entries(ftsUnionByQuery).map(([k, v]) => [k, v.size]),
  ),
  multiDateUnionSize: multiDateUnion.size,
  netUnionSize: netUnion.size,
  onlyInFtsUnionCount: onlyInFtsUnion.length,
  onlyInMultiDateCount: onlyInMultiDate.length,
  onlyInUiOrNetCount: onlyInUi.length,
  onlyInMultiDateSample: onlyInMultiDate.slice(0, 30),
  onlyInUiSample: onlyInUi.slice(0, 30),
  conclusionHints,
  ftsResults: ftsResults.filter((x) => [100, 500, 1000, 2000].includes(x.size)),
  destMeta: destMeta.filter((x) => x.status !== 404 || x.textLen > 0).slice(0, 20),
  pathProbe: {
    tried: pathProbe.length,
    status200: hits200.length,
    interesting: interestingStatus.slice(0, 40),
    hits200: hits200.slice(0, 20),
  },
  spaPaths: spaPaths.slice(0, 80),
  spaProbeHits: spaHits200.slice(0, 20),
  multiDateApi: multiDate,
  uiDateRuns,
  netInteresting: netHits
    .filter((h) => h.hotelCount > 0 || /avail|hotel|search/i.test(h.url))
    .map((h) => ({
      method: h.method,
      status: h.status,
      url: h.url,
      hotelCount: h.hotelCount,
      post: h.post?.slice(0, 500),
      preview: h.preview?.slice(0, 400),
    }))
    .slice(0, 100),
};

const outFile = path.join(outDir, `${runId}.json`);
await fs.writeFile(outFile, `${JSON.stringify(summary, null, 2)}\n`);
await fs.writeFile(
  path.join(outDir, "inventory-coverage-latest.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      outFile,
      currentListCount,
      ftsUnionSize: ftsUnionCodes.size,
      maxFtsDestMatch: maxFts,
      maxFtsTotal,
      availPathHits: hits200.length,
      spaPathHits: spaHits200.length,
      maxDateApiHotels: maxDateApi,
      multiDateUnionSize: multiDateUnion.size,
      maxUiApiHotels: maxUi,
      maxUiDom,
      netUnionSize: netUnion.size,
      onlyInMultiDateCount: onlyInMultiDate.length,
      onlyInUiOrNetCount: onlyInUi.length,
      conclusionHints,
      multiDateSummary: multiDate.map((d) => ({
        label: d.label,
        checkIn: d.checkIn,
        hotels: d.hotelCount,
        status: d.status,
      })),
      uiDateRuns: uiDateRuns.map((r) => ({
        label: r.label,
        totalMatch: r.totalMatch,
        maxHotelsFromApi: r.maxHotelsFromApi,
        unionHotelCodes: r.unionHotelCodes,
        validationError: r.validationError,
        paths: r.hotelApiPaths,
        topApis: r.topApis?.slice(0, 5),
      })),
    },
    null,
    2,
  ),
);

await page.close().catch(() => {});
process.exit(0);
