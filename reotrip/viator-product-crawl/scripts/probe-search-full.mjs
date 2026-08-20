import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('data', { recursive: true });

const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const ctrip = pages.find((p) => (p.url() || '').includes('travelagents.trip.com'));
const klook = pages.find((p) => (p.url() || '').includes('klook.klktech.com'));

const ctripSearch = (keyword, extraFilter = []) => ctrip.evaluate(async ({ keyword, extraFilter }) => {
  const head = {
    cid: '09034171316177435203', ctok: '', cver: '1.0', lang: '01', sid: '8888', syscode: '09',
    auth: '', xsid: '',
    extension: [
      { name: 'aid', value: '5572064' },
      { name: 'sid', value: '126780620' },
      { name: 'amp-product-type', value: 'intlpiaovip' },
      { name: 'amp-account-source', value: 'ttdintldistribution' },
    ],
    Locale: 'en-US',
  };
  const body = {
    filterItemList: extraFilter,
    sort: 1, pageIndex: 1, needData: 3, keyword, locale: 'en-US',
    clientInfo: { locale: 'en-US' }, pageSize: 20, contentType: 'json', head,
  };
  const res = await fetch('https://m.trip.com/restapi/soa2/14083/json/mixSortListSearch', {
    method: 'POST', credentials: 'include',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return {
    status: res.status,
    total: json.totalCount,
    cards: (json.cardList || []).map((c) => ({
      id: c.id, cardType: c.cardType, tagType: c.tagType, name: c.name,
      tags: c.productTags, city: c.starCity, urlHint: c.jumpUrl || c.url || c.detailUrl || null,
      extra: Object.keys(c),
    })),
    rawFirst: json.cardList?.[0] || null,
  };
}, { keyword, extraFilter });

const klookSearch = (query) => klook.evaluate(async (query) => {
  const u = `/v1/agentwebserv/product/complete_search?_=${Date.now()}&query=${encodeURIComponent(query)}&vertical_types=100&page_num=1&page_size=24&sort=most_relevant`;
  const res = await fetch(u, { credentials: 'include', headers: { accept: 'application/json' } });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, len: text.length, head: text.slice(0, 400), json };
}, query);

console.log('=== Ctrip Disneyland ticket ===');
const c1 = await ctripSearch('Tokyo Disneyland ticket');
console.log('total', c1.total);
for (const c of c1.cards) console.log(c.cardType, c.tagType, c.id, c.name?.slice(0, 90), c.tags);
console.log('raw keys', c1.rawFirst && Object.keys(c1.rawFirst));
if (c1.rawFirst) {
  fs.writeFileSync('data/ctrip-card-sample.json', JSON.stringify(c1.rawFirst, null, 2));
}

await sleep(1600);
console.log('\n=== Ctrip Tokyo Metro ===');
const c2 = await ctripSearch('Tokyo Metro');
console.log('total', c2.total);
for (const c of c2.cards.slice(0, 8)) console.log(c.cardType, c.tagType, c.id, c.name?.slice(0, 90), c.tags);

await sleep(1600);
console.log('\n=== Ctrip Tokyo Tower ticket ===');
const c3 = await ctripSearch('Tokyo Tower admission ticket');
console.log('total', c3.total);
for (const c of c3.cards.slice(0, 8)) console.log(c.cardType, c.tagType, c.id, c.name?.slice(0, 90), c.tags);

await sleep(1800);
console.log('\n=== Klook Disney ===');
const k1 = await klookSearch('Tokyo Disneyland');
console.log('klook', k1.status, k1.len, k1.head);
if (k1.json) {
  fs.writeFileSync('data/klook-search-disney.json', JSON.stringify(k1.json, null, 2));
  const keys = Object.keys(k1.json);
  console.log('keys', keys);
  const s = JSON.stringify(k1.json);
  console.log(s.slice(0, 1500));
}

process.exit(0);
