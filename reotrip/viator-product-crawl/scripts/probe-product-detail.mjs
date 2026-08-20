import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const CODE = '5514894P483';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('data', { recursive: true });
fs.mkdirSync('artifacts/screenshots', { recursive: true });

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];

const apis = [];
const page = await context.newPage();
page.on('response', async (res) => {
  const req = res.request();
  const rt = req.resourceType();
  if (!['xhr', 'fetch'].includes(rt)) return;
  const url = res.url();
  if (/google|facebook|adroll|qualtrics|salesforce|baryon|intake\/v2|tracking\/action|datadome|doubleclick|analytics/i.test(url)) return;
  let body = '';
  try { body = await res.text(); } catch { body = ''; }
  apis.push({
    status: res.status(),
    method: req.method(),
    url,
    postData: (req.postData() || '').slice(0, 1500),
    bodyLen: body.length,
    bodyHead: body.slice(0, 1500),
  });
});

const tryUrls = [
  `https://supplier.viator.com/products/${CODE}`,
  `https://supplier.viator.com/products/${CODE}/`,
  `https://supplier.viator.com/products/${CODE}/availability`,
  `https://supplier.viator.com/product/${CODE}`,
];

for (const u of tryUrls) {
  console.log('goto', u);
  try {
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 });
  } catch (e) {
    console.log('goto err', e.message.slice(0, 200));
  }
  await sleep(3500);
  console.log('now', page.url(), 'title', await page.title());
  const text = await page.evaluate(() => (document.body?.innerText || '').slice(0, 1500));
  console.log('TEXT\n', text.slice(0, 800));
  if (!/login|sign in|404|not found/i.test(text) && text.length > 200) break;
}

await page.screenshot({ path: 'artifacts/screenshots/product-detail-probe.png' });
console.log('\nAPI COUNT', apis.length);
for (const a of apis) {
  console.log('\n', a.method, a.status, a.url.slice(0, 220), 'len', a.bodyLen);
  if (a.postData) console.log(' POST', a.postData.slice(0, 300));
  console.log(' ', a.bodyHead.slice(0, 280).replace(/\s+/g, ' '));
}
fs.writeFileSync('data/probe-product-detail.json', JSON.stringify({ url: page.url(), apis }, null, 2));
await page.close();
console.log('closed extra tab');
process.exit(0);
