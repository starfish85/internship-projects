import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('data', { recursive: true });

const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const page = pages.find((p) => (p.url() || '').includes('supplier.viator.com/products'));
if (!page) {
  console.error('no viator tab');
  process.exit(1);
}

const fetchPage = async (pageNo) => {
  return page.evaluate(async (n) => {
    const url = `/products/api/summary/list?pageNo=${n}`;
    const res = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } });
    const text = await res.text();
    return { status: res.status, url: res.url, headers: Object.fromEntries(res.headers.entries()), text };
  }, pageNo);
};

const all = [];
const pagesMeta = [];
let pageNo = 1;
let totalPages = null;
let totalCount = null;

while (pageNo <= 20) {
  console.log(`fetching pageNo=${pageNo} ...`);
  const raw = await fetchPage(pageNo);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(`data/viator-api-page-${pageNo}.json`, JSON.stringify(raw, null, 2));
  console.log(' status', raw.status, 'len', raw.text.length, 'url', raw.url);
  if (raw.status !== 200) {
    console.error('stopped: non-200');
    console.error(raw.text.slice(0, 500));
    break;
  }
  let json;
  try {
    json = JSON.parse(raw.text);
  } catch (e) {
    console.error('not json', raw.text.slice(0, 300));
    break;
  }
  const keys = json && typeof json === 'object' ? Object.keys(json) : [];
  console.log(' keys', keys);
  pagesMeta.push({ pageNo, keys, preview: JSON.stringify(json).slice(0, 500) });

  // try common shapes
  const items =
    json.products ||
    json.items ||
    json.data?.products ||
    json.data?.items ||
    json.data?.list ||
    json.list ||
    json.content ||
    json.result ||
    (Array.isArray(json) ? json : null);

  const pageInfo = json.page || json.pagination || json.data?.page || {};
  if (json.totalPages) totalPages = json.totalPages;
  if (json.total) totalCount = json.total;
  if (pageInfo.totalPages) totalPages = pageInfo.totalPages;
  if (pageInfo.totalElements) totalCount = pageInfo.totalElements;
  if (json.totalCount) totalCount = json.totalCount;
  if (json.data?.totalCount) totalCount = json.data.totalCount;
  if (json.data?.totalPages) totalPages = json.data.totalPages;

  if (!items) {
    console.log('unknown shape, saving and stopping after first page inspect');
    fs.writeFileSync('data/viator-api-page-1-parsed.json', JSON.stringify(json, null, 2).slice(0, 20000));
    console.log(JSON.stringify(json, null, 2).slice(0, 2000));
    break;
  }

  const arr = Array.isArray(items) ? items : [];
  console.log(` got ${arr.length} items, totalPages=${totalPages} totalCount=${totalCount}`);
  all.push(...arr);
  if (arr.length === 0) break;
  if (totalPages && pageNo >= totalPages) break;
  if (totalCount && all.length >= totalCount) break;
  if (!totalPages && arr.length < 10) break;

  pageNo += 1;
  await sleep(2200 + Math.floor(Math.random() * 1200));
}

fs.writeFileSync('data/viator-active-api.json', JSON.stringify({
  harvestedAt: new Date().toISOString(),
  totalPages,
  totalCount,
  count: all.length,
  pagesMeta,
  products: all,
}, null, 2));
console.log('DONE count=', all.length);
if (all[0]) console.log('first item keys', Object.keys(all[0]));
process.exit(0);
