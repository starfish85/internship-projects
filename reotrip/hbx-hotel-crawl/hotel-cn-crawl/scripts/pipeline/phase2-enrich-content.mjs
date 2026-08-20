/**
 * Phase 2b: Enrich hotel products with full bilingual detail from
 *   POST /client-content-api/1.0/hotels/detail?detailLevel=LOCATION { hotelCodes }
 *
 * CRITICAL: default detail (no detailLevel) omits hotel intro body.
 * Only detailLevel=LOCATION returns description (zh/en) + terminals.
 * segments[].description is category tags (商务酒店), NOT hotel intro — do not use as copy.
 *
 * + download primary image from photos.hotelbeds.com/giata
 *
 * Usage:
 *   node scripts/pipeline/phase2-enrich-content.mjs --dest=PEK --limit=50
 *   node scripts/pipeline/phase2-enrich-content.mjs --dest=PEK,PVG,CN1,SZX --batchSize=20
 *   node scripts/pipeline/phase2-enrich-content.mjs --dest=PEK --force=true
 *   node scripts/pipeline/phase2-enrich-content.mjs --dest=ALL --upgradeDesc=true   # re-fetch missing intros
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { ensureSession, ensureFreshToken, parseDarwinTokenMeta, readDarwinToken } from "../../lib/api-client.mjs";
import { appendProgress, loadCheckpoint, saveCheckpoint } from "../../lib/checkpoint.mjs";
import {
  buildFieldProvenance,
  evaluateContentQuality,
  isValidEnField,
  isValidZhField,
  realDescription,
  stripHtml,
} from "../../lib/content-quality.mjs";
import { guardDisk, loadPipelineConfig } from "../../lib/disk-guard.mjs";
import { loadConfig, resolveFromRoot } from "../../lib/paths.mjs";

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    const m = item.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (item.startsWith("--")) args[item.slice(2)] = true;
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
    `https://cdn.hotelbeds.com/giata/${rel}`,
  ];
}

function phoneByType(phones, type) {
  if (!Array.isArray(phones)) return null;
  const hit = phones.find((p) => p?.type === type);
  return hit?.number || null;
}

function amenityNames(list) {
  if (!Array.isArray(list)) return [];
  return list.map((a) => a?.name).filter(Boolean);
}

function amenityCodes(list) {
  if (!Array.isArray(list)) return [];
  return list.map((a) => a?.code).filter((c) => c != null);
}

function segmentList(list, key = "description") {
  if (!Array.isArray(list)) return [];
  return list.map((s) => s?.[key] || s?.name).filter(Boolean);
}

function hasClientIntro(product, minLen = 40) {
  return !!(realDescription(product?.descriptionZh, minLen) && realDescription(product?.descriptionEn, minLen));
}

/**
 * Pick best street for locale: prefer field that matches language expectations.
 */
function pickAddress(primary, secondary, wantZh) {
  const candidates = [primary?.streetName, primary?.street, secondary?.streetName, secondary?.street, primary?.secondaryLocaleStreetName, secondary?.secondaryLocaleStreetName]
    .filter(Boolean)
    .map((s) => String(s).trim());
  if (wantZh) {
    const hit = candidates.find((s) => isValidZhField(s));
    return hit || candidates[0] || null;
  }
  const hit = candidates.find((s) => isValidEnField(s) && !isValidZhField(s));
  if (hit) return hit;
  const anyEn = candidates.find((s) => isValidEnField(s));
  return anyEn || candidates[0] || null;
}

function pickCity(primary, secondary, wantZh) {
  const candidates = [primary?.city, secondary?.city, primary?.secondaryLocaleCity, secondary?.secondaryLocaleCity].filter(Boolean);
  if (wantZh) return candidates.find((s) => isValidZhField(s)) || candidates[0] || null;
  return candidates.find((s) => isValidEnField(s)) || candidates[0] || null;
}

