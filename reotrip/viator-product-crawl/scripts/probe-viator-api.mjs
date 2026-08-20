import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

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

const apis = [];
page.on('response', async (res) => {
  const url = res.url();
  const req = res.request();
  const rt = req.resourceType();
  if (!['xhr', 'fetch'].includes(rt)) return;
  let body = '';
  try {
    body = await res.text();
  } catch {
    body = '';
  }
  apis.push({
    status: res.status(),
    method: req.method(),
    url,
    postData: (req.postData() || '').slice(0, 3000),
    bodyLen: body.length,
    bodyHead: body.slice(0, 2500),
  });
});

const structure = await page.evaluate(() => {
  const items = [...document.querySelectorAll('li[class*="ProductListItem__productListItem"]')];
  const pagination = document.body.innerText.match(/page|Load more|Show more|下一|下頁|Next|of \d+/gi);
  const buttons = [...document.querySelectorAll('button, a')].map((el) => ({
    tag: el.tagName,
    text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 80),
    cls: (el.className || '').toString().slice(0, 120),
    href: el.getAttribute('href'),
  })).filter((x) => x.text && /page|next|more|load|filter|active|create|product/i.test(x.text));
  const firstHref = items[0]?.querySelector('a')?.href || null;
  const allHrefs = items.slice(0, 5).map((li) => [...li.querySelectorAll('a')].map((a) => a.href));
  return {
    itemCount: items.length,
    firstHref,
    allHrefs,
    pagination,
    buttons: buttons.slice(0, 40),
    scrollH: document.documentElement.scrollHeight,
    innerH: window.innerHeight,
  };
});

console.log('structure', JSON.stringify(structure, null, 2));

// slow scroll a bit to trigger more loads
for (let i = 0; i < 4; i++) {
  await page.evaluate(() => window.scrollBy(0, Math.floor(window.innerHeight * 0.8)));
  await sleep(1200 + Math.floor(Math.random() * 800));
}

await sleep(1500);
const after = await page.evaluate(() => ({
  itemCount: document.querySelectorAll('li[class*="ProductListItem__productListItem"]').length,
  scrollY: window.scrollY,
  scrollH: document.documentElement.scrollHeight,
}));
console.log('after scroll', after);
console.log('api count', apis.length);
for (const a of apis) {
  console.log('\nAPI', a.method, a.status, a.url.slice(0, 180), 'len', a.bodyLen);
  if (a.postData) console.log('POST', a.postData.slice(0, 400));
  console.log('HEAD', a.bodyHead.slice(0, 400));
}
fs.writeFileSync('data/probe-viator-api.json', JSON.stringify({ structure, after, apis }, null, 2));
await page.screenshot({ path: 'artifacts/screenshots/viator-list-scrolled.png' });
console.log('saved');
