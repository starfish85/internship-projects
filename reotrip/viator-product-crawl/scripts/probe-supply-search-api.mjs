import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('data', { recursive: true });

const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const ctrip = pages.find((p) => (p.url() || '').includes('travelagents.trip.com'));
const klook = pages.find((p) => (p.url() || '').includes('klook.klktech.com'));

const attach = (page, bag) => {
  const onRes = async (res) => {
    const req = res.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return;
    const url = res.url();
    if (/google|facebook|sentry|datadog|hotjar|clarity|collect|telemetry/i.test(url)) return;
    let body = '';
    try { body = await res.text(); } catch { body = ''; }
    if (body.length < 80 && res.status() === 200) return;
    bag.push({
      status: res.status(),
      method: req.method(),
      url,
      postData: (req.postData() || '').slice(0, 2500),
      bodyLen: body.length,
      bodyHead: body.slice(0, 1800),
    });
  };
  page.on('response', onRes);
  return () => page.off('response', onRes);
};

// ---- Ctrip search Tokyo Disneyland ----
const cApis = [];
const offC = attach(ctrip, cApis);
await ctrip.bringToFront();
const cInput = ctrip.locator('input[placeholder*="product ID"], input[placeholder*="keyword"]').first();
await cInput.click();
await cInput.fill('');
await sleep(400);
await cInput.type('Tokyo Disneyland', { delay: 60 });
await sleep(800);
await cInput.press('Enter');
await sleep(4500);
await ctrip.screenshot({ path: 'artifacts/screenshots/ctrip-search-disney.png' });
const cText = await ctrip.evaluate(() => (document.body.innerText || '').slice(0, 2200));
console.log('CTRIP URL', ctrip.url());
console.log(cText.slice(0, 1400));
console.log('CTRIP APIS', cApis.length);
for (const a of cApis) {
  console.log('\nC', a.method, a.status, a.url.slice(0, 180), 'len', a.bodyLen);
  if (a.postData) console.log(' POST', a.postData.slice(0, 400));
  console.log(' ', a.bodyHead.slice(0, 280).replace(/\s+/g, ' '));
}
offC();

await sleep(2000);

// ---- Klook search ----
const kApis = [];
const offK = attach(klook, kApis);
await klook.bringToFront();
const kInput = klook.locator('input[placeholder*="destination"], input[placeholder*="activity"]').first();
await kInput.click();
await kInput.fill('');
await sleep(300);
await kInput.type('Tokyo Disneyland', { delay: 60 });
await sleep(600);
await kInput.press('Enter');
await sleep(5000);
await klook.screenshot({ path: 'artifacts/screenshots/klook-search-disney.png' });
const kText = await klook.evaluate(() => (document.body.innerText || '').slice(0, 2200));
console.log('\nKLOOK URL', klook.url());
console.log(kText.slice(0, 1400));
console.log('KLOOK APIS', kApis.length);
for (const a of kApis) {
  console.log('\nK', a.method, a.status, a.url.slice(0, 200), 'len', a.bodyLen);
  if (a.postData) console.log(' POST', a.postData.slice(0, 400));
  console.log(' ', a.bodyHead.slice(0, 280).replace(/\s+/g, ' '));
}
offK();

fs.writeFileSync('data/probe-supply-search-api.json', JSON.stringify({
  ctripUrl: ctrip.url(),
  klookUrl: klook.url(),
  cApis,
  kApis,
}, null, 2));
process.exit(0);
