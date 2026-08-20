import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';
const DRAFT = '0bd5b8fb-991f-4313-b798-3a9a4d6bd060';
const PROPS = `https://tour.triple.partners/product-management/registration/properties?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
killPeerCdpScripts('shz-poi2');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);
await page.keyboard.press('Escape').catch(() => {});
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button'))
    .find((b) => (b.innerText || '').trim() === '消除')
    ?.click(),
);
if (!page.url().includes('/properties')) {
  await page.goto(PROPS, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
}
console.log('url', page.url());

// Delete existing place cards with × near 布丁/酒店
const delInfo = await page.evaluate(() => {
  const results = [];
  // look for remove icons in place chips
  const cards = Array.from(document.querySelectorAll('div')).filter((d) => {
    const t = (d.innerText || '').replace(/\s+/g, ' ');
    const r = d.getBoundingClientRect();
    return (
      r.width > 200 &&
      r.height > 40 &&
      r.height < 180 &&
      /布丁|酒店|Hotel|Hanting|Greentree|하이 인|한팅/i.test(t) &&
      /上海|Shanghai/i.test(t)
    );
  });
  for (const c of cards) {
    // find closest clickable ×
    const btns = c.querySelectorAll('button, [role=button], svg');
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      if (r.width > 0 && r.width < 40 && r.height < 40) {
        (b.closest('button') || b).click?.();
        results.push('clicked small on ' + c.innerText.slice(0, 40));
        break;
      }
    }
  }
  return { nCards: cards.length, results };
});
console.log('【删除尝试】', delInfo);
await sleep(800);

// open add
await page.getByRole('button', { name: /添加地区和地点|添加地區和地點/ }).first().click();
await sleep(1800);
const search = page
  .locator(
    'input[placeholder*="검색"], input[placeholder*="관광지"], input[placeholder*="搜索"], input[placeholder*="Search"]',
  )
  .first();
await search.waitFor({ state: 'visible', timeout: 12000 });
await search.fill('上海站');
await page.keyboard.press('Enter');
await sleep(2800);

// Prefer 旅游地 + 上海 + 역 / Station, exclude hotel
const pick = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('div,li,button')).filter((el) => {
    const t = (el.innerText || '').replace(/\s+/g, ' ');
    const r = el.getBoundingClientRect();
    if (r.width <= 280 || r.height <= 40 || r.height >= 220 || r.y <= 80 || r.y > 750) return false;
    if (!/旅游地|旅遊地|TRAVEL/i.test(t) && !/^上海\s*역/.test(t) && !/Shanghai.*Station/i.test(t)) {
      // allow if clearly station travel place
    }
    const isTravel = /旅游地|旅遊地/.test(t);
    const isStation =
      /上海\s*역|상하이역|Shanghai Railway Station|Shanghai Station|上海站|火车站|Fuling Road/i.test(t);
    const isHotel = /住宿|酒店|Hotel|布丁|Hanting|Greentree|하이|한팅|Gya|Alliance/i.test(t);
    const isAirport = /机场|Airport|虹桥|Hongqiao|浦东|Pudong/i.test(t);
    return isTravel && isStation && !isHotel && !isAirport;
  });
  cards.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
  if (!cards[0]) {
    // second try: any 旅游地 with 上海 역
    const c2 = Array.from(document.querySelectorAll('div,li,button')).filter((el) => {
      const t = (el.innerText || '').replace(/\s+/g, ' ');
      const r = el.getBoundingClientRect();
      if (r.width <= 280 || r.height <= 40 || r.height >= 220 || r.y <= 80) return false;
      return (
        /旅游地|旅遊地/.test(t) &&
        /上海|Shanghai/.test(t) &&
        /역|Station|站/.test(t) &&
        !/酒店|Hotel|住宿|布丁|机场|Airport/.test(t)
      );
    });
    c2.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    if (!c2[0]) return { pick: null, sample: [] };
    c2[0].click();
    return { pick: c2[0].innerText.slice(0, 160), via: 'c2' };
  }
  cards[0].click();
  return { pick: cards[0].innerText.slice(0, 160), via: 'c1' };
});
console.log('【读回】pick', pick);
if (!pick.pick) failExit('no station POI');

await sleep(1000);
await page.getByRole('button', { name: /添加地点|添加地點/ }).first().click().catch(() => {});
await sleep(800);
await page.evaluate(() => {
  const radio = document.querySelector('input[type=radio][value="TRAVEL_PLACE"]');
  if (radio && !radio.checked) (radio.closest('label') || radio).click();
  Array.from(document.querySelectorAll('label,div,span'))
    .find((e) => /^(旅游地|旅遊地)$/.test((e.innerText || '').trim()))
    ?.click();
});
await sleep(400);
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button'))
    .find((x) => (x.innerText || '').trim() === '添加' && !x.disabled)
    ?.click();
});
await sleep(1500);

// try delete hotel again if still there
await page.evaluate(() => {
  document.querySelectorAll('div').forEach((d) => {
    const t = d.innerText || '';
    if (t.length > 150 || !/布丁|Hotel|酒店/.test(t)) return;
    const r = d.getBoundingClientRect();
    if (r.height > 200 || r.height < 30) return;
    d.querySelectorAll('button').forEach((b) => {
      const br = b.getBoundingClientRect();
      if (br.width > 0 && br.width < 48) b.click();
    });
  });
});
await sleep(800);

const after = await page.evaluate(() => {
  const i = document.body.innerText.indexOf('地区和地点');
  return i >= 0 ? document.body.innerText.slice(i, i + 320).replace(/\s+/g, ' ') : null;
});
console.log('【读回】POI', after);
const hasStation = /旅游地[\s\S]{0,40}上海|上海\s*역|Fuling|Railway Station|상하이역/i.test(after || '');
const hasHotel = /布丁|Hanting|Greentree|하이 인 上海/.test(after || '');
console.log({ hasStation, hasHotel });

// close search sheet if open
await page.keyboard.press('Escape').catch(() => {});
await sleep(400);

const save = page.locator('button').filter({ hasText: /保存然后|保存然後/ }).first();
const n = await save.count();
console.log('save btn', n);
if (n && !(await save.isDisabled().catch(() => true))) {
  await save.click({ timeout: 10000 });
  await sleep(3500);
} else {
  await page.locator('button').filter({ hasText: /^临时保存$/ }).first().click({ timeout: 8000 }).catch(() => {});
  await sleep(2000);
}
console.log('url', page.url());
process.exit(hasStation ? 0 : 2);
