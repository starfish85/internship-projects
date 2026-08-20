import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const CODE = '5514894P483';
const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages())
  .find((p) => (p.url() || '').includes('supplier.viator.com'));

const raw = await page.evaluate(async (code) => {
  const urls = [
    `/product/${code}`,
    `/product/${code}/pricingAndSchedule`,
  ];
  const out = {};
  for (const u of urls) {
    const res = await fetch(u, { credentials: 'include', headers: { accept: 'text/html' } });
    const text = await res.text();
    const m = text.match(/Object\.assign\(window,\s*\{"__PRELOADED_STATE__":(\{.*?\})\}\);/s)
      || text.match(/__PRELOADED_STATE__":(\{.*?\}),"__/);
    out[u] = {
      status: res.status,
      len: text.length,
      hasPreload: text.includes('__PRELOADED_STATE__'),
      idx: text.indexOf('__PRELOADED_STATE__'),
      snippet: text.includes('__PRELOADED_STATE__')
        ? text.slice(text.indexOf('__PRELOADED_STATE__'), text.indexOf('__PRELOADED_STATE__') + 400)
        : text.slice(0, 200),
    };
  }
  return out;
}, CODE);

console.log(JSON.stringify(raw, null, 2));

// extract full preload from product page html via a more robust parse
const html = await page.evaluate(async (code) => {
  const res = await fetch(`/product/${code}/pricingAndSchedule`, { credentials: 'include' });
  return { status: res.status, text: await res.text() };
}, CODE);

fs.writeFileSync('data/probe-preload-html.txt', html.text);
console.log('html status', html.status, 'len', html.text.length);

const start = html.text.indexOf('{"__PRELOADED_STATE__":');
const assignIdx = html.text.indexOf('Object.assign(window, {"__PRELOADED_STATE__":');
console.log('start', start, 'assign', assignIdx);

process.exit(0);
