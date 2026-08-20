/**
 * Backfill hotel images from 2.0/hotels/list (often has urlImage when detail does not).
 * Then re-evaluate content quality — may promote partial → complete when only image was missing.
 *
 * Usage:
 *   node scripts/pipeline/phase2b-image-backfill-from-list.mjs --dest=PEK,PVG
 *   node scripts/pipeline/phase2b-image-backfill-from-list.mjs --dest=ALL --delayMs=800
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { ensureSession, ensureFreshToken, injectXhrHelpers, readDarwinToken } from "../../lib/api-client.mjs";
import {
  evaluateContentQuality,
  stripHtml,
} from "../../lib/content-quality.mjs";
import { guardDisk, loadPipelineConfig } from "../../lib/disk-guard.mjs";
import { loadConfig } from "../../lib/paths.mjs";

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    const m = item.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cleanImageRel(urlImage) {
  if (!urlImage) return null;
  return String(urlImage).split("?")[0].replace(/^\//, "");
}

function imageUrls(rel) {
  if (!rel) return [];
  return [
    `https://photos.hotelbeds.com/giata/bigger/${rel}`,
    `https://photos.hotelbeds.com/giata/${rel}`,
    `https://photos.hotelbeds.com/giata/original/${rel}`,
    `https://photos.bedsonline.com/giata/bigger/${rel}`,
    `https://photos.bedsonline.com/giata/${rel}`,
  ];
}

async function downloadImage(urls, destPath) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 500) continue;
      await fs.writeFile(destPath, buf);
      return { ok: true, url, bytes: buf.length };
    } catch {
      /* next */
    }
  }
  return { ok: false };
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}

const args = parseArgs(process.argv.slice(2));
const pipe = await loadPipelineConfig();
const siteConfig = await loadConfig();
const dataRoot = pipe.dataRoot;
const productsRoot = path.join(dataRoot, "02-hotel-products");
const stateDir = path.join(dataRoot, "00-state");
const delayMs = Number(args.delayMs || 800);
const pageSize = Math.min(100, Number(args.pageSize || 50));
const destFilter = args.dest
  ? String(args.dest)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

const allCodes = (await fs.readFile(path.join(stateDir, "all-dest-codes.txt"), "utf8"))
  .trim()
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const dests = destFilter?.includes("ALL") || !destFilter ? allCodes : destFilter;

const gate0 = await guardDisk(pipe, { forceCheck: true, writeCounter: { n: 0 } });
if (!gate0.allow) {
  console.error(JSON.stringify({ ok: false, paused: true, reason: gate0.reason }));
  process.exit(3);
}

const browser = await chromium
  .connectOverCDP(`http://127.0.0.1:${siteConfig.chrome.remoteDebuggingPort}`, { timeout: 8000 })
  .catch(() => null);
if (!browser) {
  console.error("CDP unavailable");
  process.exit(2);
}
const context = browser.contexts()[0];
let page =
  context.pages().find((p) => /gta-travel|bedsonline/.test(p.url()) && !p.isClosed()) ||
  (await context.newPage());

let session = await ensureSession(page, siteConfig.site);
if (!session.ok) {
  page = await context.newPage();
  session = await ensureSession(page, siteConfig.site);
}
if (!session.ok) {
  console.error("login_failed");
  process.exit(2);
}
if (!/\/main/.test(page.url())) {
  await page.goto(siteConfig.site.mainUrl, { waitUntil: "domcontentloaded", timeout: 120000 }).catch(() => {});
  await sleep(1500);
}

const checkIn = addDays(7);
const checkOut = addDays(8);
console.log(
  `[image-backfill] dests=${dests.length} pageSize=${pageSize} delayMs=${delayMs} stay=${checkIn}/${checkOut}`,
);

const imageMap = new Map(); // code -> urlImage rel
let listPages = 0;
let listHotels = 0;

