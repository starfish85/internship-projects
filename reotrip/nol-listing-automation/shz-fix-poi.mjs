/**
 * 纠正 POI：删除酒店卡 → 添加真正上海火车站
 */
import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';

const DRAFT = '0bd5b8fb-991f-4313-b798-3a9a4d6bd060';
const PROPS = `https://tour.triple.partners/product-management/registration/properties?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

killPeerCdpScripts('shz-poi');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);

// if on intro with dirty? go properties via stepper or goto after save — attrs may need re-open
if (!page.url().includes('/properties')) {
  // try click 产品属性 if enabled, else goto
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('a,button,div'))
      .find((e) => /产品属性|產品屬性/.test(e.innerText || '') && (e.innerText || '').length < 20)
      ?.click();
  });
  await sleep(2000);
  if (!page.url().includes('/properties')) {
    await page.goto(PROPS, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
  }
}
// leave dialog
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button'))
    .find((b) => (b.innerText || '').trim() === '消除')
    ?.click(),
);
await sleep(400);
console.log('url', page.url());

// dump POI area
const snip = await page.evaluate(() => {
  const i = document.body.innerText.indexOf('地区和地点');
  return i >= 0 ? document.body.innerText.slice(i, i + 250) : null;
});
console.log('【点前】POI', snip);

// delete wrong cards (酒店/布丁)
const deleted = await page.evaluate(() => {
  const dels = [];
  // find delete/x near 布丁 or 酒店 in location section
  document.querySelectorAll('button').forEach((b) => {
    const t = (b.innerText || '').trim();
    const aria = b.getAttribute('aria-label') || '';
    if (/删除|刪除|移除|×|✕|close/i.test(t + aria)) {
      const parent = b.closest('div');
      const pt = parent?.innerText || '';
      if (/布丁|酒店|Hotel|住宿|客运总站店/.test(pt)) {
        b.click();
        dels.push(pt.slice(0, 60));
      }
    }
  });
  return dels;
});
console.log('【删除】', deleted);
await sleep(800);

// also try × icons
await page.evaluate(() => {
  document.querySelectorAll('[class*="location"], [class*="place"], div').forEach((el) => {
    const t = el.innerText || '';
    if (t.length > 200 || t.length < 5) return;
    if (!/布丁|酒店\(上海火车站/.test(t)) return;
    const btn = el.querySelector('button');
    btn?.click();
  });
});
await sleep(500);

console.log('【将要】添加 上海火车站 POI');
await page.getByRole('button', { name: /添加地区和地点|添加地區和地點/ }).first().click();
await sleep(1800);
const search = page
  .locator(
    'input[placeholder*="검색"], input[placeholder*="관광지"], input[placeholder*="搜索"], input[placeholder*="Search"]',
  )
  .first();
await search.waitFor({ state: 'visible', timeout: 12000 });
// try more specific queries
for (const q of ['上海站', 'Shanghai Railway Station', '上海火车站']) {
  await search.fill(q);
  await page.keyboard.press('Enter');
  await sleep(2500);
  const dump = await page.evaluate(() =>
    Array.from(document.querySelectorAll('div,li,button'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 280 && r.height > 40 && r.height < 220 && r.y > 80 && r.y < 700;
      })
      .map((el) => (el.innerText || '').replace(/\s+/g, ' ').slice(0, 100))
      .filter((t) => /站|Station|역|铁路|Railway|上海/i.test(t))
      .slice(0, 12),
  );
  console.log('【候选】', q, dump);

  const pick = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div,li,button')).filter((el) => {
      const t = (el.innerText || '').replace(/\s+/g, ' ');
      const r = el.getBoundingClientRect();
      if (r.width <= 280 || r.height <= 40 || r.height >= 220 || r.y <= 80) return false;
      if (!/上海|Shanghai|中国|中华/i.test(t)) return false;
      if (!/火车站|上海站|Railway Station|铁路/i.test(t) && !/상하이역|Shanghai Station/i.test(t))
        return false;
      // exclude hotel/airport
      if (/酒店|Hotel|布丁|住宿|机场|Airport|虹桥|Hongqiao|浦东|Pudong|汽车站|客运|Bus/i.test(t))
        return false;
      return true;
    });
    cards.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    if (!cards[0]) return null;
    cards[0].click();
    return cards[0].innerText.slice(0, 160);
  });
  console.log('【读回】pick', pick);
  if (pick) {
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
    break;
  }
}

const after = await page.evaluate(() => {
  const i = document.body.innerText.indexOf('地区和地点');
  return i >= 0 ? document.body.innerText.slice(i, i + 280).replace(/\s+/g, ' ') : null;
});
console.log('【读回】POI area', after);
const bad = /布丁|酒店|Hotel/.test(after || '');
const good = /火车站|上海站|Railway Station|상하이역/i.test(after || '');
console.log({ bad, good });

// 保存然后 or 临时保存
const save = page.getByRole('button', { name: /保存然后|保存然後/ }).first();
if (!(await save.isDisabled())) {
  await save.click();
  await sleep(3500);
  console.log('save-then →', page.url());
} else {
  await page.getByRole('button', { name: /^临时保存$/ }).first().click().catch(() => {});
  await sleep(2000);
  console.log('temp saved');
}
process.exit(good && !bad ? 0 : 2);
