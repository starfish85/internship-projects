#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertReadOnlyHbxEndpoint,
  buildPortAvailabilityRequest,
  HbxPortSource,
  normalizePortAvailability,
} from "./hbx-refresh/port-b2b-source.mjs";
import { rowForTier, rowsForProbe } from "./fetch-hbx-supplier-cost-daily.mjs";
import { priceSupplierCostDailyRows } from "./pricing-sync-core.mjs";

const terminal = {
  terminal: { code: "PORT-1" },
  seedHotel: { code: "HOTEL-1" },
};

test("HBX port adapter only permits the documented read hosts and excludes write paths", () => {
  assert.match(assertReadOnlyHbxEndpoint("https://webapi.gta-travel.cn/client-btb-avail-api/2.0/transfer/availability"), /transfer\/availability/);
  assert.match(assertReadOnlyHbxEndpoint("https://app-bedsonline.gta-travel.cn/read-only"), /read-only/);
  assert.throws(() => assertReadOnlyHbxEndpoint("https://merchant.example/transfer/availability"), /Unsupported HBX host/);
  assert.throws(() => assertReadOnlyHbxEndpoint("https://webapi.gta-travel.cn/client/cart"), /Blocked non-read/);
  assert.throws(() => assertReadOnlyHbxEndpoint("https://webapi.gta-travel.cn/client/booking"), /Blocked non-read/);
});

test("HBX port adapter builds only an availability request and redacts the raw rate key", () => {
  const request = buildPortAvailabilityRequest({ terminal, travelDate: "2026-07-14", direction: "arrival_port_to_hotel" });
  assert.deepEqual(request.arrival.pickupLocation, { code: "PORT-1", type: "P" });
  assert.deepEqual(request.arrival.destinationLocation, { code: "HOTEL-1", type: "H" });

  const normalized = normalizePortAvailability({
    avail: [
      {
        totalAmount: 100,
        currency: { code: "CNY" },
        rateKey: "raw-rate-key-must-not-leave-the-adapter",
        productTransferSpecifications: { masterServiceType: { code: "PRVT" }, masterVehicleType: { code: "SEDAN" } },
      },
    ],
  });
  assert.equal(normalized[0].amount, 100);
  assert.equal(normalized[0].serviceType, "private");
  assert.equal(normalized[0].serviceTypeCode, "PRVT");
  assert.match(normalized[0].rateKeyHash, /^sha256:/);
  assert.doesNotMatch(JSON.stringify(normalized), /raw-rate-key-must-not-leave-the-adapter/);
});

test("HBX port source calls only the availability endpoint and returns a sanitized result", async () => {
  let request = null;
  const source = new HbxPortSource({
    tokenReader: async () => "test-token",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          avail: [{ totalAmount: 80, currency: "CNY", rateKey: "raw-test-rate-key" }],
        }),
      };
    },
  });
  const rows = await source.availability({ terminal, travelDate: "2026-07-14", direction: "departure_hotel_to_port" });
  assert.match(request.url, /\/transfer\/availability\?locale=zh$/);
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body).arrival.pickupLocation, { code: "HOTEL-1", type: "H" });
  assert.doesNotMatch(JSON.stringify(rows), /raw-test-rate-key/);
});

test("fresh HBX net cost applies the 1.30 upstream markup exactly once", () => {
  const [priced] = priceSupplierCostDailyRows({
    rows: [
      {
        schemaVersion: 1,
        source: "HBX",
        sourceProductId: "PORT-1",
        variantKey: "arrival_port_to_hotel:value",
        productType: "hbx_port_transfer",
        siteScope: "reotaxis",
        serviceType: "private",
        travelDate: "2026-07-14",
        costAmount: 100,
        costCurrency: "CNY",
        availabilityStatus: "available",
        fetchedAt: "2026-07-12T00:00:00.000Z",
        expiresAt: "2026-07-15T00:00:00.000Z",
        costAsOf: "2026-07-12",
        pricingUnitSemantic: "per_vehicle",
        pricingUnitEvidence: "HBX masterServiceType=PRVT; serviceType=private",
      },
    ],
    fxRates: { date: "2026-07-11", rates: { CNY: 11.3037 } },
    config: { minMarginFloor: 0.25, maxCostSnapshotAgeDays: 2, costCacheTtlHours: 72 },
    markup: 1.3,
    floorStep: 10,
    nowDateTime: "2026-07-12T12:00:00.000Z",
  });
  assert.equal(priced.priceRub, 1460);
  assert.equal(priced.pricingGuard.held, false);
});

