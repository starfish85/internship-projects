import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const HBX_PORT_AVAILABILITY_URL =
  "https://webapi.gta-travel.cn/client-btb-avail-api/2.0/transfer/availability";
export const HBX_ALLOWED_HOSTS = new Set(["webapi.gta-travel.cn", "app-bedsonline.gta-travel.cn"]);
export const FORBIDDEN_ENDPOINT_RE =
  /\/(?:cart|carts|checkout|confirm|confirmation|booking|bookings|order|orders|cancel|cancellation|refund|payment|payments)(?:\/|$)/i;

const DEFAULT_TOKEN_CACHES = [
  process.env.HBX_PORTAL_TOKEN_CACHE_PATH,
  "/Users/mark/.cache/hbx-portal/refresh-output.local.json",
].filter(Boolean);

function sha256(value) {
  return `sha256:${createHash("sha256").update(String(value)).digest("hex")}`;
}

function positiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function codeOf(value) {
  return value && typeof value === "object" ? value.code ?? null : value ?? null;
}

function tokenExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split(".")[1] || "", "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function assertActiveToken(token) {
  if (tokenExpiry(token) && tokenExpiry(token) <= Date.now()) {
    const error = new Error("NEEDS_HUMAN_HBX_SESSION_EXPIRED");
    error.needsHuman = true;
    throw error;
  }
  return token;
}

function parseCachedToken(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const parsed = JSON.parse(start >= 0 && end >= start ? raw.slice(start, end + 1) : raw);
  return typeof parsed?.darwinToken === "string" ? parsed.darwinToken : null;
}

export function assertReadOnlyHbxEndpoint(urlOrPath) {
  const url = new URL(urlOrPath, HBX_PORT_AVAILABILITY_URL);
  if (!HBX_ALLOWED_HOSTS.has(url.hostname)) throw new Error(`Unsupported HBX host: ${url.hostname}`);
  if (FORBIDDEN_ENDPOINT_RE.test(url.pathname)) throw new Error(`Blocked non-read HBX endpoint: ${url.pathname}`);
  return url.toString();
}

export async function readHbxPortToken({ env = process.env, cachePaths = DEFAULT_TOKEN_CACHES } = {}) {
  const envToken = String(env.HBX_PORTAL_DARWIN_TOKEN || "").trim();
  if (envToken) return assertActiveToken(envToken);

  for (const cachePath of cachePaths) {
    try {
      const cachedToken = parseCachedToken(await readFile(cachePath, "utf8"));
      if (cachedToken) return assertActiveToken(cachedToken);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      if (error?.needsHuman) throw error;
      throw new Error("NEEDS_HUMAN_HBX_TOKEN_CACHE_UNREADABLE");
    }
  }

  const error = new Error("NEEDS_HUMAN_HBX_SESSION_MISSING");
  error.needsHuman = true;
  throw error;
}

export function buildPortAvailabilityRequest({ terminal, travelDate, direction }) {
  const terminalCode = String(terminal.terminal.code);
  const hotelCode = String(terminal.seedHotel.code);
  const arrival = direction === "arrival_port_to_hotel";
  return {
    locale: "zh",
    type: "ONE_WAY",
    serviceDate: { initDate: { date: travelDate } },
    passengers: [{ adults: 2, children: 0, childrenAges: [] }],
    arrival: {
      pickupLocation: arrival ? { code: terminalCode, type: "P" } : { code: hotelCode, type: "H" },
      destinationLocation: arrival ? { code: hotelCode, type: "H" } : { code: terminalCode, type: "P" },
    },
  };
}

export function normalizePortAvailability(body) {
  const rows = Array.isArray(body?.avail) ? body.avail : [];
  return rows
    .map((row) => {
      const spec = row.productTransferSpecifications ?? {};
      const serviceCode = codeOf(spec.masterServiceType);
      const serviceType = serviceCode === "PRVT" ? "private" : serviceCode === "SHRD" ? "shared" : "unknown";
      return {
        amount: positiveNumber(row.totalAmount),
        currency: String(row.currency?.code || row.currency || "CNY").toUpperCase(),
        serviceType,
        serviceTypeCode: serviceCode || null,
        vehicleCode: codeOf(spec.masterVehicleType),
        rateKeyHash: row.rateKey ? sha256(row.rateKey) : null,
        serviceId: row.arrival?.serviceId ?? null,
      };
    })
    .filter((row) => row.amount != null);
}

export class HbxPortSource {
  constructor({ fetchImpl = globalThis.fetch, timeoutMs = 20_000, tokenReader = readHbxPortToken } = {}) {
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.tokenReader = tokenReader;
    this.token = null;
  }

  async ready() {
    if (!this.token) this.token = await this.tokenReader();
  }

  async availability({ terminal, travelDate, direction }) {
    await this.ready();
    const endpoint = assertReadOnlyHbxEndpoint(`${HBX_PORT_AVAILABILITY_URL}?locale=zh`);
    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildPortAvailabilityRequest({ terminal, travelDate, direction })),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (response.status === 401 || response.status === 403) {
      const error = new Error(`NEEDS_HUMAN_HBX_SESSION_EXPIRED http_${response.status}`);
      error.needsHuman = true;
      throw error;
    }
    if (!response.ok) throw new Error(`HBX transfer availability responded ${response.status}`);
    return normalizePortAvailability(await response.json().catch(() => ({})));
  }
}
