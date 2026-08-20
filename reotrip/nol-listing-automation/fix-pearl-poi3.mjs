/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Pick Shanghai 동방명주 (Century Ave / Lujiazui) only and confirm 添加.
 * Assumes place-search popup may already be open with results.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
console.log('URL:', page.url());
await page.bringToFront().catch(() => {});

// If no search open, open it
const hasSearch = await page.locator('input[placeholder*="검색"], input[placeholder*="관광지"]').count();
if (!hasSearch) {
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.getByRole('button', { name: /添加地区和地点/ }).first().click();
  await sleep(1000);
}

const search = page.locator('input[placeholder*="검색"], input[placeholder*="관광지"], input[placeholder*="搜索"]').first();
await search.waitFor({ state: 'visible', timeout: 8000 });
await search.click();
await page.keyboard.press('Meta+a');
// Korean tower name alone often ranks the real Shanghai attraction as 旅游地
await page.keyboard.type('동방명주탑', { delay: 50 });
await page.keyboard.press('Enter');
console.log('search 동방명주탑');
await sleep(2500);

// Collect compact result rows
const results = await page.evaluate(() => {
  const out = [];
  // Prefer rows that look like result cards (~100px tall)
  document.querySelectorAll('div').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 400 || r.width > 900) return;
    if (r.height < 60 || r.height > 160) return;
    if (r.y < 100 || r.y > 850) return;
    const t = (el.innerText || '').trim().replace(/\s+/g, ' ');
    if (!t || t.length < 8 || t.length > 200) return;
    if (!/동방|明珠|Pearl|名珠/i.test(t)) return;
    const isTour = /旅游地|旅遊地|관광지|TRAVEL/.test(t);
    const isHotel = /住宿|호텔|Hotel|숙소/.test(t);
    const isShanghai = /上海|Shang|Pudong|LuJia|Lujiazui|Century|世纪|중국|中国|中华|200120|Shi Ji/i.test(t);
    const isKorea = /서울|경기도|대전|대한민국/.test(t) && !isShanghai;
    out.push({
      t: t.slice(0, 140),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      isTour,
      isHotel,
      isShanghai,
      isKorea,
      score: (isShanghai ? 10 : 0) + (isTour ? 5 : 0) + (!isHotel ? 3 : 0) + (isKorea ? -20 : 0) + (/동방명주탑|Oriental Pearl Tower|东方明珠塔/.test(t) ? 5 : 0),
    });
  });
  // unique by y
  const seen = new Set();
  return out
    .filter((r) => {
      if (seen.has(r.y)) return false;
      seen.add(r.y);
      return true;
    })
    .sort((a, b) => b.score - a.score);
});
console.log('ranked results:', JSON.stringify(results, null, 2));

const best = results.find((r) => r.score >= 10) || results[0];
if (!best) {
  console.log('NO RESULTS');
  process.exit(2);
}
console.log('picking:', best.t, 'score', best.score);
// Click center of card
await page.mouse.click(best.x + best.w / 2, best.y + best.h / 2);
await sleep(1500);

// After select, detail panel with 添加地点
let ui = await page.evaluate(() => (document.querySelector('[role=dialog]') || document.body).innerText.slice(0, 1200));
console.log('after pick UI:\n', ui);

// Must see Shanghai-ish address
const okAddr = /上海|Shang|Pudong|LuJia|Century|中国|중华|中华|200120/i.test(ui);
const badAddr = /서울|경기도|대전/.test(ui) && !okAddr;
if (badAddr) {
  console.log('BAD: picked Korea again, abort add');
  process.exit(3);
}

const addPlace = page.getByRole('button', { name: /添加地点|添加地點/ });
if ((await addPlace.count()) > 0) {
  await addPlace.first().click();
  console.log('clicked 添加地点');
  await sleep(1000);
}

// 旅游地 type — only if type picker appears
ui = await page.evaluate(() => (document.querySelector('[role=dialog]') || document.body).innerText.slice(0, 800));
console.log('type step UI snippet:', ui.slice(0, 400));

for (const lab of ['旅游地', '旅遊地', '여행지']) {
  const els = page.getByText(lab, { exact: true });
  const c = await els.count();
  for (let i = 0; i < c; i++) {
    const box = await els.nth(i).boundingBox();
    if (!box || box.y < 50) continue;
    // click the label itself once
    await page.mouse.click(box.x + 12, box.y + box.height / 2);
    console.log('clicked type label', lab, box);
    await sleep(400);
    break;
  }
}

// Final 添加 — only enabled ones
const adds = page.locator('button').filter({ hasText: /^(添加|新增|추가)$/ });
const n = await adds.count();
console.log('添加 buttons', n);
for (let i = 0; i < n; i++) {
  const b = adds.nth(i);
  const dis = await b.isDisabled().catch(() => true);
  const box = await b.boundingBox();
  const t = (await b.innerText()).trim();
  console.log(`  [${i}] ${t} disabled=${dis} box=`, box);
  if (!dis && box && box.y > 0) {
    await b.click();
    console.log('  ✓ clicked 添加');
    await sleep(1500);
    break;
  }
}

// Verify
const final = await page.evaluate(() => {
  const redMsgs = [];
  document.querySelectorAll('p, span, div').forEach((el) => {
    if (el.children.length > 2) return;
    const cs = getComputedStyle(el);
    const m = cs.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const txt = (el.innerText || '').trim();
    if (!txt || txt.length > 60) return;
    if (m && +m[1] > 180 && +m[2] < 100 && +m[3] < 100) redMsgs.push(txt);
  });
  const saveThen = Array.from(document.querySelectorAll('button')).find((b) => /保存然后|保存然後/.test(b.innerText || ''));
  const lines = document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean);
  const place = [];
  for (let i = 0; i < lines.length; i++) {
    if (/商品地区|旅游地|동방|司机|韩语|保存然后|Century|上海|서울/.test(lines[i])) {
      place.push(lines.slice(i, i + 4).join(' | '));
    }
  }
  return {
    redMsgs: [...new Set(redMsgs)],
    saveThenDisabled: saveThen?.disabled ?? 'missing',
    place: place.slice(0, 15),
    hasSeoul: /서울|퇴계/.test(document.body.innerText),
    hasShanghaiPOI: /Century|LuJia|Pudong|上海|中华人民共和国/.test(document.body.innerText),
  };
});
console.log('\nFINAL', JSON.stringify(final, null, 2));
process.exit(final.redMsgs.some((r) => /地区|地点/.test(r)) ? 1 : 0);
