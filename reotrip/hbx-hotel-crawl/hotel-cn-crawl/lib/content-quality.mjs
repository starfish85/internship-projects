/**
 * Client-facing hotel content quality gate (content completeness only).
 * Spec: complete | partial | failed — never use "ok" to hide missing intro/bilingual.
 *
 * Source: POST /client-content-api/1.0/hotels/detail?detailLevel=LOCATION
 * segments[].description / notes are NOT hotel intro.
 */

const HAN = /[\u4e00-\u9fff]/;
const LATIN = /[A-Za-z]/;
const CJK_OR_HAN = /[\u4e00-\u9fff]/;

/** China mainland + nearby rough bounds (after possible lat/lng swap). */
const CN_LAT = [15, 55];
const CN_LNG = [70, 140];

export function stripHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return " ";
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16));
      } catch {
        return " ";
      }
    })
    .replace(/\s+/g, " ")
    .trim();
}

export function realDescription(text, minLen = 40) {
  const s = stripHtml(text);
  if (s.length < minLen) return null;
  // reject pure category-ish short tags already filtered by length
  return s;
}

export function hasHanzi(s) {
  return !!(s && HAN.test(String(s)));
}

export function hasLatin(s) {
  return !!(s && LATIN.test(String(s)));
}

/** Count Latin letters vs Hanzi in text. */
export function scriptCounts(s) {
  const t = String(s || "");
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  const han = (t.match(/[\u4e00-\u9fff]/g) || []).length;
  return { latin, han, letterLike: latin + han };
}

/**
 * English-facing short fields (names/addresses): need Latin;
 * allow mixed brands (e.g. "全季 Hotel") but reject pure Chinese.
 */
export function isValidEnField(s) {
  if (!s || !String(s).trim()) return false;
  const t = String(s).trim();
  if (!hasLatin(t)) return false;
  const { latin, han } = scriptCounts(t);
  // names can be mixed; reject if almost no Latin vs Hanzi
  if (han > 0 && latin < 2) return false;
  return true;
}

/** Chinese-facing: must contain Hanzi. */
export function isValidZhField(s) {
  if (!s || !String(s).trim()) return false;
  return hasHanzi(s);
}

/**
 * English hotel intro body — stricter than name fields.
 * Reject Chinese pasted into descriptionEn (even if "USB"/brand Latin tricks it).
 */
export function isValidEnDescription(s, minLen = 40) {
  const t = realDescription(s, minLen);
  if (!t) return false;
  const { latin, han, letterLike } = scriptCounts(t);
  if (latin < 30) return false; // body needs real English prose
  if (letterLike === 0) return false;
  // Hanzi must not dominate EN intro (USB/WiFi alone must not pass)
  if (han > 0 && han / letterLike > 0.25) return false;
  if (han >= 20 && han >= latin * 0.4) return false;
  return true;
}

/** Chinese hotel intro body. */
export function isValidZhDescription(s, minLen = 40) {
  const t = realDescription(s, minLen);
  if (!t) return false;
  const { han } = scriptCounts(t);
  return han >= 15; // real Chinese prose, not a few tokens
}

export function isRealBilingualName(nameZh, nameEn) {
  if (!isValidZhField(nameZh) || !isValidEnField(nameEn)) return false;
  if (String(nameZh).trim() === String(nameEn).trim()) return false;
  return true;
}

export function isRealBilingualAddress(addressZh, addressEn) {
  if (!isValidZhField(addressZh) || !isValidEnField(addressEn)) return false;
  if (String(addressZh).trim() === String(addressEn).trim()) return false;
  return true;
}

/**
 * Length balance: avoid truncated ZH with long EN (or vice versa).
 * Fail complete when shorter/longer < minRatio and shorter < shortMax.
 */
export function descriptionsBalanced(descriptionZh, descriptionEn, opts = {}) {
  const minRatio = opts.minRatio ?? 0.15;
  const shortMax = opts.shortMax ?? 120;
  const z = stripHtml(descriptionZh || "");
  const e = stripHtml(descriptionEn || "");
  if (!z || !e) return false;
  const a = z.length;
  const b = e.length;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (hi === 0) return false;
  const ratio = lo / hi;
  if (ratio < minRatio && lo < shortMax) return false;
  return true;
}