/** Merge zh/en detail + list row into a full product record (strict contentStatus). */
function buildProduct(listRow, zh, en, destCode) {
  const code = String(zh?.code ?? en?.code ?? listRow.hotelCode);
  const zLoc = zh?.location || {};
  const eLoc = en?.location || {};
  const zAddr = zh?.contact?.address || {};
  const eAddr = en?.contact?.address || {};
  const phones = zh?.contact?.phones || en?.contact?.phones || [];
  const imgRel = cleanImageRel(zh?.urlImage || en?.urlImage);
  const capturedAt = new Date().toISOString();

  // Hotel intro — only when detailLevel=LOCATION; never segments/notes
  const descriptionZh = stripHtml(zh?.description) || null;
  const descriptionEn = stripHtml(en?.description) || null;

  const rawLat = zLoc?.coordinates?.latitude ?? eLoc?.coordinates?.latitude ?? null;
  const rawLng = zLoc?.coordinates?.longitude ?? eLoc?.coordinates?.longitude ?? null;

  const amenitiesZh = amenityNames(zh?.amenities);
  const amenitiesEn = amenityNames(en?.amenities);

  const draft = {
    hotelCode: code,
    productCode: code,
    hotelbedsCode: code,
    categoryCode: zh?.category?.code || en?.category?.code || null,
    categorySimpleCode: zh?.category?.simpleCode ?? en?.category?.simpleCode ?? null,
    categoryGroupCode: zh?.category?.categoryGroup?.code || en?.category?.categoryGroup?.code || null,
    chainCode: zh?.chain?.code || en?.chain?.code || null,
    accommodationTypeCode: zh?.accommodationType?.code || en?.accommodationType?.code || null,
    destinationCode: zLoc?.destination?.code || eLoc?.destination?.code || destCode || listRow.destinationId || null,
    zoneCode: zLoc?.zone?.code ?? eLoc?.zone?.code ?? null,
    countryCode: zLoc?.country?.code || eLoc?.country?.code || listRow.countryId || "CN",
    countryIsoCode: zLoc?.country?.isoCode || eLoc?.country?.isoCode || "CN",
    amenityCodes: amenityCodes(zh?.amenities || en?.amenities),
    segmentCodes: (zh?.segments || en?.segments || []).map((s) => s?.code).filter((c) => c != null),

    nameZh: zh?.name || listRow.nameZh || null,
    nameEn: en?.name || listRow.nameEn || null,

    descriptionZh: descriptionZh || null,
    descriptionEn: descriptionEn || null,

    categoryZh: zh?.category?.name || null,
    categoryEn: en?.category?.name || null,
    categoryGroupZh: zh?.category?.categoryGroup?.name || null,
    categoryGroupEn: en?.category?.categoryGroup?.name || null,
    stars: zh?.category?.simpleCode ?? en?.category?.simpleCode ?? null,
    halfStar: zh?.category?.halfStar ?? en?.category?.halfStar ?? null,
    chainZh: zh?.chain?.name || null,
    chainEn: en?.chain?.name || null,
    accommodationTypeZh: zh?.accommodationType?.name || null,
    accommodationTypeEn: en?.accommodationType?.name || null,

    countryId: zLoc?.country?.code || listRow.countryId || "CN",
    countryZh: zLoc?.country?.name || null,
    countryEn: eLoc?.country?.name || null,
    destinationId: zLoc?.destination?.code || destCode || listRow.destinationId || null,
    destinationZh: zLoc?.destination?.name || listRow.destinationZh || null,
    destinationEn: eLoc?.destination?.name || listRow.destinationEn || null,
    zoneId: listRow.zoneId || (zLoc?.zone?.code != null ? `${destCode || "XX"}-${zLoc.zone.code}` : null),
    zoneZh: zLoc?.zone?.name || listRow.zoneZh || null,
    zoneEn: eLoc?.zone?.name || listRow.zoneEn || null,
    latitude: rawLat,
    longitude: rawLng,

    addressZh: pickAddress(zAddr, eAddr, true),
    addressEn: pickAddress(eAddr, zAddr, false),
    cityZh: pickCity(zAddr, eAddr, true),
    cityEn: pickCity(eAddr, zAddr, false),
    postalCode: zAddr.postalCode || eAddr.postalCode || null,
    phone: phoneByType(phones, "PHONEHOTEL") || phoneByType(phones, "PHONEBOOKING") || phones[0]?.number || null,
    phoneBooking: phoneByType(phones, "PHONEBOOKING"),
    phoneHotel: phoneByType(phones, "PHONEHOTEL"),
    fax: phoneByType(phones, "FAXNUMBER"),
    phones,

    amenitiesZh,
    amenitiesEn,
    facilities: amenitiesZh.length ? amenitiesZh : amenitiesEn,
    facilitiesZh: amenitiesZh,
    facilitiesEn: amenitiesEn,
    segmentsZh: segmentList(zh?.segments),
    segmentsEn: segmentList(en?.segments),
    terminalsZh: Array.isArray(zh?.terminals) ? zh.terminals : [],
    terminalsEn: Array.isArray(en?.terminals) ? en.terminals : [],

    exclusiveDeal: zh?.exclusiveDeal ?? en?.exclusiveDeal ?? null,
    vacationRental: zh?.vacationRental ?? en?.vacationRental ?? null,
    top: zh?.top ?? en?.top ?? null,
    sustainable: zh?.sustainable ?? en?.sustainable ?? null,
    deposit: zh?.deposit ?? en?.deposit ?? null,
    luxuryCollection: zh?.luxuryCollection ?? en?.luxuryCollection ?? null,
    mostPopular: zh?.mostPopular ?? en?.mostPopular ?? null,

    urlImageRel: imgRel,
    urlImage: imgRel ? `https://photos.hotelbeds.com/giata/${imgRel}` : null,
    urlImageBigger: imgRel ? `https://photos.hotelbeds.com/giata/bigger/${imgRel}` : null,
    imageCount: 0,
    imagePaths: [],
    imageLocalStatus: imgRel ? "pending_download" : "no_source_url",

    detailZh: zh || null,
    detailEn: en || null,

    listSource: listRow,
    weight: listRow.weight ?? null,
    source: "phase2-enrich-detail-zh-en-LOCATION",
    detailLevel: "LOCATION",
    apiPath: "/client-content-api/1.0/hotels/detail?detailLevel=LOCATION",
    capturedAt,
    contentUpdatedAt: capturedAt,
    // pipeline only — never customer copy
    notes:
      "pipeline provenance only; descriptionZh/En from hotel.description; never display notes to customers",
  };

  const q = evaluateContentQuality(draft);
  draft.latitude = q.latitude;
  draft.longitude = q.longitude;
  draft.coordinateFix = q.coordinateFix;
  draft.contentStatus = !(zh || en) ? "failed" : q.contentStatus;
  draft.contentMissing = q.contentMissing;
  draft.languageFallback = q.languageFallback;
  draft.hasClientIntro = q.hasClientIntro;
  draft.contentChecks = q.checks;
  draft.fieldProvenance = buildFieldProvenance(
    {
      nameZh: { path: "detailZh.name", locale: "zh" },
      nameEn: { path: "detailEn.name", locale: "en" },
      addressZh: { path: "detailZh.contact.address", locale: "zh" },
      addressEn: { path: "detailEn.contact.address|secondaryLocale", locale: "en" },
      descriptionZh: { path: "detailZh.description", locale: "zh", minLen: 40 },
      descriptionEn: { path: "detailEn.description", locale: "en", minLen: 40 },
      amenitiesZh: { path: "detailZh.amenities[].name", locale: "zh" },
      amenitiesEn: { path: "detailEn.amenities[].name", locale: "en" },
      phone: { path: "detail.contact.phones" },
      coordinates: { path: "detail.location.coordinates", fix: q.coordinateFix },
      urlImage: { path: "detail.urlImage", cdn: "photos.hotelbeds.com/giata" },
    },
    { capturedAt, detailLevel: "LOCATION" },
  );

  return draft;
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
      /* try next */
    }
  }
  return { ok: false };
}

