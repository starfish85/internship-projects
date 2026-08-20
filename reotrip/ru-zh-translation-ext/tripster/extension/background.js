/* Service worker: settings bootstrap + ru→zh body translation. */

const DEFAULTS = { enabled: true, highlight: false };
const cache = new Map();
const MAX_CACHE = 800;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(DEFAULTS, (cur) => {
    chrome.storage.local.set({ ...DEFAULTS, ...cur });
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "TS_TRANSLATE") return;
  translateBatch(msg.texts || [])
    .then(sendResponse)
    .catch(() => sendResponse((msg.texts || []).map(() => null)));
  return true;
});

async function translateBatch(texts) {
  const out = new Array(texts.length);
  const pending = [];
  texts.forEach((t, i) => {
    const key = normalize(t);
    if (cache.has(key)) out[i] = cache.get(key);
    else pending.push({ i, t, key });
  });
  const CONCURRENCY = 4;
  let cursor = 0;
  async function worker() {
    while (cursor < pending.length) {
      const job = pending[cursor++];
      try {
        const zh = await translateOne(job.t);
        out[job.i] = zh;
        remember(job.key, zh);
      } catch (_) {
        out[job.i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));
  return out;
}

function remember(key, val) {
  if (!val) return;
  cache.set(key, val);
  if (cache.size > MAX_CACHE) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
}

function normalize(s) {
  return String(s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

async function translateOne(text) {
  const q = normalize(text);
  if (!q) return q;
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=zh-CN&dt=t&q=" +
    encodeURIComponent(q);
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error("mt " + res.status);
  const data = await res.json();
  const parts = Array.isArray(data && data[0]) ? data[0] : [];
  const joined = parts.map((p) => (p && p[0]) || "").join("");
  return joined.trim() || null;
}
