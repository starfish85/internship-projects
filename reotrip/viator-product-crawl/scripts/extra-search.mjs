import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const ctrip = pages.find((p) => (p.url() || '').includes('travelagents.trip.com'));
const klook = pages.find((p) => (p.url() || '').includes('klook.klktech.com'));

const klookSearch = (keyword) => klook.evaluate(async (keyword) => {
  const u = `/v1/agentwebserv/product/complete_search?_=${Date.now()}&query=${encodeURIComponent(keyword)}&vertical_types=100&page_num=1&page_size=24&sort=most_relevant`;
  const res = await fetch(u, { credentials: 'include', headers: { accept: 'application/json' } });
  const json = await res.json();
  const items = json?.result?.search_result?.activity_info || [];
  return items.map((a) => ({ id: a.vertical_id, type: a.vertical_type, name: a.vertical_name, template_id: a.template_id }));
}, keyword);

const ctripSearch = (keyword) => ctrip.evaluate(async (keyword) => {
  const head = {
    cid: '09034171316177435203', ctok: '', cver: '1.0', lang: '01', sid: '8888', syscode: '09',
    auth: '', xsid: '',
    extension: [
      { name: 'aid', value: '5572064' }, { name: 'sid', value: '126780620' },
      { name: 'amp-product-type', value: 'intlpiaovip' }, { name: 'amp-account-source', value: 'ttdintldistribution' },
    ], Locale: 'en-US',
  };
  const res = await fetch('https://m.trip.com/restapi/soa2/14083/json/mixSortListSearch', {
    method: 'POST', credentials: 'include',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ filterItemList: [], sort: 1, pageIndex: 1, needData: 3, keyword, locale: 'en-US', clientInfo: { locale: 'en-US' }, pageSize: 12, contentType: 'json', head }),
  });
  const json = await res.json();
  return (json.cardList || []).map((c) => ({ id: c.id, cardType: c.cardType, tagType: c.tagType, name: c.name, tags: c.productTags }));
}, keyword);

const queries = [
  ['k', 'Shibuya Sky'],
  ['k', 'SHIBUYA SKY'],
  ['k', '涩谷SKY'],
  ['c', 'Tokyo Tower ticket'],
  ['c', 'Shibuya Sky admission'],
  ['k', 'Hong Kong Disneyland Premier Access'],
  ['c', 'Hong Kong Disneyland 1 day ticket'],
];
const out = {};
for (const [src, q] of queries) {
  console.log('\n', src, q);
  const r = src === 'k' ? await klookSearch(q) : await ctripSearch(q);
  out[`${src}:${q}`] = r;
  for (const x of r.slice(0, 8)) console.log(' ', x.id, x.tagType || x.template_id, (x.name || '').slice(0, 90));
  await sleep(1600);
}
fs.writeFileSync('data/extra-search.json', JSON.stringify(out, null, 2));
process.exit(0);
