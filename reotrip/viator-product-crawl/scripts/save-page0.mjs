import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('supplier.viator.com/products'));
const raw = await page.evaluate(async () => {
  const res = await fetch('/products/api/summary/list?pageNo=0', { credentials: 'include', headers: { accept: 'application/json' } });
  const text = await res.text();
  return { status: res.status, url: res.url, text };
});
fs.writeFileSync('data/viator-api-page-0.json', JSON.stringify(raw, null, 2));
const body = JSON.parse(raw.text);
console.log('saved page0', body.products.length, body.products[0].productCode, body.totalNumberOfProducts);
process.exit(0);
