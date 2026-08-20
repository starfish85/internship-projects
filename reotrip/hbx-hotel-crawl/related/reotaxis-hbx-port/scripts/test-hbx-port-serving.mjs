#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { BONG_SEN_ID, reviewedContentHash, validateReviewedPortContent } from "./hbx-port-content-gate.mjs";

const ports = JSON.parse(readFileSync("data/port-transfers.json", "utf8"));
const reviewDoc = JSON.parse(readFileSync("data/hbx-port-content-review.json", "utf8"));
const riskRoster = JSON.parse(readFileSync("data/hbx-shared-private-risk-roster.json", "utf8"));
const pageSource = readFileSync("src/app/transfer-iz-porta/[slug]/page.tsx", "utf8");
const sitemapSource = readFileSync("src/lib/sitemap.ts", "utf8");
const riskIds = new Set((riskRoster.ids ?? []).map(String));

const clone = (value) => JSON.parse(JSON.stringify(value));
const stable = (value) =>
  JSON.stringify(value, Object.keys(JSON.parse(JSON.stringify(value))).sort());
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function isPublic(port) {
  return (
    port.contentReviewed === true &&
    port.needsNativeReview === false &&
    port.needsImage === false &&
    port.priceStatus === "anchor" &&
    Number(port.priceRub) > 0 &&
    port.pricingGuard?.held !== true
  );
}

function assertNoPublicLeak(port) {
  const publicText = `${port.ruTitle}\n${port.ruDescription}\n${port.terminalRu ?? ""}`;
  const blockedCopy = [/\bHBX\b/i, /Hotelbeds/i, /Bedsonline/i, /availability/i, /ручн/i, /manual/i, /seed/i];
  for (const pattern of blockedCopy) {
    assert.ok(!pattern.test(publicText), `${port.slug}: customer copy leaks ${pattern}`);
  }
}

function validateReviewMatchesPorts(document, rows) {
  const reviewed = validateReviewedPortContent(document);
  assert.equal(rows.length, 147, "input roster must remain 147");
  assert.equal(reviewed.size, 147, "review roster must remain 147");
  for (const port of rows) {
    const review = reviewed.get(String(port.id));
    assert.ok(review, `${port.id}: missing reviewed content`);
    assert.equal(review.slug, port.slug, `${port.id}: reviewed slug drift`);
    assert.equal(review.ruTitle, port.ruTitle, `${port.id}: reviewed title not consumed`);
    assert.equal(review.ruDescription, port.ruDescription, `${port.id}: reviewed description not consumed`);
    assert.equal(port.contentHash, review.contentHash, `${port.id}: generated contentHash drift`);
    assert.equal(port.contentReviewed, review.contentReviewed, `${port.id}: contentReviewed must come from review`);
    assert.equal(port.needsNativeReview, review.needsNativeReview, `${port.id}: needsNativeReview must come from review`);
    assert.equal(port.needsImage, review.needsImage, `${port.id}: needsImage must come from review`);
    assert.equal(port.contentMachine, false, `${port.id}: serving copy must not be machine-marked`);
    assertNoPublicLeak(port);
  }
}

function validateServingRelease(rows, document = reviewDoc) {
  validateReviewMatchesPorts(document, rows);
  const publicRows = rows.filter(isPublic);
  const heldRows = rows.filter((port) => port.pricingGuard?.held === true || port.priceStatus === "on_request");
  const riskRows = rows.filter((port) => riskIds.has(String(port.id)));
  assert.equal(riskRows.length, 13, "canonical shared/private risk roster must remain 13 rows");
  assert.equal(publicRows.length, 133, "release-eligible must be 133/147 after risk roster and Bong Sen holds");
  assert.equal(heldRows.length, 14, "exactly 14 rows must remain held: 13 risk roster + Bong Sen");
  for (const port of riskRows) {
    assert.equal(port.priceStatus, "on_request", `${port.id}: risk roster row must remain request-only`);
    assert.equal(port.priceRub, 0, `${port.id}: risk roster row must not expose an anchor price`);
    assert.equal(port.pricingGuard?.held, true, `${port.id}: risk roster row must stay held`);
    assert.equal(port.pricingGuard?.riskRosterTerminal, true, `${port.id}: risk roster marker must stay bound`);
    assert.equal(port.pricingGuard?.riskRosterSha256, riskRoster.sha256, `${port.id}: risk roster hash must stay bound`);
    assert.ok(port.pricingGuard?.holdReasons?.includes("semantic_unknown"), `${port.id}: risk roster hold reason must stay semantic_unknown`);
    assert.equal(Object.hasOwn(port, "offers"), false, `${port.id}: risk roster row must not contain an Offer`);
  }
  const bongSen = rows.find((port) => String(port.id) === BONG_SEN_ID);
  assert.ok(bongSen, "Bong Sen must remain in the 147-port set");
  assert.equal(bongSen.priceStatus, "on_request", "Bong Sen stays on_request until air-3 release");
  assert.equal(bongSen.priceRub, 0, "Bong Sen must not expose an anchor price");
  assert.equal(bongSen.pricingGuard?.held, true, "Bong Sen serving guard must hold the route");
  assert.ok(bongSen.pricingGuard?.holdReasons?.includes("awaiting_air3_bong_sen_release"));
  assert.equal(Object.hasOwn(bongSen, "offers"), false, "Bong Sen data must not contain an Offer");
  for (const port of rows) {
    assert.equal(port.markupMultiplier, 1.3, `${port.id}: supplier net markup must be 1.30`);
    assert.equal(
      port.sourceCny,
      Number((port.netCny * port.markupMultiplier).toFixed(2)),
      `${port.id}: upstream markup must be applied exactly once`,
    );
  }
}

