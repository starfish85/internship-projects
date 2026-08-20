/**
 * 修 PVG POI：删错酒店 → 选上海浦东国际机场本体（排除住宿/酒店）
 * DRAFT 6c84629b-5683-44c3-80eb-a859e7e05901
 */
import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';

const DRAFT = '6c84629b-5683-44c3-80eb-a859e7e05901';
const PROPS = `https://tour.triple.partners/product-management/registration/properties?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('【将要】回属性页修正 POI 为浦东机场本体');
killPeerCdpScripts('pvg-fix-poi');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page =
  browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners')) ||
  browser.contexts()[0].pages()[0];
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);

await page.goto(PROPS, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(3000);
console.log('【读回】url', page.url());

// 删已有错误地点
const removed = await page.evaluate(() => {
  const body = document.body.innerText;
  const snipStart = body.indexOf('地区和地点');
  const snip = snipStart >= 0 ? body.slice(snipStart, snipStart + 400) : '';
  // 找删除/× 按钮 near location cards
  const dels = Array.from(document.querySelectorAll('button,span,div')).filter((el) => {
    const t = (el.innerText || el.getAttribute('aria-label') || '').trim();
    const r = el.getBoundingClientRect();
    return (
      r.width > 10 &&
      r.width < 60 &&
      r.height > 10 &&
      r.height < 60 &&
      r.y > 200 &&
      (t === '×' || t === 'x' || t === 'X' || t === '删除' || t === '刪除' || /delete|remove/i.test(t))
    );
  });
  // also try buttons with close icons near 酒店
  let n = 0;
  for (const el of dels.slice(0, 5)) {
    el.click();
    n++;
  }
  return { snip: snip.slice(0, 200), delClicks: n, hasHotel: /酒店|Hotel|住宿|주주/.test(snip) };
});
console.log('【读回】remove try', removed);
await sleep(800);

// 再试：点地点卡上的删除图标（SVG button）
const removed2 = await page.evaluate(() => {
  // look for remove near location list items
  const region = Array.from(document.querySelectorAll('div,section')).find((el) => {
    const t = el.innerText || '';
    return t.includes('地区和地点') && t.length < 3000;
  });
  if (!region) return { err: 'no region' };
  const btns = Array.from(region.querySelectorAll('button')).filter((b) => {
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.width < 48 && r.height > 0 && r.height < 48;
  });
  let n = 0;
  for (const b of btns) {
    // skip 添加
    if (/添加|添加/.test(b.innerText || '')) continue;
    b.click();
    n++;
  }
  return { smallBtns: btns.length, clicked: n };
});
console.log('【读回】remove2', removed2);
await sleep(1000);

// 如果仍有地点，尝试 getByRole 删除
const delBtns = page.locator('button').filter({ hasText: /删除|刪除|移除/ });
const dc = await delBtns.count();
console.log('【读回】删除按钮 count', dc);
for (let i = 0; i < Math.min(dc, 3); i++) {
  await delBtns.nth(i).click({ timeout: 3000 }).catch(() => {});
  await sleep(400);
}

console.log('\n【将要】添加地点 → 搜 上海浦东国际机场 → 排除酒店/住宿');
await page.getByRole('button', { name: /添加地区和地点|添加地區和地點/ }).first().click();
await sleep(1500);
const search = page
  .locator(
    'input[placeholder*="검색"], input[placeholder*="관광지"], input[placeholder*="搜索"], input[placeholder*="Search"]',
  )
  .first();
await search.waitFor({ state: 'visible', timeout: 12000 });
await search.fill('上海浦东国际机场');
await page.keyboard.press('Enter');
await sleep(3000);

// dump top candidates
const cands = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('div,li,button'))
    .filter((el) => {
      const t = (el.innerText || '').replace(/\s+/g, ' ');
      const r = el.getBoundingClientRect();
      return (
        r.width > 280 &&
        r.height > 40 &&
        r.height < 240 &&
        r.y > 80 &&
        r.y < 900 &&
        /浦东|Pudong|PVG|푸동/i.test(t)
      );
    })
    .slice(0, 12)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        t: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 120),
        y: Math.round(r.y),
        h: Math.round(r.height),
      };
    });
});
console.log('【读回】候选', JSON.stringify(cands, null, 2));

let pick = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('div,li,button')).filter((el) => {
    const t = (el.innerText || '').replace(/\s+/g, ' ');
    const r = el.getBoundingClientRect();
    const isHotel = /酒店|Hotel|住宿|宾馆|旅馆|주주|Hotel|motel|hostel|客栈|公寓/i.test(t);
    const isAirport =
      (/浦东|Pudong|PVG|푸동/i.test(t) && /国际机场|国际機場|International Airport|국제공항/i.test(t)) ||
      (/浦东国际机场|浦东国际機場|Pudong International Airport/i.test(t));
    return (
      r.width > 280 &&
      r.height > 40 &&
      r.height < 240 &&
      r.y > 80 &&
      isAirport &&
      !isHotel
    );
  });
  cards.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
  if (!cards[0]) return null;
  cards[0].click();
  return cards[0].innerText.slice(0, 180);
});

if (!pick) {
  await search.fill('Pudong International Airport PVG');
  await page.keyboard.press('Enter');
  await sleep(3000);
  pick = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div,li,button')).filter((el) => {
      const t = (el.innerText || '').replace(/\s+/g, ' ');
      const r = el.getBoundingClientRect();
      const isHotel = /酒店|Hotel|住宿|宾馆|旅馆|주주|motel|hostel/i.test(t);
      const isAirport = /Pudong/i.test(t) && /Airport/i.test(t) && !/Railway|Station/i.test(t);
      return r.width > 280 && r.height > 40 && r.height < 240 && r.y > 80 && isAirport && !isHotel;
    });
    if (!cards[0]) return null;
    cards[0].click();
    return cards[0].innerText.slice(0, 180);
  });
}

console.log('【读回】POI pick', pick);
if (!pick) failExit('POI airport not found');
if (/酒店|Hotel|住宿|주주/i.test(pick)) failExit('still hotel POI: ' + pick);

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

const gate = await page.evaluate(() => {
  const body = document.body.innerText;
  const i = body.indexOf('地区和地点');
  const snip = i >= 0 ? body.slice(i, i + 350) : '';
  const saveBtn = Array.from(document.querySelectorAll('button')).find((b) =>
    /保存然后|保存然後/.test(b.innerText || ''),
  );
  return {
    snip: snip.replace(/\s+/g, ' ').slice(0, 280),
    hasAirport: /浦东|Pudong|PVG|푸동/.test(snip) && /机场|Airport|공항/.test(snip),
    hasHotel: /酒店|Hotel|住宿|주주/.test(snip),
    saveDisabled: saveBtn ? saveBtn.disabled : null,
  };
});
console.log('【读回】POI gate', gate);
if (!gate.hasAirport || gate.hasHotel) failExit('POI gate FAIL');

console.log('\n【将要】保存然后（回介绍）');
const saved = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => {
    const t = (x.innerText || '').trim();
    return (t === '保存然后' || t === '保存然後') && !x.disabled;
  });
  if (!b) return false;
  b.click();
  return true;
});
console.log('【读回】保存然后', saved);
if (!saved) failExit('saveThen fail');
await sleep(3000);
console.log('【结果】PASS fix POI →', page.url());
process.exit(0);
