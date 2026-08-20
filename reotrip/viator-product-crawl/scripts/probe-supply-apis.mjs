import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('data', { recursive: true });

const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const ctrip = pages.find((p) => (p.url() || '').includes('travelagents.trip.com'));
const klook = pages.find((p) => (p.url() || '').includes('klook.klktech.com'));

// Ctrip: search without city filter
const cRes = await ctrip.evaluate(async () => {
  const head = {
    cid: '09034171316177435203',
    ctok: '',
    cver: '1.0',
    lang: '01',
    sid: '8888',
    syscode: '09',
    auth: '',
    xsid: '',
    extension: [
      { name: 'aid', value: '5572064' },
      { name: 'sid', value: '126780620' },
      { name: 'amp-product-type', value: 'intlpiaovip' },
      { name: 'amp-account-source', value: 'ttdintldistribution' },
    ],
    Locale: 'en-US',
  };
  const body = {
    filterItemList: [],
    sort: 1,
    pageIndex: 1,
    needData: 3,
    keyword: 'Tokyo Disneyland',
    locale: 'en-US',
    clientInfo: { locale: 'en-US' },
    pageSize: 10,
    contentType: 'json',
    head,
  };
  const res = await fetch('https://m.trip.com/restapi/soa2/14083/json/mixSortListSearch', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, len: text.length, text };
});
fs.writeFileSync('data/ctrip-search-disney.json', cRes.text);
console.log('ctrip search', cRes.status, cRes.len);
const parsed = JSON.parse(cRes.text);
const keys = Object.keys(parsed);
console.log('keys', keys);
const dump = JSON.stringify(parsed).slice(0, 2500);
console.log(dump);

await sleep(1500);

// Klook current search page
await klook.bringToFront();
const kInfo = await klook.evaluate(() => ({
  url: location.href,
  text: (document.body.innerText || '').slice(0, 2500),
  cards: [...document.querySelectorAll('a')].filter((a) => /activity|product|ticket/i.test(a.href)).slice(0, 15).map((a) => ({
    href: a.href,
    text: (a.innerText || '').trim().slice(0, 80),
  })),
}));
console.log('\nKLOOK', kInfo.url);
console.log(kInfo.text.slice(0, 1500));
console.log('cards', JSON.stringify(kInfo.cards, null, 2));
await klook.screenshot({ path: 'artifacts/screenshots/klook-search-now.png' });

await sleep(1200);

// Open known example product pages in new tabs to inspect cancel/usage
const context = browser.contexts()[0];
const exC = await context.newPage();
await exC.goto('https://travelagents.trip.com/ttddist/act/dest/t24465457.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(3500);
const cDetail = await exC.evaluate(() => ({
  url: location.href,
  title: document.title,
  text: (document.body.innerText || '').slice(0, 3000),
}));
await exC.screenshot({ path: 'artifacts/screenshots/ctrip-example-detail.png' });
console.log('\nCTRIP DETAIL', cDetail.title, cDetail.url);
console.log(cDetail.text.slice(0, 1800));
await exC.close();

await sleep(1500);
const exK = await context.newPage();
await exK.goto('https://klook.klktech.com/activity/695', { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(4000);
const kDetail = await exK.evaluate(() => ({
  url: location.href,
  title: document.title,
  text: (document.body.innerText || '').slice(0, 3000),
}));
await exK.screenshot({ path: 'artifacts/screenshots/klook-example-detail.png' });
console.log('\nKLOOK DETAIL', kDetail.title, kDetail.url);
console.log(kDetail.text.slice(0, 1800));
await exK.close();

fs.writeFileSync('data/probe-supply-examples.json', JSON.stringify({ cDetail, kDetail, kInfo }, null, 2));
process.exit(0);