async function fetchListPage(destCode, from, to) {
  return page.evaluate(
    async ({ helpers, destCode, from, to, checkIn, checkOut }) => {
      eval(helpers);
      const token = __hbxCleanToken();
      // 2.0 list pagination uses from/to (1-based inclusive range)
      return __hbxXhrPost("https://webapi.gta-travel.cn/client-hotel-avail-api/2.0/hotels/list?locale=zh", token, {
        destinationCode: destCode,
        stay: { checkIn, checkOut },
        occupancies: [{ rooms: 1, adults: 2, children: 0 }],
        from,
        to,
      });
    },
    { helpers: injectXhrHelpers(), destCode, from, to, checkIn, checkOut },
  );
}

for (const dest of dests) {
  let from = 1;
  const step = pageSize; // typically 20
  let totalHotels = null;
  let emptyStreak = 0;
  let destNew = 0;
  const seenDest = new Set();
  console.log(`[list] ${dest} start`);
  while (true) {
    const to = from + step - 1;
    // token touch
    try {
      const meta = await readDarwinToken(page);
      if (!meta.token || meta.expired || (meta.expInSec != null && meta.expInSec < 15 * 60)) {
        await ensureFreshToken(page, siteConfig.site, { minRemainingSec: 15 * 60 });
      }
    } catch {
      await ensureFreshToken(page, siteConfig.site, { minRemainingSec: 15 * 60 }).catch(() => {});
    }

    let res;
    try {
      res = await fetchListPage(dest, from, to);
    } catch (e) {
      console.warn(`[list] ${dest} from=${from} evaluate fail: ${e.message || e}`);
      page = context.pages().find((p) => !p.isClosed()) || (await context.newPage());
      await ensureSession(page, siteConfig.site);
      await sleep(delayMs * 2);
      emptyStreak += 1;
      if (emptyStreak >= 5) break;
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      await ensureFreshToken(page, siteConfig.site, { minRemainingSec: 15 * 60 });
      res = await fetchListPage(dest, from, to);
    }
    if (res.status !== 200) {
      console.warn(`[list] ${dest} from=${from} HTTP ${res.status}`);
      emptyStreak += 1;
      if (emptyStreak >= 3) break;
      await sleep(delayMs * 2);
      from += step;
      continue;
    }
    emptyStreak = 0;
    const hotels = res.json?.hotels || [];
    totalHotels = res.json?.totalHotels ?? totalHotels;
    listPages += 1;
    listHotels += hotels.length;
    let pageNew = 0;
    for (const h of hotels) {
      const code = String(h.code ?? h.hotelDetail?.code ?? "");
      const rel = cleanImageRel(h.hotelDetail?.urlImage || h.urlImage);
      if (!code) continue;
      if (!seenDest.has(code)) {
        seenDest.add(code);
        pageNew += 1;
        destNew += 1;
      }
      if (rel) imageMap.set(code, rel);
    }
    console.log(
      `[list] ${dest} from=${from}-${to} got=${hotels.length} new=${pageNew} destSeen=${seenDest.size} map=${imageMap.size} totalHotels=${totalHotels ?? "?"}`,
    );
    if (!hotels.length) break;
    // no new hotel codes → pagination stuck or end
    if (pageNew === 0) break;
    if (totalHotels != null && seenDest.size >= totalHotels) break;
    from += step;
    // safety cap
    if (from > 5000) break;
    await sleep(delayMs);
  }
  console.log(`[list] ${dest} done seen=${seenDest.size} newWithImg≈${destNew}`);
  await sleep(Math.min(delayMs, 500));
}

console.log(`[list] done pages=${listPages} hotelsSeen=${listHotels} uniqueWithImage=${imageMap.size}`);

// apply to products missing image
let scanned = 0;
let needed = 0;
let matched = 0;
let downloaded = 0;
let promoted = 0;
const promoteSample = [];