test("HBX shared/unknown service semantics fail closed and private is selected for value tier", () => {
  const fetchedAt = "2026-07-12T00:00:00.000Z";
  const expiresAt = "2026-07-15T00:00:00.000Z";
  const rows = rowsForProbe({
    terminal,
    travelDate: "2026-07-14",
    direction: "arrival_port_to_hotel",
    result: {
      status: "ok",
      items: [
        { amount: 40, currency: "CNY", serviceType: "shared", serviceTypeCode: "SHRD", vehicleCode: "BUS", rateKeyHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
        { amount: 100, currency: "CNY", serviceType: "private", serviceTypeCode: "PRVT", vehicleCode: "SEDAN", rateKeyHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
      ],
      error: null,
    },
    fetchedAt,
    expiresAt,
  });
  const value = rows.find((row) => row.variantKey.endsWith(":value"));
  assert.equal(value.serviceType, "private");
  assert.equal(value.costAmount, 100);
  assert.equal(value.pricingUnitSemantic, "per_vehicle");
  assert.match(value.pricingUnitEvidence, /masterServiceType=PRVT/);

  const [held] = priceSupplierCostDailyRows({
    rows: [
      {
        ...value,
        serviceType: "shared",
        pricingUnitSemantic: "unknown",
        pricingUnitEvidence: "HBX masterServiceType=SHRD; serviceType=shared",
      },
    ],
    fxRates: { date: "2026-07-11", rates: { CNY: 11.3037 } },
    config: { minMarginFloor: 0.25, maxCostSnapshotAgeDays: 2, costCacheTtlHours: 72 },
    markup: 1.3,
    floorStep: 10,
    nowDateTime: "2026-07-12T12:00:00.000Z",
  });
  assert.equal(held.priceStatus, "hold");
  assert.equal(held.priceRub, null);
  assert.ok(held.pricingGuard.holdReasons.includes("semantic_unknown"));
});

test("HBX raw fingerprint changes when only masterServiceType changes", () => {
  const base = {
    terminal,
    travelDate: "2026-07-14",
    direction: "arrival_port_to_hotel",
    tier: "value",
    siteScope: "reotaxis",
    status: "ok",
    fetchedAt: "2026-07-12T00:00:00.000Z",
    expiresAt: "2026-07-15T00:00:00.000Z",
    error: null,
  };
  const privateRow = rowForTier({
    ...base,
    selected: { amount: 100, currency: "CNY", serviceType: "private", serviceTypeCode: "PRVT", vehicleCode: "SEDAN", rateKeyHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
  });
  const sharedRow = rowForTier({
    ...base,
    selected: { amount: 100, currency: "CNY", serviceType: "shared", serviceTypeCode: "SHRD", vehicleCode: "SEDAN", rateKeyHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
  });
  assert.notEqual(privateRow.rawFingerprint, sharedRow.rawFingerprint);
});

test("port rebuild prefers the sanitized fresh snapshot and retains the daily-feed fallback", () => {
  const buildScript = readFileSync(new URL("./build-port-transfers.mjs", import.meta.url), "utf8");
  assert.match(buildScript, /hbx-port-cost-snapshot\.jsonl/);
  assert.match(buildScript, /const dailyRows = snapshotRows\.length \? snapshotRows : feedRows/);
});