async function fetchDetailsBatch(page, hotelCodes, locale, detailLevel = "LOCATION") {
  // Always read fresh token inside page (JWT may rotate in localStorage)
  // detailLevel=LOCATION is required for hotel description body (verified 2026-07-30)
  return page.evaluate(
    async ({ hotelCodes, locale, detailLevel }) => {
      let token = (localStorage.getItem("darwinToken") || "").replace(/^"+|"+$/g, "");
      return new Promise((resolve) => {
        const x = new XMLHttpRequest();
        const q = detailLevel
          ? `locale=${encodeURIComponent(locale)}&detailLevel=${encodeURIComponent(detailLevel)}`
          : `locale=${encodeURIComponent(locale)}`;
        const url = `https://webapi.gta-travel.cn/client-content-api/1.0/hotels/detail?${q}`;
        x.open("POST", url, true);
        x.setRequestHeader("Accept", "application/json");
        x.setRequestHeader("Content-Type", "application/json");
        if (token) x.setRequestHeader("Authorization", "Bearer " + token);
        x.timeout = 120000;
        x.onload = () => {
          let json = null;
          try {
            json = JSON.parse(x.responseText);
          } catch {
            /* ignore */
          }
          resolve({ status: x.status, json, textLen: x.responseText.length, tokenLen: token.length });
        };
        x.onerror = () => resolve({ status: 0, error: "network" });
        x.ontimeout = () => resolve({ status: 0, error: "timeout" });
        x.send(JSON.stringify({ hotelCodes }));
      });
    },
    { hotelCodes, locale, detailLevel },
  );
}