export function isRealBilingualIntro(descriptionZh, descriptionEn, minLen = 40) {
  const z = realDescription(descriptionZh, minLen);
  const e = realDescription(descriptionEn, minLen);
  if (!z || !e) return false;
  if (!isValidZhDescription(z, minLen)) return false;
  if (!isValidEnDescription(e, minLen)) return false;
  // identical copy across locales (after clean)
  if (z === e) return false;
  if (!descriptionsBalanced(z, e)) return false;
  return true;
}

/**
 * Fix swapped lat/lng common in some HBX rows (lat looks like lng).
 * Returns { latitude, longitude, coordinateFix }
 */
export function normalizeCoordinates(lat, lng) {
  let latitude = lat == null ? null : Number(lat);
  let longitude = lng == null ? null : Number(lng);
  if (latitude == null || longitude == null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { latitude: null, longitude: null, coordinateFix: null, coordsValid: false };
  }
  let coordinateFix = null;
  // Global hard bounds
  const inLat = (v) => v >= -90 && v <= 90;
  const inLng = (v) => v >= -180 && v <= 180;
  if (!inLat(latitude) || !inLng(longitude)) {
    // try swap if swapped values fall in range
    if (inLat(longitude) && inLng(latitude)) {
      const t = latitude;
      latitude = longitude;
      longitude = t;
      coordinateFix = "swapped_out_of_range";
    } else {
      return { latitude, longitude, coordinateFix: "invalid", coordsValid: false };
    }
  }
  // Heuristic: for CN hotels, if lat is in lng-like band and lng in lat-like, swap
  const looksSwapped =
    latitude >= CN_LNG[0] &&
    latitude <= CN_LNG[1] &&
    longitude >= CN_LAT[0] &&
    longitude <= CN_LAT[1] &&
    !(latitude >= CN_LAT[0] && latitude <= CN_LAT[1]);
  if (looksSwapped) {
    const t = latitude;
    latitude = longitude;
    longitude = t;
    coordinateFix = coordinateFix || "swapped_cn_heuristic";
  }
  if (latitude === 0 && longitude === 0) {
    return { latitude, longitude, coordinateFix: "zero", coordsValid: false };
  }
  const coordsValid = inLat(latitude) && inLng(longitude);
  return { latitude, longitude, coordinateFix, coordsValid };
}

export function hasUsablePhone(product) {
  const p = product?.phone || product?.phoneHotel || product?.phoneBooking;
  if (!p) return false;
  const digits = String(p).replace(/\D/g, "");
  return digits.length >= 6;
}

export function hasLocalImage(product, hotelDirExists = null) {
  if ((product?.imageCount || 0) > 0 && Array.isArray(product?.imagePaths) && product.imagePaths.length) {
    return true;
  }
  if (hotelDirExists === true) return true;
  return false;
}

export function hasBilingualFacilities(product) {
  const zh = product?.amenitiesZh || product?.facilitiesZh || [];
  const en = product?.amenitiesEn || product?.facilitiesEn || [];
  return Array.isArray(zh) && zh.length > 0 && Array.isArray(en) && en.length > 0;
}

/**
 * Evaluate product against strict client content rules.
 * @returns {{ contentStatus, contentMissing, languageFallback, checks }}
 */
