/**
 * Browser-context XHR helpers (Tealeaf-safe) + destination/hotel FTS.
 *
 * Token notes (verified 2026-07-30):
 * - localStorage.darwinToken is a JWT (iss=BEDSONLINECN)
 * - observed TTL iat→exp ≈ 8 hours
 * - SPA also has sessionSettings.expirationHours=4 (legacySession) — keep page alive
 * - Always re-read token from localStorage per request; never cache for hours
 * - On 401: reload main / re-login so SPA can mint a new JWT
 */
export function injectXhrHelpers() {
  return `
    function __hbxCleanToken() {
      let t = localStorage.getItem('darwinToken') || '';
      return t.replace(/^"+|"+$/g, '');
    }
    function __hbxTokenMeta(token) {
      token = token || __hbxCleanToken();
      if (!token) return { ok: false, error: 'no_token' };
      const parts = token.split('.');
      if (parts.length < 2) return { ok: true, token, jwt: false, len: token.length };
      try {
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const payload = JSON.parse(atob(pad));
        const now = Math.floor(Date.now() / 1000);
        const expInSec = payload.exp ? payload.exp - now : null;
        return {
          ok: true,
          token,
          jwt: true,
          len: token.length,
          sub: payload.sub || null,
          sessionId: payload.sessionId || null,
          iat: payload.iat || null,
          exp: payload.exp || null,
          expInSec,
          expInMin: expInSec != null ? Math.round(expInSec / 60) : null,
          expired: expInSec != null ? expInSec <= 0 : false,
        };
      } catch (e) {
        return { ok: true, token, jwt: false, len: token.length, parseError: String(e) };
      }
    }
    function __hbxXhrGet(url, token) {
      return new Promise((resolve) => {
        // always prefer freshest localStorage token (SPA may have refreshed)
        token = __hbxCleanToken() || token;
        const x = new XMLHttpRequest();
        x.open('GET', url, true);
        x.setRequestHeader('Accept', 'application/json');
        if (token) x.setRequestHeader('Authorization', 'Bearer ' + token);
        x.timeout = 120000;
        x.onload = () => {
          let json = null;
          try { json = JSON.parse(x.responseText); } catch (e) {}
          resolve({ status: x.status, json, text: x.responseText.slice(0, 5000) });
        };
        x.onerror = () => resolve({ status: 0, error: 'network' });
        x.ontimeout = () => resolve({ status: 0, error: 'timeout' });
        x.send();
      });
    }
    function __hbxXhrPost(url, token, body) {
      return new Promise((resolve) => {
        token = __hbxCleanToken() || token;
        const x = new XMLHttpRequest();
        x.open('POST', url, true);
        x.setRequestHeader('Accept', 'application/json');
        x.setRequestHeader('Content-Type', 'application/json');
        if (token) x.setRequestHeader('Authorization', 'Bearer ' + token);
        x.timeout = 120000;
        x.onload = () => {
          let json = null;
          try { json = JSON.parse(x.responseText); } catch (e) {}
          resolve({ status: x.status, json, text: x.responseText.slice(0, 8000) });
        };
        x.onerror = () => resolve({ status: 0, error: 'network' });
        x.ontimeout = () => resolve({ status: 0, error: 'timeout' });
        x.send(JSON.stringify(body));
      });
    }
  `;
}

/** Decode JWT payload from darwinToken string (Node side). */
export function parseDarwinTokenMeta(token) {
  if (!token) return { ok: false, error: "no_token" };
  const t = String(token).replace(/^"+|"+$/g, "");
  const parts = t.split(".");
  if (parts.length < 2) return { ok: true, jwt: false, len: t.length, token: t };
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(pad, "base64").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    const expInSec = payload.exp != null ? payload.exp - now : null;
    return {
      ok: true,
      jwt: true,
      len: t.length,
      token: t,
      sub: payload.sub || null,
      sessionId: payload.sessionId || null,
      iat: payload.iat || null,
      exp: payload.exp || null,
      expInSec,
      expInMin: expInSec != null ? Math.round(expInSec / 60) : null,
      expired: expInSec != null ? expInSec <= 0 : false,
      ttlHours: payload.iat && payload.exp ? +((payload.exp - payload.iat) / 3600).toFixed(2) : null,
    };
  } catch (e) {
    return { ok: true, jwt: false, len: t.length, token: t, parseError: String(e) };
  }
}