const args = parseArgs(process.argv.slice(2));
const siteConfig = await loadConfig();
const pipe = await loadPipelineConfig();
const productCfg = pipe.phases?.product || {};

const destFilter = args.dest
  ? String(args.dest)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : ["PEK", "PVG", "CN1", "SZX"];
const limit = args.limit != null ? Number(args.limit) : null;
// gentle defaults: small batch + long delay (CLI overrides config)
const batchSize = Math.max(1, Number(args.batchSize || productCfg.batchSize || 8));
const force = args.force === "true" || args.force === true;
// upgradeDesc: re-fetch hotels that lack real bilingual intro even if contentStatus was ok
const upgradeDesc = args.upgradeDesc === "true" || args.upgradeDesc === true || args.upgrade === "desc";
const skipImages = args.skipImages === "true" || args.skipImages === true;
const delayMs = Number(args.delayMs || productCfg.requestDelayMs || 1500);
const destPauseMs = Number(args.destPauseMs || productCfg.destPauseMs || 3000);
const sessionRefreshEvery = Math.max(
  1,
  Number(args.sessionRefreshEvery || productCfg.sessionRefreshEveryBatches || 8),
);

const dataRoot = pipe.dataRoot;
const listsRoot = path.join(dataRoot, "01-destination-lists");
const productsRoot = path.join(dataRoot, "02-hotel-products");
const stateDir = path.join(dataRoot, "00-state");
const cpFile = path.join(stateDir, "checkpoint.json");
const progressFile = path.join(stateDir, "progress.jsonl");
const writeCounter = { n: 0 };
const pyWriter = resolveFromRoot("scripts/write-hotel-workbook.py");

const gate0 = await guardDisk(pipe, { forceCheck: true, writeCounter });
if (!gate0.allow) {
  console.error(JSON.stringify({ ok: false, paused: true, reason: gate0.reason, monitor: gate0.monitor }));
  process.exit(3);
}

const browser = await chromium
  .connectOverCDP(`http://127.0.0.1:${siteConfig.chrome.remoteDebuggingPort}`, { timeout: 8000 })
  .catch(() => null);
if (!browser) {
  console.error("CDP unavailable — npm run chrome:launch");
  process.exit(2);
}
const context = browser.contexts()[0];
// Prefer an already-authenticated tab; otherwise open a dedicated worker tab
let page =
  context.pages().find((p) => /gta-travel|bedsonline/.test(p.url()) && !p.isClosed()) ||
  (await context.newPage());

