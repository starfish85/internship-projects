import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const CODE = '5514894P483'; // Tokyo Tower Top Deck — known option in task screenshot
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages())
  .find((p) => (p.url() || '').includes('supplier.viator.com'));
if (!page) {
  console.error('no viator tab');
  process.exit(1);
}

const candidates = [
  `/products/api/${CODE}`,
  `/products/api/${CODE}/options`,
  `/products/api/details/${CODE}`,
  `/products/api/detail/${CODE}`,
  `/products/api/summary/${CODE}`,
  `/products/api/options/${CODE}`,
  `/products/api/${CODE}/tours`,
  `/products/api/${CODE}/availability`,
  `/products/api/${CODE}/pricing`,
  `/products/${CODE}/api/options`,
  `/api/products/${CODE}`,
  `/api/products/${CODE}/options`,
  `/product/${CODE}/options`,
  `/products/api/product/${CODE}`,
  `/v1/products/${CODE}`,
  `/v1/products/${CODE}/options`,
];

const results = [];
for (const u of candidates) {
  const raw = await page.evaluate(async (url) => {
    try {
      const res = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } });
      const text = await res.text();
      return { status: res.status, ct: res.headers.get('content-type'), len: text.length, head: text.slice(0, 400) };
    } catch (e) {
      return { status: 0, error: String(e) };
    }
  }, u);
  console.log(raw.status, raw.len || 0, u, (raw.head || raw.error || '').slice(0, 120).replace(/\s+/g, ' '));
  results.push({ u, ...raw });
  await sleep(400);
}

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/probe-option-api.json', JSON.stringify(results, null, 2));

// also scan loaded scripts for option endpoint strings
const jsHits = await page.evaluate(() => {
  const urls = [...document.scripts].map((s) => s.src).filter(Boolean);
  return urls;
});
console.log('\nscripts', jsHits.length);
const interesting = jsHits.filter((u) => /product|option|avail|pric|tour|common/i.test(u));
console.log(interesting.slice(0, 30).join('\n'));
process.exit(0);
