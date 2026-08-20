import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('data', { recursive: true });

const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const page = pages.find((p) => (p.url() || '').includes('supplier.viator.com/products'));
if (!page) process.exit(1);

const fetchOnce = (url) => page.evaluate(async (u) => {
  const res = await fetch(u, { credentials: 'include', headers: { accept: 'application/json' } });
  const text = await res.text();
  return { status: res.status, url: res.url, text };
}, url);

// probe a few query shapes on page 1
const probes = [
  '/products/api/summary/list?pageNo=1&status=ACTIVE',
  '/products/api/summary/list?pageNo=1&statuses=ACTIVE',
  '/products/api/summary/list?pageNo=1&statusFilter=ACTIVE',
  '/products/api/summary/list?pageNo=1&filter=ACTIVE',
];

for (const u of probes) {
  const raw = await fetchOnce(u);
  let parsed = null;
  try { parsed = JSON.parse(raw.text); } catch {}
  console.log(u, 'http', raw.status, 'total', parsed?.totalNumberOfProducts, 'pages', parsed?.noOfPages, 'items', parsed?.products?.length, 'active', parsed?.products?.filter(p => p.isActive).length);
  await sleep(1500 + Math.floor(Math.random() * 600));
}

process.exit(0);
