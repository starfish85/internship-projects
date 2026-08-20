/**
 * Full-disk content quality audit (no calendar).
 * Writes readiness summary + retry queue + complete sample per destination.
 *
 * Usage:
 *   node scripts/pipeline/phase2-content-quality-audit.mjs
 *   node scripts/pipeline/phase2-content-quality-audit.mjs --dest=PEK,PVG --limit=100
 */
import fs from "node:fs/promises";
import path from "node:path";
import { evaluateContentQuality, COMPLETE_REQUIRED } from "../../lib/content-quality.mjs";
import { loadPipelineConfig } from "../../lib/disk-guard.mjs";

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    const m = item.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const args = parseArgs(process.argv.slice(2));
const pipe = await loadPipelineConfig();
const productsRoot = path.join(pipe.dataRoot, "02-hotel-products");
const outDir = path.join(pipe.dataRoot, "00-state", "content-quality");
await fs.mkdir(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const destFilter = args.dest
  ? String(args.dest)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;
const limitPerDest = args.limit != null ? Number(args.limit) : null;

const statusCount = { complete: 0, partial: 0, failed: 0, legacy_ok: 0, other: 0 };
const missingCount = {};
const byDest = {};
const retryRows = [];
const completeByDest = {};
let total = 0;
let locationN = 0;
let introN = 0;

const destDirs = (await fs.readdir(productsRoot)).filter((d) => !d.startsWith("."));
for (const dest of destDirs) {
  if (destFilter && !destFilter.includes(dest)) continue;
  const destPath = path.join(productsRoot, dest);
  const st = await fs.stat(destPath).catch(() => null);
  if (!st?.isDirectory()) continue;

  let hotels = (await fs.readdir(destPath)).filter((d) => !d.startsWith("_") && !d.startsWith("."));
  if (limitPerDest != null) hotels = hotels.slice(0, limitPerDest);

  byDest[dest] = { total: 0, complete: 0, partial: 0, failed: 0, intro: 0, location: 0 };

  for (const hotelCode of hotels) {
    const hotelDir = path.join(destPath, hotelCode);
    const pj = path.join(hotelDir, "product.json");
    let product;
    try {
      product = JSON.parse(await fs.readFile(pj, "utf8"));
    } catch {
      continue;
    }
    total += 1;
    byDest[dest].total += 1;

    let hasImgFiles = false;
    try {
      const imgs = await fs.readdir(path.join(hotelDir, "images"));
      hasImgFiles = imgs.some((f) => !f.startsWith("."));
    } catch {
      /* no */
    }

    const q = evaluateContentQuality(product, { hasLocalImageFiles: hasImgFiles });
    // Prefer live evaluation over stale contentStatus
    const status = q.contentStatus;
    if (status === "complete") statusCount.complete += 1;
    else if (status === "partial") statusCount.partial += 1;
    else if (status === "failed") statusCount.failed += 1;
    else statusCount.other += 1;
    if (product.contentStatus === "ok" || product.contentStatus === "ok_no_intro") statusCount.legacy_ok += 1;

    byDest[dest][status] = (byDest[dest][status] || 0) + 1;
    if (product.detailLevel === "LOCATION") {
      locationN += 1;
      byDest[dest].location += 1;
    }
    if (q.hasClientIntro) {
      introN += 1;
      byDest[dest].intro += 1;
    }

    for (const m of q.contentMissing) {
      missingCount[m] = (missingCount[m] || 0) + 1;
    }

    if (status !== "complete") {
      retryRows.push({
        dest,
        hotelCode,
        contentStatus: status,
        storedStatus: product.contentStatus || "",
        detailLevel: product.detailLevel || "",
        missing: q.contentMissing.join("|"),
        nameZh: product.nameZh || "",
        nameEn: product.nameEn || "",
        nextAction: !product.detailLevel || product.detailLevel !== "LOCATION"
          ? "upgradeDesc_LOCATION"
          : q.contentMissing.includes("image")
            ? "retry_image"
            : "source_partial_or_manual",
      });
    } else {
      if (!completeByDest[dest]) completeByDest[dest] = [];
      if (completeByDest[dest].length < 5) {
        completeByDest[dest].push({
          dest,
          hotelCode,
          nameZh: product.nameZh,
          nameEn: product.nameEn,
          descriptionZh: (product.descriptionZh || "").slice(0, 80),
          descriptionEn: (product.descriptionEn || "").slice(0, 80),
          imagePaths: (product.imagePaths || []).join(";"),
        });
      }
    }
  }
}

const summary = {
  at: new Date().toISOString(),
  dataRoot: pipe.dataRoot,
  total,
  statusCount,
  locationFetched: locationN,
  bilingualIntro: introN,
  completeRate: total ? statusCount.complete / total : 0,
  missingCount,
  completeRequired: COMPLETE_REQUIRED,
  byDest,
  note:
    "complete uses strict rules (true bilingual name/address/intro, phone, local image, bilingual facilities, valid coords). Calendar excluded. Source gaps remain partial.",
};

const summaryPath = path.join(outDir, `content-readiness-summary-${stamp}.json`);
const latestSummary = path.join(outDir, "content-readiness-summary-latest.json");
await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2) + "\n");
await fs.writeFile(latestSummary, JSON.stringify(summary, null, 2) + "\n");

const retryPath = path.join(outDir, `content-retry-queue-${stamp}.csv`);
const retryHeader = "dest,hotelCode,contentStatus,storedStatus,detailLevel,missing,nameZh,nameEn,nextAction\n";
const retryBody = retryRows
  .map((r) =>
    [r.dest, r.hotelCode, r.contentStatus, r.storedStatus, r.detailLevel, r.missing, r.nameZh, r.nameEn, r.nextAction]
      .map(csvEscape)
      .join(","),
  )
  .join("\n");
await fs.writeFile(retryPath, retryHeader + retryBody + (retryBody ? "\n" : ""));

const sampleRows = Object.values(completeByDest).flat();
const samplePath = path.join(outDir, `content-complete-sample-${stamp}.csv`);
const sampleHeader = "dest,hotelCode,nameZh,nameEn,descriptionZh,descriptionEn,imagePaths\n";
const sampleBody = sampleRows
  .map((r) =>
    [r.dest, r.hotelCode, r.nameZh, r.nameEn, r.descriptionZh, r.descriptionEn, r.imagePaths].map(csvEscape).join(","),
  )
  .join("\n");
await fs.writeFile(samplePath, sampleHeader + sampleBody + (sampleBody ? "\n" : ""));

console.log(
  JSON.stringify(
    {
      ok: true,
      total,
      complete: statusCount.complete,
      partial: statusCount.partial,
      failed: statusCount.failed,
      bilingualIntro: introN,
      locationFetched: locationN,
      summaryPath,
      retryPath,
      samplePath,
      latestSummary,
    },
    null,
    2,
  ),
);
