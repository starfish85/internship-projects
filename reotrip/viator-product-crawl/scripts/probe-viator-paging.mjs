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

const apis = [];
const onRes = async (res) => {
  const req = res.request();
  const rt = req.resourceType();
  if (!['xhr', 'fetch'].includes(rt)) return;
  let body = '';
  try { body = await res.text(); } catch { body = ''; }
  apis.push({
    status: res.status(),
    method: req.method(),
    url: res.url(),
    headers: req.headers(),
    postData: req.postData() || '',
    bodyLen: body.length,
    bodyHead: body.slice(0, 4000),
  });
};
page.on('response', onRes);

await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await sleep(1500);

const bottom = await page.evaluate(() => {
  const navs = [...document.querySelectorAll('nav, [class*="page"], [class*="Page"], [class*="Pagination"], [role="navigation"]')]
    .map((el) => ({
      tag: el.tagName,
      cls: (el.className || '').toString().slice(0, 160),
      text: (el.innerText || '').trim().slice(0, 200),
    }));
  const numbered = [...document.querySelectorAll('button, a, span, li')]
    .filter((el) => /^\d+$/.test((el.innerText || '').trim()) || /next|prev|上一|下一|»|«/i.test((el.innerText || el.getAttribute('aria-label') || '')))
    .map((el) => ({
      tag: el.tagName,
      text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40),
      cls: (el.className || '').toString().slice(0, 140),
      aria: el.getAttribute('aria-label'),
    }));
  return {
    url: location.href,
    itemCount: document.querySelectorAll('li[class*="ProductListItem__productListItem"]').length,
    navs,
    numbered: numbered.slice(0, 40),
    lastText: document.body.innerText.slice(-800),
  };
});
console.log('BOTTOM', JSON.stringify(bottom, null, 2));
await page.screenshot({ path: 'artifacts/screenshots/viator-list-bottom.png', fullPage: false });

console.log('reloading once to capture API...');
await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
await sleep(2500);

const afterReload = await page.evaluate(() => ({
  url: location.href,
  itemCount: document.querySelectorAll('li[class*="ProductListItem__productListItem"]').length,
  header: document.body.innerText.match(/\d+\s+products?/i)?.[0] || null,
}));
console.log('AFTER RELOAD', afterReload);
console.log('API COUNT', apis.length);
for (const a of apis) {
  const interesting = /product|graphql|supplier|search|list/i.test(a.url) || a.bodyLen > 500;
  if (!interesting) continue;
  console.log('\n---', a.method, a.status, a.url.slice(0, 220), 'len', a.bodyLen);
  if (a.postData) console.log('POST', a.postData.slice(0, 600));
  console.log(a.bodyHead.slice(0, 500));
}
fs.writeFileSync('data/probe-viator-paging.json', JSON.stringify({ bottom, afterReload, apis: apis.map(({ headers, ...rest }) => rest) }, null, 2));
page.off('response', onRes);
console.log('done');
process.exit(0);
