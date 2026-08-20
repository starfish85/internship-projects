import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('data', { recursive: true });

const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const ctrip = pages.find((p) => (p.url() || '').includes('travelagents.trip.com'));
const klook = pages.find((p) => (p.url() || '').includes('klook.klktech.com') && (p.url() || '').includes('search'));

const klookPage = klook || pages.find((p) => (p.url() || '').includes('klook.klktech.com'));

// ---- Ctrip Attraction Tickets search ----
const cRes = await ctrip.evaluate(async () => {
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
  const attempts = [];
  const bodies = [
    {
      filterItemList: [{ filterType: 4, filterName: 'Types', filterItemList: [{ filterID: 'Ticket2', filterValue: 'Attraction Tickets' }] }],
      sort: 1, pageIndex: 1, needData: 3, keyword: 'Tokyo Disneyland', locale: 'en-US',
      clientInfo: { locale: 'en-US' }, pageSize: 10, contentType: 'json', head,
    },
    {
      filterItemList: [{ filterType: 6, filterName: 'Passing Attractions', filterItemList: [{ filterID: '10758189', filterValue: 'Tokyo Disneyland' }] }],
      sort: 1, pageIndex: 1, needData: 3, keyword: '', locale: 'en-US',
      clientInfo: { locale: 'en-US' }, pageSize: 10, contentType: 'json', head,
    },
  ];
  for (const body of bodies) {
    const res = await fetch('https://m.trip.com/restapi/soa2/14083/json/mixSortListSearch', {
      method: 'POST', credentials: 'include',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    attempts.push({
      keyword: body.keyword,
      filter: body.filterItemList,
      status: res.status,
      total: json.totalCount,
      cards: (json.cardList || []).map((c) => ({
        id: c.id, tagType: c.tagType, name: c.name, tags: c.productTags, city: c.starCity,
      })),
    });
  }
  return attempts;
});
console.log('CTRIP TICKET SEARCH');
console.log(JSON.stringify(cRes, null, 2));
fs.writeFileSync('data/ctrip-search-disney-tickets.json', JSON.stringify(cRes, null, 2));

await sleep(1200);

// ---- Klook: resources + DOM cards + try APIs ----
const kProbe = await klookPage.evaluate(async () => {
  const resources = performance.getEntriesByType('resource').map((e) => e.name)
    .filter((u) => /search|activity|experience|product|graphql|api/i.test(u))
    .slice(0, 40);
  // close overlay by clicking body title area
  const cards = [...document.querySelectorAll('[class*="card"], a, [class*="Card"]')]
    .map((el) => ({
      tag: el.tagName,
      href: el.href || el.getAttribute('href'),
      text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 120),
    }))
    .filter((x) => x.text && /disney|ticket|activity/i.test(x.text + (x.href || '')))
    .slice(0, 20);

  const attempts = [];
  const urls = [
    `/v1/usrcsrv/search/nearby?keyword=Tokyo%20Disneyland`,
    `/v1/experiencesrv/activity/search?keyword=Tokyo%20Disneyland`,
    `/api/search?keyword=Tokyo%20Disneyland`,
    `/search/api?keyword=Tokyo%20Disneyland`,
    `/v1/search?keyword=Tokyo%20Disneyland`,
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, { credentials: 'include', headers: { accept: 'application/json' } });
      const text = await res.text();
      attempts.push({ u, status: res.status, ct: res.headers.get('content-type'), len: text.length, head: text.slice(0, 220) });
    } catch (e) {
      attempts.push({ u, error: String(e) });
    }
  }
  return { url: location.href, resources, cards, attempts, textSample: document.body.innerText.slice(0, 800) };
});
console.log('\nKLOOK resources', kProbe.resources);
console.log('cards', JSON.stringify(kProbe.cards, null, 2).slice(0, 2000));
console.log('api attempts');
for (const a of kProbe.attempts) console.log(a.status, a.len, a.u, (a.head || a.error || '').slice(0, 120));
fs.writeFileSync('data/klook-search-probe.json', JSON.stringify(kProbe, null, 2));

// click away overlay and scrape
await klookPage.keyboard.press('Escape');
await sleep(500);
await klookPage.mouse.click(200, 400);
await sleep(800);
const after = await klookPage.evaluate(() => {
  const links = [...document.querySelectorAll('a')].map((a) => ({ href: a.href, text: (a.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100) }))
    .filter((x) => /\/activity\/\d+/.test(x.href || ''));
  return { n: links.length, links: links.slice(0, 15), text: document.body.innerText.slice(0, 1200) };
});
console.log('\nKLOOK activity links', after.n);
console.log(JSON.stringify(after.links, null, 2));
process.exit(0);
