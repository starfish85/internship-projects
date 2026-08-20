/**
 * Zone-based image backfill (resumable).
 * 2.0/hotels/list does not paginate, but zoneCode returns different top-20 sets with urlImage.
 *
 * Usage:
 *   node scripts/pipeline/phase2b-zone-image-backfill.mjs
 *   node scripts/pipeline/phase2b-zone-image-backfill.mjs --applyOnly=true   # only apply saved map
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import {
  ensureSession,
  ensureFreshToken,
  injectXhrHelpers,
  readDarwinToken,
} from "../../lib/api-client.mjs";
import { evaluateContentQuality, stripHtml } from "../../lib/content-quality.mjs";
import { loadPipelineConfig } from "../../lib/disk-guard.mjs";
import { loadConfig } from "../../lib/paths.mjs";

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    const m = item.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function cleanImageRel(u) {
  if (!u) return null;
  return String(u).split("?")[0].replace(/^\//, "");
}
function imageUrls(rel) {
  return [
    `https://photos.hotelbeds.com/giata/bigger/${rel}`,
    `https://photos.hotelbeds.com/giata/${rel}`,
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
function ymdPlus(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const args = parseArgs(process.argv.slice(2));
const applyOnly = args.applyOnly === "true";
const pipe = await loadPipelineConfig();
const siteConfig = await loadConfig();
const productsRoot = path.join(pipe.dataRoot, "02-hotel-products");
const stateDir = path.join(pipe.dataRoot, "00-state", "content-quality");
await fs.mkdir(stateDir, { recursive: true });
const mapFile = path.join(stateDir, "zone-image-map.json");
const doneFile = path.join(stateDir, "zone-image-dests-done.json");
const delayMs = Number(args.delayMs || 450);
const checkIn = ymdPlus(12);
const checkOut = ymdPlus(13);

// load map + done dests
let imageMap = {};
let doneDests = new Set();
try {
  imageMap = JSON.parse(await fs.readFile(mapFile, "utf8"));
} catch {
  imageMap = {};
}
try {
  doneDests = new Set(JSON.parse(await fs.readFile(doneFile, "utf8")));
} catch {
  doneDests = new Set();
}

// build dest zones
const destZones = new Map();
const needImage = [];
for (const dest of await fs.readdir(productsRoot)) {
  if (dest.startsWith(".")) continue;
  const destDir = path.join(productsRoot, dest);
  let st;
  try {
    st = await fs.stat(destDir);
  } catch {
    continue;
  }
  if (!st.isDirectory()) continue;
  const zones = new Set([null]);
  for (const hotelCode of await fs.readdir(destDir)) {
    if (hotelCode.startsWith("_") || hotelCode.startsWith(".")) continue;
    const hotelDir = path.join(destDir, hotelCode);
    const pj = path.join(hotelDir, "product.json");
    let o;
    try {
      o = JSON.parse(await fs.readFile(pj, "utf8"));
    } catch {
      continue;
    }
    if (o.zoneCode != null) zones.add(String(o.zoneCode));
    const miss = new Set(o.contentMissing || []);
    if (o.contentStatus === "partial" && (miss.has("image") || !(o.imageCount > 0))) {
      needImage.push({ dest, hotelCode, hotelDir, pj });
    }
  }
  destZones.set(dest, zones);
}
console.log(
  `[zone-backfill] dests=${destZones.size} done=${doneDests.size} needImage=${needImage.length} map=${Object.keys(imageMap).length} applyOnly=${applyOnly}`,
);

if (!applyOnly) {
  const browser = await chromium
    .connectOverCDP(`http://127.0.0.1:${siteConfig.chrome.remoteDebuggingPort}`, { timeout: 8000 })
    .catch(() => null);
  if (!browser) {
    console.error("CDP unavailable — use --applyOnly=true if map exists");
    process.exit(2);
  }
  const context = browser.contexts()[0];
  let page =
    context.pages().find((p) => /gta-travel|bedsonline/.test(p.url()) && !p.isClosed()) ||
    (await context.newPage());

  async function softSession() {
    try {
      if (page.isClosed()) {
        page = context.pages().find((p) => !p.isClosed()) || (await context.newPage());
      }
      // Prefer existing localStorage token — never spam login page
      const meta = await readDarwinToken(page);
      if (meta.token && !meta.expired && (meta.expInSec == null || meta.expInSec > 120)) {
        return true;
      }
      // only refresh when truly missing/expired; skipIfToken avoids goto when possible
      await ensureFreshToken(page, siteConfig.site, { minRemainingSec: 5 * 60, forceNavigate: false });
      return true;
    } catch (e) {
      try {
        page = context.pages().find((p) => !p.isClosed()) || (await context.newPage());
        await ensureSession(page, siteConfig.site, { skipIfToken: true });
        return true;
      } catch (e2) {
        console.warn(`[session] soft fail: ${e2.message || e2}`);
        return false;
      }
    }
  }

  await softSession();

  async function listZone(destCode, zoneCode) {
    return page.evaluate(
      async ({ helpers, destCode, zoneCode, checkIn, checkOut }) => {
        eval(helpers);
        const token = __hbxCleanToken();
        const body = {
          destinationCode: destCode,
          stay: { checkIn, checkOut },
          occupancies: [{ rooms: 1, adults: 2, children: 0 }],
          from: 1,
          to: 20,
        };
        if (zoneCode != null && zoneCode !== "null") {
          body.zoneCode = Number.isNaN(Number(zoneCode)) ? zoneCode : Number(zoneCode);
        }
        return __hbxXhrPost(
          "https://webapi.gta-travel.cn/client-hotel-avail-api/2.0/hotels/list?locale=zh",
          token,
          body,
        );
      },
      { helpers: injectXhrHelpers(), destCode, zoneCode, checkIn, checkOut },
    );
  }

  let destI = 0;
  let calls = 0;
  for (const [dest, zones] of destZones) {
    destI += 1;
    if (doneDests.has(dest)) continue;
    const limited = [...zones].slice(0, 35);
    for (const z of limited) {
      await softSession();
      let res;
      try {
        res = await listZone(dest, z);
      } catch (e) {
        console.warn(`[list] ${dest} zone=${z} ${e.message || e}`);
        await softSession();
        await sleep(delayMs * 2);
        continue;
      }
      calls += 1;
      if (res.status === 401 || res.status === 403) {
        await softSession();
        try {
          res = await listZone(dest, z);
          calls += 1;
        } catch {
          continue;
        }
      }
      if (res.status !== 200) {
        await sleep(delayMs);
        continue;
      }
      for (const h of res.json?.hotels || []) {
        const code = String(h.code ?? h.hotelDetail?.code ?? "");
        const rel = cleanImageRel(h.hotelDetail?.urlImage || h.urlImage);
        if (code && rel) imageMap[code] = rel;
      }
      await sleep(delayMs);
    }
    doneDests.add(dest);
    // persist every dest
    await fs.writeFile(mapFile, JSON.stringify(imageMap));
    await fs.writeFile(doneFile, JSON.stringify([...doneDests]));
    if (destI % 15 === 0 || destI === destZones.size) {
      console.log(
        `[progress] dests=${destI}/${destZones.size} doneSet=${doneDests.size} map=${Object.keys(imageMap).length} calls=${calls}`,
      );
    }
  }
  console.log(`[list] done map=${Object.keys(imageMap).length} doneDests=${doneDests.size}`);
}

// apply map to products
let matched = 0;
let downloaded = 0;
let promoted = 0;
const promoteSample = [];
for (const item of needImage) {
  const rel = imageMap[item.hotelCode];
  if (!rel) continue;
  matched += 1;
  let product;
  try {
    product = JSON.parse(await fs.readFile(item.pj, "utf8"));
  } catch {
    continue;
  }
  product.urlImageRel = rel;
  product.urlImage = `https://photos.hotelbeds.com/giata/${rel}`;
  product.urlImageBigger = `https://photos.hotelbeds.com/giata/bigger/${rel}`;
  product.imageSource = "2.0/list zone-backfill";
  const imagesDir = path.join(item.hotelDir, "images");
  await fs.mkdir(imagesDir, { recursive: true });
  const ext = path.extname(rel) || ".jpg";
  const imgPath = path.join(imagesDir, `main${ext}`);
  let already = false;
  try {
    already = (await fs.stat(imgPath)).size > 500;
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
      product.imageLocalStatus = "ok_zone_backfill";
      downloaded += 1;
    } else {
      product.imageLocalStatus = "download_failed_zone_backfill";
    }
  }
  if (product.descriptionZh) product.descriptionZh = stripHtml(product.descriptionZh);
  if (product.descriptionEn) product.descriptionEn = stripHtml(product.descriptionEn);
  const q = evaluateContentQuality(product, { hasLocalImageFiles: (product.imageCount || 0) > 0 });
  const prev = product.contentStatus;
  product.contentStatus = q.contentStatus;
  product.contentMissing = q.contentMissing;
  product.contentChecks = q.checks;
  product.hasClientIntro = q.hasClientIntro;
  product.contentUpdatedAt = new Date().toISOString();
  if (prev !== "complete" && q.contentStatus === "complete") {
    promoted += 1;
    if (promoteSample.length < 20) promoteSample.push(`${item.dest}/${item.hotelCode}`);
  }
  const tmp = item.pj + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(product, null, 2) + "\n");
  await fs.rename(tmp, item.pj);
}

const out = {
  ok: true,
  mapSize: Object.keys(imageMap).length,
  doneDests: doneDests.size,
  needImage: needImage.length,
  matched,
  downloaded,
  promoted,
  promoteSample,
  at: new Date().toISOString(),
};
await fs.writeFile(path.join(stateDir, "zone-image-backfill-latest.json"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
