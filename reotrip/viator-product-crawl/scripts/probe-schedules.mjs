import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const CODE = '5514894P483';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('data', { recursive: true });
fs.mkdirSync('artifacts/screenshots', { recursive: true });

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];
const listPage = context.pages().find((p) => (p.url() || '').includes('supplier.viator.com'));

const tryFetch = async (url) => {
  return listPage.evaluate(async (u) => {
    try {
      const res = await fetch(u, { credentials: 'include', headers: { accept: 'application/json' } });
      const text = await res.text();
      return { url: u, status: res.status, len: text.length, head: text.slice(0, 500) };
    } catch (e) {
      return { url: u, error: String(e) };
    }
  }, url);
};

const probes = [
  `/util/product?productCode=${CODE}`,
  `/util/product/${CODE}`,
  `/util/product?code=${CODE}`,
  `/product/${CODE}?format=json`,
  `/products/fetchMaverick?productCode=${CODE}`,
  `/products/fetchMaverick/${CODE}`,
];
for (const u of probes) {
  const r = await tryFetch(u);
  console.log('FETCH', r.status, r.len, r.url, (r.head || r.error || '').slice(0, 140).replace(/\s+/g, ' '));
  await sleep(350);
}

const apis = [];
const page = await context.newPage();
page.on('response', async (res) => {
  const req = res.request();
  if (!['xhr', 'fetch'].includes(req.resourceType())) return;
  const url = res.url();
  if (/google|facebook|adroll|qualtrics|salesforce|baryon|intake\/v2|tracking\/action|datadome|doubleclick|analytics|surfly/i.test(url)) return;
  let body = '';
  try { body = await res.text(); } catch { body = ''; }
  if (body.length < 40 && res.status() === 200) return;
  apis.push({
    status: res.status(),
    method: req.method(),
    url,
    postData: (req.postData() || '').slice(0, 2000),
    bodyLen: body.length,
    bodyHead: body.slice(0, 2000),
  });
});

await page.goto(`https://supplier.viator.com/product/${CODE}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(4000);

const state = await page.evaluate(() => {
  const keys = Object.keys(window).filter((k) => /state|store|redux|__|product/i.test(k)).slice(0, 40);
  let redux = null;
  try {
    const el = document.getElementById('root') || document.querySelector('#app');
    redux = el && el._reactRootContainer ? 'hasReactRoot' : null;
  } catch {}
  const scripts = [...document.querySelectorAll('script:not([src])')].map((s) => (s.textContent || '').slice(0, 200));
  const tabs = [...document.querySelectorAll('a, button, [role="tab"]')].map((el) => ({
    tag: el.tagName,
    text: (el.innerText || '').trim().slice(0, 60),
    href: el.getAttribute('href'),
  })).filter((x) => /schedule|price|avail|option|ticket|connect/i.test(x.text + (x.href || '')));
  return { keys, redux, inlineScripts: scripts.filter((s) => s.length > 20).slice(0, 10), tabs };
});
console.log('STATE', JSON.stringify(state, null, 2).slice(0, 2500));

const tab = page.getByText('Schedules & prices', { exact: false }).first();
const visible = await tab.count();
console.log('tab count', visible);
if (visible) {
  await tab.click();
  await sleep(4500);
}
await page.screenshot({ path: 'artifacts/screenshots/schedules-tab.png' });
const after = await page.evaluate(() => ({
  url: location.href,
  text: (document.body.innerText || '').slice(0, 2500),
}));
console.log('AFTER URL', after.url);
console.log(after.text.slice(0, 1200));

console.log('\nAPI', apis.length);
for (const a of apis) {
  console.log('\n', a.method, a.status, a.url.slice(0, 220), 'len', a.bodyLen);
  if (a.postData) console.log(' POST', a.postData.slice(0, 250));
  console.log(' ', a.bodyHead.slice(0, 350).replace(/\s+/g, ' '));
}
fs.writeFileSync('data/probe-schedules.json', JSON.stringify({ after, apis, state }, null, 2));
await page.close();
process.exit(0);