let session = await ensureSession(page, siteConfig.site);
let token = session.token || "";
if (!session.ok || !token) {
  // second chance: dedicated page + login flow
  page = await context.newPage();
  session = await ensureSession(page, siteConfig.site);
  token = session.token || "";
}
if (!session.ok || !token) {
  console.error(
    JSON.stringify({
      ok: false,
      error: "login_failed",
      hint: "login in debug Chrome first (saved password / BEDSONLINE_USERNAME+PASSWORD)",
    }),
  );
  process.exit(2);
}
// land on main so XHR origin is correct
if (!/\/main/.test(page.url())) {
  await page.goto(siteConfig.site.mainUrl, { waitUntil: "domcontentloaded", timeout: 120000 }).catch(() => {});
  await sleep(2000);
}
const tokenMeta0 = parseDarwinTokenMeta(token);
console.log(
  `[session] ok via=${session.via} tokenLen=${token.length} jwtTtlH=${tokenMeta0.ttlHours ?? "?"} expInMin=${tokenMeta0.expInMin ?? "?"} mode=detailLevel=LOCATION batchSize=${batchSize} delayMs=${delayMs} destPauseMs=${destPauseMs} upgradeDesc=${upgradeDesc} force=${force} sessionRefreshEveryBatches=${sessionRefreshEvery}`,
);

let cp = await loadCheckpoint(cpFile);
cp.phase = "product-enrich";
cp.stats = cp.stats || {};
await saveCheckpoint(cpFile, cp);

const listDirs = (await fs.readdir(listsRoot)).filter((d) => !d.startsWith("."));
const folderByCode = new Map();
for (const folder of listDirs) {
  const code = folder.split("-")[0];
  if (!folderByCode.has(code)) folderByCode.set(code, folder);
}
// Preserve --dest order (e.g. PEK,PVG,CN1,SZX priority)
const jobs = [];
for (const code of destFilter) {
  const folder = folderByCode.get(code);
  if (!folder) continue;
  const listPath = path.join(listsRoot, folder, "hotel-list.jsonl");
  let lines = [];
  try {
    lines = (await fs.readFile(listPath, "utf8")).split("\n").filter(Boolean);
  } catch {
    continue;
  }
  let hotels = lines.map((l) => JSON.parse(l));
  if (limit != null) hotels = hotels.slice(0, limit);
  jobs.push({ code, folder, hotels });
}

let enriched = 0;
let skipped = 0;
let failed = 0;
let imagesSaved = 0;
const errors = [];

