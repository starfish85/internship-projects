import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('supplier.viator.com/products'));

const urls = [
  '/products/api/summary/list?pageNo=0',
  '/products/api/summary/list?pageNo=1&sortBy=CREATED_DESC',
  '/products/api/summary/list?pageNo=1&sortBy=LAST_UPDATED',
  '/products/api/summary/list?pageNo=1&sort=lastUpdated',
];

for (const u of urls) {
  const raw = await page.evaluate(async (url) => {
    const res = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } });
    const text = await res.text();
    return { status: res.status, text };
  }, u);
  let body = null;
  try { body = JSON.parse(raw.text); } catch {}
  const items = body?.products || [];
  console.log('\n', u, 'http', raw.status, 'n', items.length, 'total', body?.totalNumberOfProducts);
  console.log(items.slice(0, 5).map((p) => `${p.status} ${p.productCode} ${p.title}`).join('\n'));
  await new Promise((r) => setTimeout(r, 1600));
}
process.exit(0);
