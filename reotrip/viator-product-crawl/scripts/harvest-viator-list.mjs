import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('data', { recursive: true });
fs.mkdirSync('artifacts/screenshots', { recursive: true });

const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const page = pages.find((p) => (p.url() || '').includes('supplier.viator.com/products'));
if (!page) {
  console.error('no viator tab');
  process.exit(1);
}

await page.bringToFront();

const stateHints = await page.evaluate(() => {
  const keys = Object.keys(window).filter((k) =>
    /data|state|store|apollo|redux|__NEXT|__NUXT|viator|product/i.test(k)
  ).slice(0, 80);
  const next = window.__NEXT_DATA__ ? JSON.stringify(window.__NEXT_DATA__).slice(0, 300) : null;
  return { keys, next, hasApollo: !!window.__APOLLO_STATE__, href: location.href };
});
console.log('state hints', JSON.stringify(stateHints, null, 2));

const extract = () => page.evaluate(() => {
  const header = (document.body.innerText.match(/(\d+)\s+products?/i) || [])[1] || null;
  const items = [...document.querySelectorAll('li[class*="ProductListItem__productListItem"]')];
  const products = items.map((li) => {
    const text = li.innerText || '';
    const nameEl = li.querySelector('h2, h3, [class*="productName"], [class*="ProductName"], [class*="title"]');
    const nameFromEl = (nameEl?.innerText || '').trim();
    const code = (text.match(/Product code:\s*([A-Z0-9]+)/i) || text.match(/(5514894P\d+)/i) || [])[1] || null;
    let name = nameFromEl;
    if (!name) {
      const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
      name = lines.find((l) => !/^(Active|Improve|Manage|Clone|Fully connected|Good|View on Viator|Product code)/i.test(l) && !/^\d+\s+review/i.test(l)) || '';
    }
    const view = [...li.querySelectorAll('a')].map((a) => a.href).filter(Boolean);
    return {
      name,
      code,
      status: /Active/i.test(text) ? 'Active' : null,
      connected: /Fully connected/i.test(text),
      viewLinks: view,
      text: text.slice(0, 300),
    };
  });
  return {
    headerCount: header ? Number(header) : null,
    domCount: products.length,
    products,
    scrollY: window.scrollY,
    scrollH: document.documentElement.scrollHeight,
  };
});

await page.evaluate(() => window.scrollTo(0, 0));
await sleep(800);

const byCode = new Map();
let stale = 0;
let lastDom = 0;

for (let i = 0; i < 40; i++) {
  const snap = await extract();
  for (const p of snap.products) {
    if (p.code && !byCode.has(p.code)) byCode.set(p.code, p);
  }
  console.log(`scroll#${i} header=${snap.headerCount} dom=${snap.domCount} unique=${byCode.size} y=${snap.scrollY}/${snap.scrollH}`);

  if (snap.headerCount && byCode.size >= snap.headerCount) break;
  if (snap.domCount === lastDom) stale += 1;
  else stale = 0;
  lastDom = snap.domCount;
  if (stale >= 4 && byCode.size >= 20) {
    // try jump to bottom once more
    if (stale === 4) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await sleep(1800 + Math.floor(Math.random() * 700));
      continue;
    }
    break;
  }

  await page.evaluate(() => window.scrollBy(0, Math.floor(window.innerHeight * 0.7)));
  await sleep(1400 + Math.floor(Math.random() * 900));
}

const products = [...byCode.values()];
const payload = {
  harvestedAt: new Date().toISOString(),
  url: page.url(),
  unique: products.length,
  products,
};
fs.writeFileSync('data/viator-active-raw.json', JSON.stringify(payload, null, 2));
await page.screenshot({ path: 'artifacts/screenshots/viator-list-after-harvest.png' });
console.log('HARVESTED', products.length);
console.log(products.slice(0, 5).map((p) => `${p.code} ${p.name}`).join('\n'));
console.log('...');
console.log(products.slice(-5).map((p) => `${p.code} ${p.name}`).join('\n'));
process.exit(0);