for (const job of jobs) {
  const destCode = job.code;
  console.log(`[dest] ${destCode} hotels=${job.hotels.length}`);

  // filter already enriched unless force / upgradeDesc
  // complete = strict gate; LOCATION without complete still re-runs on upgradeDesc if missing intro
  const pending = [];
  for (const h of job.hotels) {
    const hotelCode = String(h.hotelCode);
    const mark = path.join(productsRoot, destCode, hotelCode, "product.json");
    if (!force) {
      try {
        const existing = JSON.parse(await fs.readFile(mark, "utf8"));
        const hasDetail = !!(existing.detailZh && existing.detailEn);
        const hasIntro = hasClientIntro(existing, 40);
        const isComplete = existing.contentStatus === "complete";
        const locationDone = existing.detailLevel === "LOCATION" && hasDetail;

        if (upgradeDesc) {
          // national content upgrade: skip only when already complete, or LOCATION done with intro evaluated
          if (isComplete) {
            skipped += 1;
            continue;
          }
          // already LOCATION-fetched once and intro still missing from source → skip to avoid infinite loop
          if (locationDone && existing.contentMissing && !hasIntro) {
            // re-fetch only if never evaluated with new schema (no contentMissing)
            if (Array.isArray(existing.contentMissing)) {
              skipped += 1;
              continue;
            }
          }
          if (locationDone && hasIntro && existing.contentStatus === "partial") {
            // have intro but partial for other reasons — skip unless force (don't thrash)
            skipped += 1;
            continue;
          }
        } else if (isComplete || (locationDone && (hasIntro || existing.contentStatus === "partial" || existing.contentStatus === "failed"))) {
          skipped += 1;
          continue;
        } else if (hasDetail && existing.contentStatus === "ok") {
          // legacy status: skip in normal mode; use --upgradeDesc=true to backfill
          skipped += 1;
          continue;
        }
      } catch {
        /* need enrich */
      }
    }
    pending.push(h);
  }
  console.log(`[dest] ${destCode} pending=${pending.length} skipped=${job.hotels.length - pending.length}`);

  for (let i = 0; i < pending.length; i += batchSize) {
    const chunk = pending.slice(i, i + batchSize);
    const codes = chunk.map((h) => String(h.hotelCode));

    const gate = await guardDisk(pipe, { writeCounter });
    if (!gate.allow) {
      cp.phase = "paused";
      cp.lastPauseReason = gate.reason;
      cp.currentDestinationCode = destCode;
      await saveCheckpoint(cpFile, cp);
      await appendProgress(progressFile, {
        event: "pause",
        phase: "product-enrich",
        reason: gate.reason,
        dest: destCode,
      });
      console.error(JSON.stringify({ ok: false, paused: true, reason: gate.reason }));
      process.exit(3);
    }

    // refresh token / recover page after navigation teardown
    // JWT observed TTL ~8h; SPA legacySession config mentions 4h — refresh early
    async function refreshSession() {
      try {
        if (page.isClosed()) {
          page = context.pages()[0] || (await context.newPage());
        }
        const fresh = await ensureFreshToken(page, siteConfig.site, { minRemainingSec: 15 * 60 });
        token = fresh.token || "";
        if (fresh.refreshed) {
          console.log(
            `[session] token refreshed via=${fresh.via} expInMin=${fresh.expInMin ?? "?"} ttlH=${fresh.ttlHours ?? "?"}`,
          );
        }
      } catch (e) {
        console.warn(`[session] refresh failed: ${e.message || e}`);
        page = context.pages().find((p) => !p.isClosed()) || page;
        const meta = await readDarwinToken(page).catch(() => ({ token: "" }));
        token = meta.token || "";
      }
      return token;
    }

    const batchIndex = Math.floor(i / batchSize);
    // time-based + batch-based refresh (token rotation exists)
    if (i === 0 || batchIndex % sessionRefreshEvery === 0) {
      const meta = await readDarwinToken(page).catch(() => ({ token: "", expInSec: 0 }));
      token = meta.token || "";
      // if < 20 min remaining, or missing — force SPA/login refresh
      if (!token || meta.expired || (meta.expInSec != null && meta.expInSec < 20 * 60)) {
        console.warn(
          `[session] token stale/missing expInMin=${meta.expInMin ?? "n/a"} — refreshing`,
        );
        token = await refreshSession();
      } else if (batchIndex > 0 && batchIndex % Math.max(sessionRefreshEvery, 1) === 0) {
        // light touch: re-read only (SPA may have rotated quietly)
        console.log(`[session] ok expInMin=${meta.expInMin} len=${meta.len || token.length}`);
      }
      if (!token) {
        console.error("token lost");
        process.exit(2);
      }
    }

    let zhRes;
    let enRes;
    try {
      zhRes = await fetchDetailsBatch(page, codes, "zh");
      // 401 → token expired mid-run: refresh and retry once
      if (zhRes.status === 401 || zhRes.status === 403) {
        console.warn(`[session] zh detail HTTP ${zhRes.status} — token refresh + retry`);
        token = await refreshSession();
        zhRes = await fetchDetailsBatch(page, codes, "zh");
      }
      await sleep(delayMs);
      enRes = await fetchDetailsBatch(page, codes, "en");
      if (enRes.status === 401 || enRes.status === 403) {
        console.warn(`[session] en detail HTTP ${enRes.status} — token refresh + retry`);
        token = await refreshSession();
        enRes = await fetchDetailsBatch(page, codes, "en");
      }
    } catch (e) {
      const msg = String(e.message || e);
      // recover once on navigation / context destroy
      if (/context was destroyed|Target closed|Execution context/i.test(msg)) {
        console.warn(`[batch] recover after: ${msg}`);
        await sleep(delayMs * 2);
        token = await refreshSession();
        try {
          zhRes = await fetchDetailsBatch(page, codes, "zh");
          await sleep(delayMs);
          enRes = await fetchDetailsBatch(page, codes, "en");
        } catch (e2) {
          failed += codes.length;
          errors.push({ dest: destCode, codes, error: String(e2.message || e2) });
          await appendProgress(progressFile, {
            event: "enrich_batch_error",
            dest: destCode,
            codes,
            error: String(e2.message || e2),
          });
          await sleep(delayMs * 3);
          continue;
        }
      } else {
        failed += codes.length;
        errors.push({ dest: destCode, codes, error: msg });
        await appendProgress(progressFile, {
          event: "enrich_batch_error",
          dest: destCode,
          codes,
          error: msg,
        });
        continue;
      }
    }

    if (zhRes.status !== 200 && enRes.status !== 200) {
      failed += codes.length;
      errors.push({
        dest: destCode,
        codes,
        zh: zhRes.status,
        en: enRes.status,
        err: zhRes.error || enRes.error,
      });
      console.warn(`[batch] fail ${destCode} zh=${zhRes.status} en=${enRes.status}`);
      await sleep(delayMs * 2);
      continue;
    }

    const zhMap = new Map();
    const enMap = new Map();
    for (const h of zhRes.json || []) zhMap.set(String(h.code), h);
    for (const h of enRes.json || []) enMap.set(String(h.code), h);

    for (const listRow of chunk) {
      const hotelCode = String(listRow.hotelCode);
      const zh = zhMap.get(hotelCode) || null;
      const en = enMap.get(hotelCode) || null;
      const hotelDir = path.join(productsRoot, destCode, hotelCode);
      const imagesDir = path.join(hotelDir, "images");
      await fs.mkdir(imagesDir, { recursive: true });

      const product = buildProduct(listRow, zh, en, destCode);

      // preserve prior image download on upgrade re-fetch
      let prev = null;
      try {
        prev = JSON.parse(await fs.readFile(path.join(hotelDir, "product.json"), "utf8"));
      } catch {
        /* first write */
      }
      if (prev?.imagePaths?.length && !product.imagePaths?.length) {
        product.imageCount = prev.imageCount || prev.imagePaths.length;
        product.imagePaths = prev.imagePaths;
        product.imageDownloadedFrom = prev.imageDownloadedFrom || null;
        product.imageBytes = prev.imageBytes || null;
      }

      if (!skipImages && product.urlImageRel) {
        const ext = path.extname(product.urlImageRel) || ".jpg";
        const imgPath = path.join(imagesDir, `main${ext}`);
        let already = false;
        try {
          const st = await fs.stat(imgPath);
          already = st.size > 500;
        } catch {
          already = false;
        }
        if (already) {
          product.imageCount = product.imageCount || 1;
          product.imagePaths = product.imagePaths?.length ? product.imagePaths : [`images/main${ext}`];
          product.imageLocalStatus = "ok_existing";
        } else {
          const dl = await downloadImage(imageUrls(product.urlImageRel), imgPath);
          if (dl.ok) {
            product.imageCount = 1;
            product.imagePaths = [`images/main${ext}`];
            product.imageDownloadedFrom = dl.url;
            product.imageBytes = dl.bytes;
            product.imageLocalStatus = "ok";
            imagesSaved += 1;
            cp.stats.imagesSaved = (cp.stats.imagesSaved || 0) + 1;
          } else {
            product.imageLocalStatus = "download_failed";
            product.imageLastError = { urls: imageUrls(product.urlImageRel), at: new Date().toISOString() };
          }
        }
      } else if (!product.urlImageRel) {
        product.imageLocalStatus = product.imageLocalStatus || "no_source_url";
      }

      // re-evaluate after image state is known (complete requires local image)
      const q2 = evaluateContentQuality(product, {
        hasLocalImageFiles: (product.imageCount || 0) > 0,
      });
      product.contentStatus = product.detailZh || product.detailEn ? q2.contentStatus : "failed";
      product.contentMissing = q2.contentMissing;
      product.languageFallback = q2.languageFallback;
      product.hasClientIntro = q2.hasClientIntro;
      product.contentChecks = q2.checks;
      if (q2.coordinateFix) product.coordinateFix = q2.coordinateFix;
      product.latitude = q2.latitude;
      product.longitude = q2.longitude;
      product.contentUpdatedAt = new Date().toISOString();

      // atomic write: temp + rename
      const productPath = path.join(hotelDir, "product.json");
      const tmpPath = path.join(hotelDir, "product.json.tmp");
      await fs.writeFile(tmpPath, `${JSON.stringify(product, null, 2)}\n`);
      await fs.rename(tmpPath, productPath);
      // keep calendar placeholder if missing
      try {
        await fs.access(path.join(hotelDir, "calendar.json"));
      } catch {
        await fs.writeFile(
          path.join(hotelDir, "calendar.json"),
          `${JSON.stringify({ rates: [], status: "pending_probe" }, null, 2)}\n`,
        );
      }

      const xlsxOut = path.join(hotelDir, "product.xlsx");
      const py = spawnSync(
        "python3",
        [
          pyWriter,
          "--product",
          path.join(hotelDir, "product.json"),
          "--calendar",
          path.join(hotelDir, "calendar.json"),
          "--out",
          xlsxOut,
        ],
        { encoding: "utf8" },
      );
      if (py.status !== 0) {
        errors.push({ hotel: hotelCode, xlsx: (py.stderr || py.stdout || "").slice(0, 300) });
      }

      // thin local mirror (product json only to save local disk)
      const localHotel = resolveFromRoot("hotel-data", "02-hotel-products", destCode, hotelCode);
      await fs.mkdir(localHotel, { recursive: true });
      await fs
        .copyFile(path.join(hotelDir, "product.json"), path.join(localHotel, "product.json"))
        .catch(() => {});

      if (zh || en) {
        enriched += 1;
        cp.stats.productsEnriched = (cp.stats.productsEnriched || 0) + 1;
      } else {
        failed += 1;
      }
    }

    await appendProgress(progressFile, {
      event: "enrich_batch",
      dest: destCode,
      from: i,
      size: chunk.length,
      zhStatus: zhRes.status,
      enStatus: enRes.status,
      zhHits: Array.isArray(zhRes.json) ? zhRes.json.length : 0,
      enHits: Array.isArray(enRes.json) ? enRes.json.length : 0,
    });
    cp.currentDestinationCode = destCode;
    cp.updatedAt = new Date().toISOString();
    await saveCheckpoint(cpFile, cp);
    console.log(
      `[batch] ${destCode} ${i + chunk.length}/${pending.length} enriched=${enriched} images=${imagesSaved}`,
    );
    // extra breather after every few batches
    await sleep(delayMs + (batchIndex % 4 === 3 ? delayMs : 0));
  }

  if (cp.destinations?.[destCode]) {
    cp.destinations[destCode].contentStatus = limit != null ? "partial" : "done";
    cp.destinations[destCode].enrichedAt = new Date().toISOString();
  }
  await saveCheckpoint(cpFile, cp);
  console.log(`[dest-done] ${destCode} pause ${destPauseMs}ms`);
  await sleep(destPauseMs);
}

// final disk check
await guardDisk(pipe, { forceCheck: true, writeCounter });

const summary = {
  ok: true,
  phase: "product-enrich",
  destFilter,
  enriched,
  skipped,
  failed,
  imagesSaved,
  productsRoot,
  errorCount: errors.length,
  sampleErrors: errors.slice(0, 10),
  note: "Full bilingual product fields + main image; calendar still pending avail API",
};
console.log(JSON.stringify(summary, null, 2));
await appendProgress(progressFile, { event: "enrich_done", ...summary });
cp.phase = "product-enrich-done";
await saveCheckpoint(cpFile, cp);
process.exit(0);