assert.equal(ports.length, 147, "value port-transfer count must remain 147");
const snapshotBytes = readFileSync("data/hbx-port-cost-snapshot.jsonl");
assert.equal(
  sha256(snapshotBytes),
  "7125d279e58b59c19c379927413a788510383f1e21142c5485ffc1cf6abd6efa",
  "serving PR must consume the refreshed HBX value-port snapshot",
);
const snapshotRows = snapshotBytes.toString("utf8").trim().split("\n").map(JSON.parse);
const valueRows = snapshotRows.filter((row) => row.siteScope === "reotaxis" && row.variantKey.endsWith(":value"));
assert.equal(valueRows.length, 294, "value tier must retain both directions for all 147 terminals");
assert.equal(new Set(valueRows.map((row) => row.sourceProductId)).size, 147, "value tier must retain 147 unique terminals");
assert.equal(
  valueRows.filter((row) => row.serviceType === "private" && row.pricingUnitSemantic === "per_vehicle").length,
  294,
  "refreshed value snapshot must carry private/per_vehicle semantics for every direction",
);

validateServingRelease(ports);

assert.doesNotMatch(pageSource, /\bHBX\b|Hotelbeds|Bedsonline/i, "customer page source must not expose supplier naming");
assert.match(pageSource, /const hasPrice = portTransferIsPublic\(p\)/, "page must use the unified public gate");
assert.match(sitemapSource, /filter\(portTransferIsPublic\)/, "sitemap must use the unified public gate");

assert.throws(
  () => validateServingRelease(ports, { ...reviewDoc, ports: reviewDoc.ports.slice(1) }),
  /exactly 147 rows/,
  "missing review row must fail closed",
);

{
  const mutated = clone(reviewDoc);
  mutated.ports[1] = clone(mutated.ports[0]);
  assert.throws(() => validateServingRelease(ports, mutated), /duplicate id/, "duplicate review row must fail closed");
}

{
  const mutated = clone(reviewDoc);
  mutated.ports[0].slug = `${mutated.ports[0].slug}-drift`;
  mutated.ports[0].contentHash = reviewedContentHash(mutated.ports[0]);
  assert.throws(() => validateServingRelease(ports, mutated), /reviewed slug drift/, "identity drift must fail closed");
}

{
  const mutated = clone(reviewDoc);
  mutated.ports[0].ruDescription += " drift";
  assert.throws(() => validateServingRelease(ports, mutated), /contentHash drift/, "content hash drift must fail closed");
}

{
  const mutated = clone(reviewDoc);
  mutated.ports[0].needsNativeReview = true;
  assert.throws(() => validateServingRelease(ports, mutated), /still needs native review/, "native-review flag mutation must fail closed");
}

{
  const mutated = clone(ports);
  mutated[0].needsNativeReview = true;
  assert.throws(() => validateServingRelease(mutated), /needsNativeReview must come from review/, "hardcoded generated native-review flag must fail closed");
}

{
  const mutated = clone(ports);
  const bongSen = mutated.find((port) => String(port.id) === BONG_SEN_ID);
  bongSen.priceStatus = "anchor";
  bongSen.priceRub = 2830;
  bongSen.pricingGuard.held = false;
  bongSen.offers = [{ priceCurrency: "RUB", price: "2830" }];
  assert.throws(() => validateServingRelease(mutated), /release-eligible must be 133|Bong Sen stays on_request/, "Bong Sen Offer mutation must fail closed");
}

{
  const mutated = clone(ports);
  const mutatedReview = clone(reviewDoc);
  mutated[0].ruTitle += " HBX";
  const review = mutatedReview.ports.find((port) => String(port.id) === String(mutated[0].id));
  review.ruTitle = mutated[0].ruTitle;
  review.contentHash = reviewedContentHash(review);
  mutated[0].contentHash = review.contentHash;
  assert.throws(() => validateServingRelease(mutated, mutatedReview), /customer copy leaks/, "supplier-name public copy mutation must fail closed");
}

{
  const mutated = clone(ports);
  mutated[0].sourceCny = Number((mutated[0].sourceCny * 1.3).toFixed(2));
  assert.throws(() => validateServingRelease(mutated), /upstream markup must be applied exactly once/, "duplicate markup mutation must fail closed");
}

const projection = ports.map((port) => ({
  id: port.id,
  slug: port.slug,
  priceRub: port.priceRub,
  priceStatus: port.priceStatus,
  contentHash: port.contentHash,
  public: isPublic(port),
}));
assert.equal(sha256(stable(projection)), sha256(stable(projection)), "offline projection hash must be deterministic");

console.log("port serving guard passed: 147 roster, 133 eligible, 13 risk holds, 1 Bong Sen hold, mutations fail closed");