export async function readDarwinToken(page) {
  const token = await page.evaluate(() => {
    let t = localStorage.getItem("darwinToken") || "";
    return t.replace(/^"+|"+$/g, "");
  });
  return parseDarwinTokenMeta(token);
}

/**
 * Keep SPA session / JWT fresh.
 * - Prefer reading localStorage only — DO NOT thrash page.goto (multiple crawlers share CDP).
 * - Only navigate to main/login when token is missing or hard-expired.
 * Default minRemainingSec=15min — soft threshold; still skip reload if token valid >2min
 *   unless opts.forceNavigate=true
 */
export async function ensureFreshToken(page, configSite, opts = {}) {
  const minRemainingSec = Number(opts.minRemainingSec ?? 15 * 60);
  const forceNavigate = opts.forceNavigate === true;
  let meta = await readDarwinToken(page).catch(() => ({ ok: false }));
  // soft OK: token present and not expired (even if within minRemainingSec) — avoid reload storm
  if (meta.ok && meta.token && !meta.expired && (meta.expInSec == null || meta.expInSec > 120)) {
    if (meta.expInSec == null || meta.expInSec > minRemainingSec || !forceNavigate) {
      return { ...meta, refreshed: false, via: "localStorage" };
    }
  }
  // only navigate when missing/expired or force
  if (!meta.token || meta.expired || forceNavigate) {
    try {
      // if already on app domain with token after soft wait, skip
      const url = page.url();
      if (!/gta-travel|bedsonline/i.test(url)) {
        await page.goto(configSite.mainUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForTimeout(1500);
      }
    } catch {
      /* ignore navigation races between crawlers */
    }
    meta = await readDarwinToken(page).catch(() => ({ ok: false }));
    if (meta.ok && meta.token && !meta.expired) {
      return { ...meta, refreshed: true, via: "reload-main" };
    }
    // full login only if still no token
    if (!meta.token || meta.expired) {
      const session = await ensureSession(page, configSite, { skipIfToken: true });
      meta = parseDarwinTokenMeta(session.token);
      return { ...meta, refreshed: true, via: session.via || "login", ok: Boolean(session.ok && meta.token) };
    }
  }
  return { ...meta, refreshed: false, via: "localStorage-soft" };
}

/**
 * Ensure we have a darwinToken in this page's localStorage.
 * opts.skipIfToken: if token already present, do NOT navigate (critical for multi-crawler CDP).
 */
export async function ensureSession(page, configSite, opts = {}) {
  const skipIfToken = opts.skipIfToken !== false; // default true-ish: check token first
  let token = "";
  try {
    token = await page.evaluate(() => {
      let t = localStorage.getItem("darwinToken") || "";
      return t.replace(/^"+|"+$/g, "");
    });
  } catch {
    /* context destroyed */
  }
  if (token && skipIfToken) {
    return { ok: true, token, via: "existing-no-nav" };
  }

  try {
    await page.goto(configSite.mainUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);
  } catch {
    /* navigation race */
  }
  try {
    token = await page.evaluate(() => {
      let t = localStorage.getItem("darwinToken") || "";
      return t.replace(/^"+|"+$/g, "");
    });
  } catch {
    token = "";
  }
  if (token) return { ok: true, token, via: "existing" };

  // try login form — Chrome saved password / env
  const loginUrl = configSite.loginUrl;
  try {
    await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);
  } catch {
    /* ignore */
  }
  for (const sel of [
    "#CybotCookiebotDialogBodyButtonDecline",
    'button:has-text("拒绝")',
    'button:has-text("全部允许")',
  ]) {
    const el = page.locator(sel);
    if (await el.isVisible().catch(() => false)) await el.click().catch(() => {});
  }

  const user = process.env.BEDSONLINE_USERNAME || "";
  const pass = process.env.BEDSONLINE_PASSWORD || "";
  const userField = page.locator("#username");
  if (await userField.isVisible().catch(() => false)) {
    await userField.click();
    if (user) await userField.fill(user);
    const passField = page.locator("#password");
    await passField.click();
    if (pass) await passField.fill(pass);
    else {
      // focus password for Chrome password manager
      await page.waitForTimeout(1500);
    }
    if (user && pass) {
      await page.locator('button[data-qa="login-button"]').click().catch(() => {});
    }
    // wait for token (manual fill possible)
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      token = await page.evaluate(() => {
        let t = localStorage.getItem("darwinToken") || "";
        return t.replace(/^"+|"+$/g, "");
      });
      if (token) break;
      await page.waitForTimeout(2000);
    }
  }

  token = await page.evaluate(() => {
    let t = localStorage.getItem("darwinToken") || "";
    return t.replace(/^"+|"+$/g, "");
  });
  return { ok: Boolean(token), token, via: token ? "login" : "failed" };
}

