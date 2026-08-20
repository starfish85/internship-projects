#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const roster = JSON.parse(fs.readFileSync("data/hbx-shared-private-risk-roster.json", "utf8"));
const rows = JSON.parse(fs.readFileSync("data/port-transfers.json", "utf8"));
const ids = new Set((roster.ids ?? []).map(String));
const riskRows = rows.filter((row) => ids.has(String(row.id)));

assert.equal(ids.size, 13, "canonical HBX shared/private risk roster must contain 13 ids");
assert.equal(riskRows.length, 13, "generated RTAX data must retain all 13 frozen risk ids");

for (const row of riskRows) {
  assert.equal(row.priceStatus, "on_request", `${row.id}/${row.slug}: frozen risk id must be request-only`);
  assert.equal(row.priceRub, 0, `${row.id}/${row.slug}: frozen risk id must not expose a positive anchor`);
  assert.equal(row.pricingGuard?.held, true, `${row.id}/${row.slug}: frozen risk id must stay held`);
  assert.equal(row.pricingGuard?.riskRosterTerminal, true, `${row.id}/${row.slug}: frozen risk id must be marked`);
  assert.equal(row.pricingGuard?.riskRosterSha256, roster.sha256, `${row.id}/${row.slug}: risk roster hash must stay bound`);
  assert.ok(row.pricingGuard?.holdReasons?.includes("semantic_unknown"), `${row.id}/${row.slug}: semantic hold reason must be retained`);
  assert.equal(Object.hasOwn(row, "offers"), false, `${row.id}/${row.slug}: frozen risk id must not carry Offer data`);
}

const publicRiskRows = riskRows.filter(
  (row) => row.priceStatus === "anchor" && Number(row.priceRub) > 0 && row.pricingGuard?.held !== true,
);
assert.equal(publicRiskRows.length, 0, "verified-private overlay must not publish frozen risk ids");

console.log("hbx-risk-roster-hold: OK");
