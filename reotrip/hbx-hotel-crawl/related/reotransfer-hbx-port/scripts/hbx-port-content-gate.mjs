import { createHash } from "node:crypto";
import fs from "node:fs";

export const BONG_SEN_ID = "10732";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function reviewedContentHash(port) {
  return sha256(
    JSON.stringify({
      id: String(port?.id || ""),
      slug: String(port?.slug || ""),
      ruTitle: String(port?.ruTitle || ""),
      ruDescription: String(port?.ruDescription || ""),
    }),
  );
}

function hasCyrillic(value) {
  return /\p{Script=Cyrillic}/u.test(String(value || ""));
}

export function validateReviewedPortContent(document, { expectedCount = 147 } = {}) {
  const ports = Array.isArray(document?.ports) ? document.ports : [];
  if (ports.length !== expectedCount) {
    throw new Error(`HBX port content review must contain exactly ${expectedCount} rows; found ${ports.length}`);
  }

  const byId = new Map();
  const slugs = new Set();
  for (const port of ports) {
    const id = String(port?.id || "");
    const slug = String(port?.slug || "");
    const ruTitle = String(port?.ruTitle || "");
    const ruDescription = String(port?.ruDescription || "");
    if (!id) throw new Error("HBX port content review has an empty id");
    if (byId.has(id)) throw new Error(`HBX port content review has duplicate id: ${id}`);
    if (!slug) throw new Error(`HBX port content review row ${id} has an empty slug`);
    if (slugs.has(slug)) throw new Error(`HBX port content review has duplicate slug: ${slug}`);
    if (port?.contentReviewed !== true) throw new Error(`HBX port content review row ${id} is not contentReviewed`);
    if (port?.needsNativeReview !== false) throw new Error(`HBX port content review row ${id} still needs native review`);
    if (port?.needsImage !== false) throw new Error(`HBX port content review row ${id} still needs image review`);
    if (!ruTitle.trim() || !ruDescription.trim()) throw new Error(`HBX port content review row ${id} is missing final RU copy`);
    if (!hasCyrillic(ruTitle) || !hasCyrillic(ruDescription)) {
      throw new Error(`HBX port content review row ${id} does not contain final Cyrillic RU copy`);
    }
    const expectedHash = reviewedContentHash(port);
    if (port?.contentHash !== expectedHash) {
      throw new Error(`HBX port content review row ${id} contentHash drift`);
    }
    slugs.add(slug);
    byId.set(id, {
      id,
      slug,
      ruTitle,
      ruDescription,
      contentHash: expectedHash,
      contentReviewed: true,
      needsNativeReview: false,
      needsImage: false,
    });
  }
  return byId;
}

export function loadReviewedPortContent(path, options) {
  return validateReviewedPortContent(JSON.parse(fs.readFileSync(path, "utf8")), options);
}