export async function ftsHotels(page, { query, locale = "zh", size = 100, type = "HOTEL" }) {
  return page.evaluate(
    async ({ query, locale, size, type, helpers }) => {
      eval(helpers);
      const token = __hbxCleanToken();
      if (!token) return { status: 0, error: "no_token", hotels: [] };
      const url = `https://webapi.gta-travel.cn/client-content-api/1.0/fts?query=${encodeURIComponent(query)}&size=${size}&type=${type}&locale=${locale}`;
      const r = await __hbxXhrGet(url, token);
      return {
        status: r.status,
        hotels: r.json?.hotels || [],
        destinations: r.json?.destinations || [],
        error: r.error,
      };
    },
    { query, locale, size, type, helpers: injectXhrHelpers() },
  );
}

export async function fetchCnDestinations(page, locale = "zh") {
  return page.evaluate(
    async ({ locale, helpers }) => {
      eval(helpers);
      const token = __hbxCleanToken();
      const url = `https://webapi.gta-travel.cn/client-content-api/1.0/countries/CN/destinations?locale=${locale}`;
      const r = await __hbxXhrGet(url, token);
      return { status: r.status, destinations: r.json || [], error: r.error };
    },
    { locale, helpers: injectXhrHelpers() },
  );
}

/**
 * Calendar / hotel availability probe.
 * Paths mined from SPA webpack chunks (2026-07-29):
 *   POST /client-hotel-avail-api/3.0/hotels          — main search
 *   POST /client-hotel-avail-api/1.0/hotels/calendar — calendar chart
 *   POST /client-hotel-avail-api/2.0/hotels          — filtered search
 *   POST /client-hotel-avail-api/1.0/hotels          — filters base
 *   POST /client-hotel-avail-api/2.0/hotels/list     — catalog list
 * Note: client-btb-avail-api is for activities/carhire/transfer — NOT hotels.
 */
