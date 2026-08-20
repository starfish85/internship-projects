#!/usr/bin/env node
/**
 * Phase 3: read-only HBX/Bedsonline portal date-keyed cost feed for port transfers.
 *
 * Reads the local Mac mini portal session from env only. The script never prints
 * tokens, Authorization headers, raw rateKey values, or raw supplier responses.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HbxPortSource } from "./hbx-refresh/port-b2b-source.mjs";
import {
  loadFxRates,
  loadPricingConfig,
  normalizeSupplierCostDailyRow,
  priceSupplierCostDailyRows,
} from "./pricing-sync-core.mjs";

const DEFAULT_TERMINALS =
  "/Users/mark/reo-ops/_cowork/codex_artifacts/hbx-port-transfer-stage-20260623/hbx_port_transfer_terminal_staged.jsonl";
const TERMINAL_SOURCE = process.env.HBX_PORT_TERMINALS_JSONL || DEFAULT_TERMINALS;
const OUTPUT = process.env.HBX_SUPPLIER_COST_OUT || "data/supplier-cost-daily.json";
const REPORT = process.env.HBX_SUPPLIER_COST_REPORT || "data/supplier-cost-daily-report.json";
const SNAPSHOT = process.env.HBX_PORT_COST_SNAPSHOT_OUT || "data/hbx-port-cost-snapshot.jsonl";
const CHECKPOINT = process.env.HBX_SUPPLIER_CHECKPOINT || `${OUTPUT}.hbx-checkpoint.json`;
const CHECKPOINT_EVERY = Math.max(1, Number(process.env.HBX_SUPPLIER_CHECKPOINT_EVERY ?? 250));
const RATE_MS = Number(process.env.HBX_SUPPLIER_RATE_MS ?? 1000);
const CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.HBX_SUPPLIER_CONCURRENCY ?? 1)));
const TIMEOUT_MS = Number(process.env.HBX_SUPPLIER_TIMEOUT_MS ?? 20_000);
const RETRIES = Number(process.env.HBX_SUPPLIER_RETRIES ?? 1);
const LEGACY_LIMIT = process.env.HBX_SUPPLIER_LIMIT || "all";
const TERMINAL_SHARD_START = Number(process.env.HBX_TERMINAL_SHARD_START ?? process.env.HBX_SUPPLIER_START_AT ?? 0);
const TERMINAL_SHARD_SIZE = process.env.HBX_TERMINAL_SHARD_SIZE ?? LEGACY_LIMIT;
const INCREMENTAL_MAX_AGE_HOURS = Number(process.env.HBX_INCREMENTAL_MAX_AGE_HOURS ?? 48);
const FORCE_FULL_REFRESH = ["1", "true", "yes"].includes(String(process.env.HBX_FORCE_FULL_REFRESH ?? "").toLowerCase());
const TERMINAL_CODES = new Set(
  String(process.env.HBX_TERMINAL_CODES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const now = new Date();

function isoDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function dateRange(start, days) {
  return Array.from({ length: days }, (_, index) => addDays(start, index));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(String(value)).digest("hex")}`;
}

function redactError(error) {
  return String(error?.message ?? error)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]")
    .slice(0, 240);
}

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function readExistingFeed(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rows) ? parsed.rows : [];
    return {
      meta: Array.isArray(parsed) ? {} : parsed?.meta ?? {},
      rows: rows.map((row) => normalizeSupplierCostDailyRow(row)),
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { meta: { missing: true }, rows: [] };
    throw error;
  }
}

function terminalCodeFor(row) {
  return String(row?.sourceProductId ?? row?.terminalCode ?? row?.terminal?.code ?? "");
}

function parseShardSize(value, fallback = "all") {
  if (value === "all" || value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseShardStart(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function isValidIsoTimestamp(value) {
  return typeof value === "string" && value.trim() && !Number.isNaN(new Date(value).getTime());
}

function hoursBetween(laterMs, earlierMs) {
  return (laterMs - earlierMs) / 3_600_000;
}

export function terminalRefreshDecision({
  terminalCode,
  existingRows,
  nowMs,
  maxAgeHours,
  forceFull,
  expectedRowsPerTerminal,
}) {
  const rows = existingRows.filter((row) => row.source === "HBX" && terminalCodeFor(row) === terminalCode);
  if (forceFull) return { refresh: true, reason: "force_full", existingRows: rows.length };
  if (!rows.length) return { refresh: true, reason: "missing_terminal", existingRows: 0 };
  if (Number.isFinite(expectedRowsPerTerminal) && expectedRowsPerTerminal > 0 && rows.length < expectedRowsPerTerminal) {
    return { refresh: true, reason: "incomplete_terminal", existingRows: rows.length };
  }
  if (rows.some((row) => !isValidIsoTimestamp(row.fetchedAt))) {
    return { refresh: true, reason: "missing_or_invalid_fetchedAt", existingRows: rows.length };
  }
  if (rows.some((row) => !isValidIsoTimestamp(row.expiresAt))) {
    return { refresh: true, reason: "missing_or_invalid_expiresAt", existingRows: rows.length };
  }
  const earliestExpiryMs = Math.min(...rows.map((row) => new Date(row.expiresAt).getTime()));
  if (earliestExpiryMs <= nowMs) return { refresh: true, reason: "expired", existingRows: rows.length };
  const newestFetchMs = Math.max(...rows.map((row) => new Date(row.fetchedAt).getTime()));
  if (Number.isFinite(maxAgeHours) && maxAgeHours > 0 && hoursBetween(nowMs, newestFetchMs) > maxAgeHours) {
    return { refresh: true, reason: "age_threshold", existingRows: rows.length };
  }
  return { refresh: false, reason: "fresh", existingRows: rows.length };
}

export function buildTerminalShard({
  terminals,
  existingRows,
  terminalCodes = TERMINAL_CODES,
  shardStart = TERMINAL_SHARD_START,
  shardSize = TERMINAL_SHARD_SIZE,
  maxAgeHours = INCREMENTAL_MAX_AGE_HOURS,
  forceFull = FORCE_FULL_REFRESH,
  nowDate = now,
  expectedRowsPerTerminal,
}) {
  const filtered = terminalCodes.size
    ? terminals.filter((row) => terminalCodes.has(String(row.terminal?.code ?? "")))
    : terminals;
  const decisions = filtered.map((terminal) => {
    const terminalCode = String(terminal.terminal?.code ?? "");
    return {
      terminal,
      terminalCode,
      ...terminalRefreshDecision({
        terminalCode,
        existingRows,
        nowMs: nowDate.getTime(),
        maxAgeHours,
        forceFull,
        expectedRowsPerTerminal,
      }),
    };
  });
  const eligible = decisions.filter((item) => item.refresh);
  const start = parseShardStart(shardStart);
  const size = parseShardSize(shardSize, "all");
  const selected = size === "all" ? eligible.slice(start) : eligible.slice(start, start + size);
  const selectedTerminalCodes = selected.map((item) => item.terminalCode);
  const nextShardStart = size === "all" ? null : start + selected.length;
  return {
    terminals: selected.map((item) => item.terminal),
    decisions,
    selectedTerminalCodes,
    selectedReasons: selected.reduce((acc, item) => {
      acc[item.reason] = (acc[item.reason] ?? 0) + 1;
      return acc;
    }, {}),
    matchedTerminalCount: filtered.length,
    eligibleTerminalCount: eligible.length,
    selectedTerminalCount: selected.length,
    shardStart: start,
    shardSize: size,
    nextShardStart,
    hasNextShard: size !== "all" && nextShardStart < eligible.length,
  };
}

export function mergeRowsForSelectedTerminals({ existingRows, refreshedRows, selectedTerminalCodes }) {
  const selected = new Set(selectedTerminalCodes.map(String));
  const preservedRows = existingRows.filter((row) => row.source !== "HBX" || !selected.has(terminalCodeFor(row)));
  return [...preservedRows, ...refreshedRows];
}

function coveragePct(numerator, denominator) {
  if (!denominator) return 100;
  return Number(((numerator / denominator) * 100).toFixed(4));
}

function cheapest(items, predicate = () => true) {
  return items
    .filter(predicate)
    .sort((a, b) => a.amount - b.amount)
    .at(0) ?? null;
}

function serviceTypeFor(item) {
  const serviceType = String(item?.serviceType ?? "").toLowerCase();
  return ["private", "shared", "unknown"].includes(serviceType) ? serviceType : "unknown";
}

function pricingUnitSemanticForServiceType(serviceType) {
  return serviceType === "private" ? "per_vehicle" : "unknown";
}

function pricingUnitEvidenceFor(item) {
  if (!item) return null;
  const masterServiceType = item.serviceTypeCode || (item.serviceType === "private" ? "PRVT" : item.serviceType === "shared" ? "SHRD" : "UNKNOWN");
  const vehicle = item.vehicleCode ? `; masterVehicleType=${item.vehicleCode}` : "";
  return `HBX masterServiceType=${masterServiceType}; serviceType=${serviceTypeFor(item)}${vehicle}`;
}

async function fetchWithRetry({ source, ...args }) {
  let lastError = null;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      return { status: "ok", items: await source.availability(args), error: null };
    } catch (error) {
      if (error?.needsHuman) throw error;
      lastError = error;
      if (attempt < RETRIES) await sleep(2500 * (attempt + 1));
    }
  }
  return { status: "fetch_failed", items: [], error: redactError(lastError) };
}

export function rowForTier({ terminal, travelDate, direction, tier, siteScope, selected, status, fetchedAt, expiresAt, error }) {
  const terminalCode = String(terminal.terminal.code);
  const availabilityStatus = status === "ok" ? (selected ? "available" : "unavailable") : "fetch_failed";
  const variantKey = `${direction}:${tier}`;
  const serviceType = serviceTypeFor(selected);
  const serviceTypeCode = selected?.serviceTypeCode || (serviceType === "private" ? "PRVT" : serviceType === "shared" ? "SHRD" : "UNKNOWN");
  return normalizeSupplierCostDailyRow({
    schemaVersion: 1,
    source: "HBX",
    sourceProductId: terminalCode,
    productId: `hbx-port-${terminalCode}-${tier}`,
    variantKey,
    productType: "hbx_port_transfer",
    siteScope,
    travelDate,
    costAmount: selected?.amount ?? null,
    costCurrency: selected?.currency ?? "CNY",
    availabilityStatus,
    inventory: selected ? 1 : 0,
    fetchedAt,
    expiresAt,
    costAsOf: fetchedAt.slice(0, 10),
    sourceWindowStart: travelDate,
    sourceWindowEnd: travelDate,
    rateKeyRef: selected?.rateKeyHash ?? null,
    rateKeyHash: selected?.rateKeyHash ?? null,
    serviceType,
    pricingUnitSemantic: pricingUnitSemanticForServiceType(serviceType),
    pricingUnitEvidence: pricingUnitEvidenceFor(selected),
    semanticChange: "unknown",
    previousPricingUnitSemantic: "unknown",
    rawFingerprint: sha256(
      `${terminalCode}|${travelDate}|${variantKey}|${availabilityStatus}|${selected?.amount ?? ""}|${selected?.currency ?? ""}|${serviceType}|${serviceTypeCode}|${selected?.vehicleCode ?? ""}|${error ?? ""}`,
    ),
  });
}

export function rowsForProbe({ terminal, travelDate, direction, result, fetchedAt, expiresAt }) {
  const privateItem = cheapest(result.items, (item) => item.serviceType === "private");
  return [
    rowForTier({
      terminal,
      travelDate,
      direction,
      tier: "value",
      siteScope: "reotaxis",
      selected: privateItem,
      status: result.status,
      fetchedAt,
      expiresAt,
      error: result.error,
    }),
    rowForTier({
      terminal,
      travelDate,
      direction,
      tier: "premium",
      siteScope: "reotransfer",
      selected: privateItem,
      status: result.status,
      fetchedAt,
      expiresAt,
      error: result.error,
    }),
  ];
}

function mkdirFor(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function writeJsonl(path, rows) {
  mkdirFor(path);
  writeFileSync(path, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""), "utf8");
}

function probeKey(probe) {
  return `${String(probe.terminal.terminal.code)}|${probe.travelDate}|${probe.direction}`;
}

function probeSignature(probes) {
  return sha256(probes.map(probeKey).join("\n"));
}

function readCheckpoint({ path, signature }) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (parsed?.meta?.probeSignature !== signature) return null;
    const rows = Array.isArray(parsed.rows) ? parsed.rows.map((row) => normalizeSupplierCostDailyRow(row)) : [];
    const probeResults = Array.isArray(parsed.probeResults) ? parsed.probeResults : [];
    return { rows, probeResults };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function writeCheckpoint({ path, signature, rows, probeResults, expectedProbes, fetchedAt, expiresAt }) {
  mkdirFor(path);
  writeFileSync(
    path,
    JSON.stringify({
      meta: {
        source: "HBX",
        partial: true,
        generatedAt: fetchedAt,
        expiresAt,
        probeSignature: signature,
        probesCompleted: probeResults.length,
        expectedProbes,
      },
      rows,
      probeResults,
    }) + "\n",
    "utf8",
  );
}

function summarizeMissing(rows) {
  const byTerminal = new Map();
  for (const row of rows) {
    if (row.availabilityStatus === "available" || row.availabilityStatus === "sellable") continue;
    const rec = byTerminal.get(row.sourceProductId) ?? {
      terminalCode: row.sourceProductId,
      missingCount: 0,
      fetchFailed: 0,
      unavailable: 0,
      examples: [],
    };
    rec.missingCount += 1;
    if (row.availabilityStatus === "fetch_failed") rec.fetchFailed += 1;
    if (row.availabilityStatus === "unavailable") rec.unavailable += 1;
    if (rec.examples.length < 8) {
      rec.examples.push({ travelDate: row.travelDate, variantKey: row.variantKey, status: row.availabilityStatus });
    }
    byTerminal.set(row.sourceProductId, rec);
  }
  return [...byTerminal.values()].sort((a, b) => b.missingCount - a.missingCount || a.terminalCode.localeCompare(b.terminalCode));
}

async function main() {
  const started = Date.now();
  const fxRates = loadFxRates();
  const config = loadPricingConfig();
  const allTerminals = readJsonl(TERMINAL_SOURCE);
  const travelStart = process.env.HBX_TRAVEL_START || fxRates.date;
  const rollingWindowDays = Number(process.env.HBX_ROLLING_WINDOW_DAYS ?? config.rollingWindowDays ?? 90);
  const travelDates = dateRange(travelStart, rollingWindowDays);
  const fetchedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + Number(config.costCacheTtlHours ?? 72) * 3_600_000).toISOString();
  const directions = ["arrival_port_to_hotel", "departure_hotel_to_port"];
  const existing = readExistingFeed(OUTPUT);
  const expectedRowsPerTerminal = travelDates.length * directions.length * 2;
  const terminalShard = buildTerminalShard({
    terminals: allTerminals,
    existingRows: existing.rows,
    expectedRowsPerTerminal,
  });
  const terminals = terminalShard.terminals;
  const selectedTerminalCodes = terminalShard.selectedTerminalCodes;
  const probes = [];
  for (const terminal of terminals) {
    for (const travelDate of travelDates) {
      for (const direction of directions) probes.push({ terminal, travelDate, direction });
    }
  }
  const signature = probeSignature(probes);
  const checkpoint = readCheckpoint({ path: CHECKPOINT, signature });
  const completedProbeKeys = new Set(
    (checkpoint?.probeResults ?? []).map((result) => `${result.terminalCode}|${result.travelDate}|${result.direction}`),
  );
  const pendingProbes = probes.filter((probe) => !completedProbeKeys.has(probeKey(probe)));

  console.log(
    `hbx supplier-cost: selectedTerminals=${terminals.length}/${terminalShard.eligibleTerminalCount} matchedTerminals=${terminalShard.matchedTerminalCount}/${allTerminals.length} shardStart=${terminalShard.shardStart} shardSize=${terminalShard.shardSize} days=${travelDates.length} probes=${probes.length} concurrency=${CONCURRENCY} rateMs=${RATE_MS}`,
  );
  if (checkpoint) {
    console.log(`resume checkpoint: completed=${checkpoint.probeResults.length}/${probes.length} pending=${pendingProbes.length}`);
  }

  const rows = checkpoint?.rows ?? [];
  const probeResults = checkpoint?.probeResults ?? [];
  let cursor = 0;

  if (pendingProbes.length > 0) {
    const source = new HbxPortSource({ timeoutMs: TIMEOUT_MS });
    await source.ready();

    async function worker() {
      while (cursor < pendingProbes.length) {
        const index = cursor;
        cursor += 1;
        const probe = pendingProbes[index];
        const startedProbe = Date.now();
        const result = await fetchWithRetry({ source, ...probe });
        rows.push(...rowsForProbe({ ...probe, result, fetchedAt, expiresAt }));
        probeResults.push({
          terminalCode: String(probe.terminal.terminal.code),
          travelDate: probe.travelDate,
          direction: probe.direction,
          status: result.status === "ok" ? (result.items.length ? "available" : "unavailable") : result.status,
          itemCount: result.items.length,
          durationMs: Date.now() - startedProbe,
          error: result.error,
        });
        if ((probeResults.length % 250 === 0) || probeResults.length === probes.length) {
          const available = probeResults.filter((item) => item.status === "available").length;
          const failed = probeResults.filter((item) => item.status === "fetch_failed").length;
          console.log(`progress=${probeResults.length}/${probes.length} available=${available} fetchFailed=${failed}`);
        }
        if ((probeResults.length % CHECKPOINT_EVERY === 0) || probeResults.length === probes.length) {
          writeCheckpoint({ path: CHECKPOINT, signature, rows, probeResults, expectedProbes: probes.length, fetchedAt, expiresAt });
        }
        if (RATE_MS > 0) await sleep(RATE_MS);
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  } else {
    console.log("hbx supplier-cost: no terminals require refresh; supplier session was not opened.");
  }

  rows.sort((a, b) =>
    `${a.sourceProductId}:${a.travelDate}:${a.variantKey}`.localeCompare(`${b.sourceProductId}:${b.travelDate}:${b.variantKey}`),
  );

  const mergedRows = mergeRowsForSelectedTerminals({ existingRows: existing.rows, refreshedRows: rows, selectedTerminalCodes });
  const preservedRows = mergedRows.length - rows.length;
  const expectedProbes = probes.length;
  const expectedRows = expectedProbes * 2;
  const availableRows = rows.filter((row) => row.availabilityStatus === "available").length;
  const missingRows = rows.length - availableRows;
  const fetchFailedProbes = probeResults.filter((item) => item.status === "fetch_failed").length;
  const pricedRows = priceSupplierCostDailyRows({
    rows,
    fxRates,
    config,
    markup: Number(process.env.HBX_MARKUP ?? 1.3),
    floorStep: Number(process.env.HBX_PRICE_FLOOR_STEP ?? 10),
    nowDateTime: fetchedAt,
  });
  const heldRows = pricedRows.filter((row) => row.priceStatus === "hold").length;
  const durationMs = Date.now() - started;
  const meta = {
    schemaVersion: 1,
    source: "MIXED",
    generatedAt: fetchedAt,
    expiresAt,
    preservedRows: preservedRows.length,
    sources: {
      ...(existing.meta?.sources ?? {}),
      KLOOK: existing.meta?.sources?.KLOOK ?? (existing.meta?.source === "KLOOK" ? existing.meta : undefined),
      HBX: {
        source: "HBX",
        productType: "hbx_port_transfer",
        sourceEndpoint: "/client-btb-avail-api/2.0/transfer/availability",
        snapshotPath: SNAPSHOT,
        snapshotSchema: "supplier_cost_daily_jsonl_v1",
        terminalCount: terminals.length,
        matchedTerminalCount: terminalShard.matchedTerminalCount,
        eligibleTerminalCount: terminalShard.eligibleTerminalCount,
        totalTerminalCount: allTerminals.length,
        selectedTerminalCodes,
        selectedRefreshReasons: terminalShard.selectedReasons,
        shardStart: terminalShard.shardStart,
        shardSize: terminalShard.shardSize,
        nextShardStart: terminalShard.nextShardStart,
        hasNextShard: terminalShard.hasNextShard,
        incrementalMaxAgeHours: INCREMENTAL_MAX_AGE_HOURS,
        forceFullRefresh: FORCE_FULL_REFRESH,
        expectedRowsPerTerminal,
        rollingWindowDays: travelDates.length,
        windowStart: travelDates[0],
        windowEnd: travelDates.at(-1),
        directions,
        expectedProbes,
        probesCompleted: probeResults.length,
        expectedRows,
        rowsWritten: rows.length,
        snapshotRows: rows.length,
        availableRows,
        missingRows,
        fetchFailedProbes,
        rowCoveragePct: coveragePct(rows.length, expectedRows),
        availableCoveragePct: coveragePct(availableRows, expectedRows),
        guardHeldRows: heldRows,
        concurrency: CONCURRENCY,
        rateMs: RATE_MS,
        timeoutMs: TIMEOUT_MS,
        durationMs,
      },
    },
  };

  mkdirFor(OUTPUT);
  mkdirFor(REPORT);
  writeJsonl(SNAPSHOT, rows);
  writeFileSync(OUTPUT, JSON.stringify({ meta, rows: mergedRows }) + "\n", "utf8");
  writeFileSync(
    REPORT,
    JSON.stringify(
      {
        meta: meta.sources.HBX,
        probeStatusCounts: probeResults.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] ?? 0) + 1;
          return acc;
        }, {}),
        missingByTerminal: summarizeMissing(rows),
        failureSamples: probeResults.filter((item) => item.status === "fetch_failed").slice(0, 25),
        guardHeldExamples: pricedRows
          .filter((row) => row.priceStatus === "hold")
          .slice(0, 25)
          .map((row) => ({
            sourceProductId: row.sourceProductId,
            travelDate: row.travelDate,
            variantKey: row.variantKey,
            reasons: row.pricingGuard.holdReasons,
            availabilityStatus: row.availabilityStatus,
          })),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  rmSync(CHECKPOINT, { force: true });

  console.log(
    `hbx supplier_cost_daily probes=${probeResults.length}/${expectedProbes} rows=${rows.length}/${expectedRows} availableRows=${availableRows} missingRows=${missingRows} fetchFailedProbes=${fetchFailedProbes} guardHeldRows=${heldRows} durationMs=${durationMs}`,
  );
  console.log(`wrote=${OUTPUT}`);
  console.log(`snapshot=${SNAPSHOT}`);
  console.log(`report=${REPORT}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    const message = redactError(err);
    console.error(message);
    process.exitCode = err?.needsHuman ? 2 : 1;
  });
}