const destDirs = await fs.readdir(productsRoot);
for (const dest of destDirs) {
  if (dest.startsWith(".")) continue;
  if (destFilter && !destFilter.includes("ALL") && !destFilter.includes(dest)) continue;
  const destDir = path.join(productsRoot, dest);
  let st;
  try {
    st = await fs.stat(destDir);
  } catch {
    continue;
  }
  if (!st.isDirectory()) continue;
  const hotels = await fs.readdir(destDir);
  for (const hotelCode of hotels) {
    if (hotelCode.startsWith("_") || hotelCode.startsWith(".")) continue;
    const hotelDir = path.join(destDir, hotelCode);
    const pj = path.join(hotelDir, "product.json");
    let product;
    try {
      product = JSON.parse(await fs.readFile(pj, "utf8"));
    } catch {
      continue;
    }
    scanned += 1;
    const miss = new Set(product.contentMissing || []);
    const needsImage =
      product.contentStatus === "partial" &&
      (miss.has("image") || !(product.imageCount > 0) || !(product.imagePaths || []).length);
    if (!needsImage) continue;
    needed += 1;
    const rel = imageMap.get(String(hotelCode)) || cleanImageRel(product.urlImageRel || product.detailZh?.urlImage);
    if (!rel) continue;
    matched += 1;

    product.urlImageRel = rel;
    product.urlImage = `https://photos.hotelbeds.com/giata/${rel}`;
    product.urlImageBigger = `https://photos.hotelbeds.com/giata/bigger/${rel}`;
    product.imageSource = "2.0/hotels/list-backfill";

    const imagesDir = path.join(hotelDir, "images");
    await fs.mkdir(imagesDir, { recursive: true });
    const ext = path.extname(rel) || ".jpg";
    const imgPath = path.join(imagesDir, `main${ext}`);
    let already = false;
    try {
      const s = await fs.stat(imgPath);
      already = s.size > 500;
    } catch {
      already = false;
    }
    if (already) {
      product.imageCount = 1;
      product.imagePaths = [`images/main${ext}`];
      product.imageLocalStatus = "ok_existing";
    } else {
      const dl = await downloadImage(imageUrls(rel), imgPath);
      if (dl.ok) {
        product.imageCount = 1;
        product.imagePaths = [`images/main${ext}`];
        product.imageDownloadedFrom = dl.url;
        product.imageBytes = dl.bytes;
        product.imageLocalStatus = "ok_list_backfill";
        downloaded += 1;
      } else {
        product.imageLocalStatus = "download_failed_list_backfill";
      }
    }

    if (product.descriptionZh) product.descriptionZh = stripHtml(product.descriptionZh);
    if (product.descriptionEn) product.descriptionEn = stripHtml(product.descriptionEn);

    const q = evaluateContentQuality(product, {
      hasLocalImageFiles: (product.imageCount || 0) > 0,
    });
    const prev = product.contentStatus;
    product.contentStatus = q.contentStatus;
    product.contentMissing = q.contentMissing;
    product.contentChecks = q.checks;
    product.hasClientIntro = q.hasClientIntro;
    product.languageFallback = q.languageFallback;
    product.contentUpdatedAt = new Date().toISOString();
    if (prev !== "complete" && q.contentStatus === "complete") {
      promoted += 1;
      if (promoteSample.length < 20) promoteSample.push(`${dest}/${hotelCode}`);
    }

    const tmp = pj + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(product, null, 2) + "\n");
    await fs.rename(tmp, pj);
  }
}

const out = {
  ok: true,
  listPages,
  listHotels,
  uniqueWithImage: imageMap.size,
  scanned,
  productsNeedingImage: needed,
  matchedFromList: matched,
  downloaded,
  promoted,
  promoteSample,
  at: new Date().toISOString(),
};
await fs.mkdir(path.join(stateDir, "content-quality"), { recursive: true });
await fs.writeFile(
  path.join(stateDir, "content-quality", "image-backfill-latest.json"),
  JSON.stringify(out, null, 2) + "\n",
);
console.log(JSON.stringify(out, null, 2));