export async function probeCalendarApis(page, { hotelCode, checkIn, checkOut, destCode }) {
  return page.evaluate(
    async ({ hotelCode, checkIn, checkOut, destCode, helpers }) => {
      eval(helpers);
      const token = __hbxCleanToken();
      if (!token) return { ok: false, error: "no_token", probes: [] };

      const occ = [{ rooms: 1, adults: 2, children: 0 }];
      const stay = { checkIn, checkOut };
      const bodies = [
        {
          name: "hotelCodes_stay_occ",
          body: {
            hotelCodes: [String(hotelCode)],
            stay,
            occupancies: occ,
            pageSize: 20,
          },
        },
        {
          name: "hotelCodes_stay_occ_num",
          body: {
            hotelCodes: [Number(hotelCode) || hotelCode],
            stay,
            occupancies: occ,
            pageSize: 20,
          },
        },
        {
          name: "destCode_stay_occ",
          body: {
            destinationCode: destCode,
            stay,
            occupancies: occ,
            pageSize: 20,
          },
        },
        {
          name: "destination_obj",
          body: {
            stay,
            occupancies: occ,
            destination: { code: destCode },
            pageSize: 20,
          },
        },
        {
          name: "calendar_hotel",
          body: {
            hotelCodes: [String(hotelCode)],
            stay,
            occupancies: occ,
          },
        },
        {
          name: "calendar_dest",
          body: {
            destinationCode: destCode,
            stay,
            occupancies: occ,
          },
        },
      ];

      // SPA-confirmed hotel paths first, then legacy guesses
      const paths = [
        "/client-hotel-avail-api/3.0/hotels",
        "/client-hotel-avail-api/1.0/hotels/calendar",
        "/client-hotel-avail-api/4.0/hotels",
        "/client-hotel-avail-api/2.0/hotels",
        "/client-hotel-avail-api/1.0/hotels",
        "/client-hotel-avail-api/2.0/hotels/list",
        "/client-hotel-avail-api/1.0/hotels/suggested",
        // old wrong guesses kept last for comparison only
        "/client-hotel-avail-api/1.0/hotels/availability",
        "/client-btb-avail-api/1.0/hotels/availability",
      ];

      const probes = [];
      for (const p of paths) {
        for (const b of bodies) {
          // calendar endpoint: only try calendar_* bodies first
          if (p.includes("/calendar") && !b.name.startsWith("calendar") && b.name !== "hotelCodes_stay_occ") {
            continue;
          }
          // locale is required query param (422 without it — confirmed live 2026-07-29)
          const url = "https://webapi.gta-travel.cn" + p + (p.includes("?") ? "&" : "?") + "locale=zh";
          const r = await __hbxXhrPost(url, token, b.body);
          const preview = (r.text || "").slice(0, 500);
          const entry = {
            path: p + "?locale=zh",
            body: b.name,
            status: r.status,
            preview,
            keys: r.json && !Array.isArray(r.json) ? Object.keys(r.json).slice(0, 25) : null,
            arrayLen:
              Array.isArray(r.json)
                ? r.json.length
                : r.json?.hotels?.length ??
                  r.json?.hotel?.length ??
                  r.json?.avail?.length ??
                  r.json?.rates?.length ??
                  r.json?.calendar?.length ??
                  null,
          };
          probes.push(entry);
          const looksHit =
            r.status === 200 &&
            (r.text || "").length > 80 &&
            !/Not Found|404|"error"\s*:\s*"Not Found"/i.test(r.text || "") &&
            !/UnprocessableRequest/i.test(r.text || "");
          if (looksHit) {
            return { ok: true, hit: entry, probes, source: "spa-mined-paths-2026-07-29" };
          }
        }
      }
      return { ok: false, probes, source: "spa-mined-paths-2026-07-29" };
    },
    { hotelCode, checkIn, checkOut, destCode, helpers: injectXhrHelpers() },
  );
}

export function hasCjk(s) {
  return /[\u4e00-\u9fff]/.test(s || "");
}

export function mergeHotelRecords(zhList, enList, destCode) {
  const map = new Map();
  const take = (h, locale) => {
    if (!h?.id) return;
    if (h.destinationId && destCode && h.destinationId !== destCode) return;
    const id = String(h.id);
    const rec = map.get(id) || {
      hotelCode: id,
      nameZh: null,
      nameEn: null,
      countryId: h.countryId || "CN",
      destinationId: h.destinationId || destCode || null,
      destinationZh: null,
      destinationEn: null,
      zoneId: h.zoneId || null,
      zoneZh: null,
      zoneEn: null,
      weight: h.weight ?? null,
    };
    const name = h.hotelDescription || null;
    if (name) {
      if (hasCjk(name)) rec.nameZh = rec.nameZh || name;
      else rec.nameEn = rec.nameEn || name;
    }
    if (h.destinationDescription) {
      if (hasCjk(h.destinationDescription)) rec.destinationZh = rec.destinationZh || h.destinationDescription;
      else rec.destinationEn = rec.destinationEn || h.destinationDescription;
    }
    if (h.zoneDescription) {
      if (hasCjk(h.zoneDescription)) rec.zoneZh = rec.zoneZh || h.zoneDescription;
      else rec.zoneEn = rec.zoneEn || h.zoneDescription;
    }
    if (!rec.zoneId && h.zoneId) rec.zoneId = h.zoneId;
    if (h.weight != null) rec.weight = Math.max(rec.weight ?? 0, h.weight);
    map.set(id, rec);
  };
  for (const h of zhList || []) take(h, "zh");
  for (const h of enList || []) take(h, "en");
  return [...map.values()].sort((a, b) => a.hotelCode.localeCompare(b.hotelCode));
}
