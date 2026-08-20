import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CDP = 'http://127.0.0.1:9222';
const OUT = path.resolve('artifacts');
fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
fs.mkdirSync('data', { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.connectOverCDP(CDP);
const contexts = browser.contexts();
const pages = contexts.flatMap((c) => c.pages());
const viator = pages.find((p) => (p.url() || '').includes('supplier.viator.com/products'));
if (!viator) {
  console.error('Viator products tab not found. Open tabs:');
  for (const p of pages) console.error(' -', p.url());
  process.exit(1);
}

console.log('attached:', viator.url());
await viator.bringToFront();
await sleep(800);

const captured = [];
viator.on('response', async (res) => {
  const url = res.url();
  if (!/viator|tripadvisor|supplier/i.test(url)) return;
  const ct = (res.headers()['content-type'] || '').toLowerCase();
  if (!/json|graphql|javascript/.test(ct) && !/api|graphql|product/i.test(url)) return;
  let body = null;
  try {
    if (/json|graphql/.test(ct) || /api|graphql/i.test(url)) {
      body = await res.text();
      if (body.length > 400000) body = body.slice(0, 400000) + '...TRUNC';
    }
  } catch {}
  captured.push({
    status: res.status(),
    method: res.request().method(),
    url,
    ct,
    bodyPreview: body ? body.slice(0, 2000) : null,
    bodyLen: body ? body.length : 0,
  });
});

const info = await viator.evaluate(() => {
  const text = document.body?.innerText?.slice(0, 4000) || '';
  const cards = [];
  const candidates = document.querySelectorAll('[class*="product"], article, li, a, [data-testid], [role="listitem"]');
  const seen = new Set();
  for (const el of candidates) {
    const t = (el.innerText || '').trim();
    if (!t || t.length < 20 || t.length > 800) continue;
    if (!/產品代碼|产品代码|Product code|P\d{2,}/i.test(t)) continue;
    const key = t.slice(0, 180);
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({
      tag: el.tagName,
      cls: (el.className || '').toString().slice(0, 160),
      testid: el.getAttribute('data-testid'),
      href: el.href || el.getAttribute('href'),
      text: t.slice(0, 400),
    });
    if (cards.length >= 8) break;
  }
  return {
    title: document.title,
    url: location.href,
    ready: document.readyState,
    textSample: text,
    cardCountHint: cards.length,
    cards,
  };
});

await viator.screenshot({
  path: path.join(OUT, 'screenshots', 'viator-list-probe.png'),
  fullPage: false,
});
fs.writeFileSync('data/probe-viator-list.json', JSON.stringify({ info, captured: captured.slice(-30) }, null, 2));
console.log(JSON.stringify({ url: info.url, title: info.title, cards: info.cardCountHint, captured: captured.length }, null, 2));
console.log('--- text sample ---');
console.log(info.textSample.slice(0, 1500));
console.log('--- cards ---');
console.log(JSON.stringify(info.cards, null, 2));
await browser.close();