export function evaluateContentQuality(product, opts = {}) {
  const minIntro = opts.minIntroLen ?? 40;
  const missing = [];
  const languageFallback = {};
  const checks = {};

  const nameZh = product?.nameZh;
  const nameEn = product?.nameEn;
  checks.nameZh = isValidZhField(nameZh);
  checks.nameEn = isValidEnField(nameEn);
  checks.nameBilingual = isRealBilingualName(nameZh, nameEn);
  if (!checks.nameZh) {
    missing.push("nameZh");
    if (nameZh && isValidEnField(nameZh)) {
      languageFallback.nameZh = { reason: "source_no_hanzi", retained: nameZh };
    }
  }
  if (!checks.nameEn) missing.push("nameEn");
  if (checks.nameZh && checks.nameEn && !checks.nameBilingual) {
    languageFallback.namePair = { reason: "zh_en_identical_or_invalid" };
  }

  const addressZh = product?.addressZh;
  const addressEn = product?.addressEn;
  checks.addressZh = isValidZhField(addressZh);
  checks.addressEn = isValidEnField(addressEn);
  checks.addressBilingual = isRealBilingualAddress(addressZh, addressEn);
  if (!checks.addressZh) {
    missing.push("addressZh");
    if (addressZh && isValidEnField(addressZh)) {
      languageFallback.addressZh = { reason: "source_no_hanzi", retained: addressZh };
    }
  }
  if (!checks.addressEn) missing.push("addressEn");

  checks.category = !!(product?.categoryZh || product?.categoryCode || product?.categoryEn);
  checks.destination = !!(product?.destinationCode || product?.destinationZh || product?.destinationEn);
  if (!checks.category) missing.push("category");
  if (!checks.destination) missing.push("destination");

  const { latitude, longitude, coordinateFix, coordsValid } = normalizeCoordinates(
    product?.latitude,
    product?.longitude,
  );
  checks.coordsValid = coordsValid;
  if (!coordsValid) missing.push("coordinates");

  checks.descriptionZh = isValidZhDescription(product?.descriptionZh, minIntro);
  checks.descriptionEn = isValidEnDescription(product?.descriptionEn, minIntro);
  checks.descriptionBalanced = descriptionsBalanced(product?.descriptionZh, product?.descriptionEn);
  checks.descriptionNotIdentical =
    stripHtml(product?.descriptionZh || "") !== stripHtml(product?.descriptionEn || "");
  checks.introBilingual = isRealBilingualIntro(product?.descriptionZh, product?.descriptionEn, minIntro);
  if (!checks.descriptionZh) missing.push("descriptionZh");
  if (!checks.descriptionEn) missing.push("descriptionEn");
  if (checks.descriptionZh && checks.descriptionEn && !checks.descriptionBalanced) {
    missing.push("descriptionLengthBalance");
  }
  if (checks.descriptionZh && checks.descriptionEn && !checks.descriptionNotIdentical) {
    missing.push("descriptionLanguagesIdentical");
  }

  checks.phone = hasUsablePhone(product);
  if (!checks.phone) missing.push("phone");

  checks.image = hasLocalImage(product, opts.hasLocalImageFiles);
  if (!checks.image) missing.push("image");

  checks.facilitiesBilingual = hasBilingualFacilities(product);
  if (!checks.facilitiesBilingual) missing.push("facilitiesBilingual");

  // failed only when we have no detail payload at all
  const hasDetail = !!(product?.detailZh || product?.detailEn || product?.detailLevel === "LOCATION");
  let contentStatus;
  if (!hasDetail && !(nameZh || nameEn)) {
    contentStatus = "failed";
  } else if (missing.length === 0) {
    contentStatus = "complete";
  } else {
    contentStatus = "partial";
  }

  return {
    contentStatus,
    contentMissing: missing,
    languageFallback: Object.keys(languageFallback).length ? languageFallback : null,
    coordinateFix: coordinateFix || product?.coordinateFix || null,
    latitude,
    longitude,
    coordsValid,
    checks,
    hasClientIntro: checks.introBilingual,
  };
}

/** Required field list for complete (documentation / audits). */
export const COMPLETE_REQUIRED = [
  "nameZh",
  "nameEn",
  "addressZh",
  "addressEn",
  "category",
  "destination",
  "coordinates",
  "descriptionZh",
  "descriptionEn",
  "phone",
  "image",
  "facilitiesBilingual",
];

/**
 * Build fieldProvenance for key customer fields from LOCATION detail source.
 */
export function buildFieldProvenance(fields, sourceMeta) {
  const at = sourceMeta?.capturedAt || new Date().toISOString();
  const base = {
    source: sourceMeta?.source || "client-content-api/1.0/hotels/detail",
    detailLevel: sourceMeta?.detailLevel || "LOCATION",
    capturedAt: at,
  };
  const out = {};
  for (const [k, extra] of Object.entries(fields || {})) {
    out[k] = { ...base, ...(extra || {}) };
  }
  return out;
}
