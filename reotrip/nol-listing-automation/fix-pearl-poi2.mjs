/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Remove wrong Seoul POI, add Shanghai 동방명주탑 (Oriental Pearl Tower).
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
await page.keyboard.press('Escape');
await sleep(300);

// 1) Remove wrong POI if present (Seoul address)
const removed = await page.evaluate(() => {
  const body = document.body.innerText;
  // look for delete/X near 서울 / 退溪 / 중구
  const candidates = [];
  document.querySelectorAll('button, [role=button], span, a, svg, div').forEach((el) => {
    const t = (el.innerText || el.getAttribute('aria-label') || '').trim();
    const parent = (el.closest('[class*="place"], [class*="Place"], [class*="chip"], [class*="Chip"], li, article') || el.parentElement);
    const pt = (parent?.innerText || '').replace(/\s+/g, ' ');
    if (/서울|중구|퇴계|安山|安山市|대전/.test(pt) && (/삭제|删除|删除|移除|×|✕|close|Close|제거/.test(t) || el.tagName === 'BUTTON' || el.getAttribute('aria-label'))) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.x > 0)
        candidates.push({ t: t.slice(0, 30), pt: pt.slice(0, 80), x: Math.round(r.x), y: Math.round(r.y), tag: el.tagName });
    }
  });
  return { bodyHasSeoul: /서울|중구|퇴계/.test(body), candidates: candidates.slice(0, 20) };
});
console.log('remove scan:', JSON.stringify(removed, null, 2));

// Try clicking × near the Seoul place chip
async function removeWrongPlaces() {
  // Find elements containing 서울 and click nearby delete
  const boxes = await page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      const t = (el.innerText || '').trim();
      if (!t || t.length > 120) continue;
      if (!/서울|중구|퇴계로|安山|대전광역시/.test(t)) continue;
      if (!/동방명주/.test(t)) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.x > -50)
        out.push({ t: t.slice(0, 100), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
    }
    return out.slice(0, 10);
  });
  console.log('wrong place boxes:', boxes);

  for (const b of boxes) {
    // try click X at right side of the chip/row
    const tryPoints = [
      [b.x + b.w - 16, b.y + b.h / 2],
      [b.x + b.w - 30, b.y + 12],
      [b.x + b.w + 10, b.y + b.h / 2],
    ];
    for (const [x, y] of tryPoints) {
      await page.mouse.click(x, y);
      console.log('clicked near wrong place', x, y);
      await sleep(500);
    }
  }

  // Also look for delete buttons with common patterns near 地区 section
  const delBtns = page.locator('[aria-label*="删除"], [aria-label*="삭제"], [aria-label*="remove"], [aria-label*="Remove"], button:has-text("×"), button:has-text("✕")');
  const n = await delBtns.count();
  console.log('del buttons', n);
  for (let i = 0; i < n; i++) {
    const btn = delBtns.nth(i);
    const box = await btn.boundingBox();
    if (!box) continue;
    // only if near place section (y around the place chips)
    await btn.click().catch(() => {});
    console.log('clicked del btn', i, box);
    await sleep(400);
  }

  // Evaluate: find button/svg inside place card containing 서울
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach((el) => {
      const txt = el.innerText || '';
      if (txt.length > 200 || txt.length < 5) return;
      if (!/동방명주/.test(txt)) return;
      if (!/서울|중구|퇴계|安山|대전/.test(txt)) return;
      // find clickable child
      const clickables = el.querySelectorAll('button, [role=button], svg, [class*="close"], [class*="Close"], [class*="delete"], [class*="Delete"], [class*="remove"]');
      clickables.forEach((c) => c.click());
    });
  });
  await sleep(600);
}

await removeWrongPlaces();

// Check if Seoul still there
let still = await page.evaluate(() => /서울|퇴계로/.test(document.body.innerText));
console.log('still has Seoul?', still);

if (still) {
  // More aggressive: find all × buttons on page near bottom of form
  const xs = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('button, span, div, i').forEach((el) => {
      const t = (el.innerText || '').trim();
      const aria = el.getAttribute('aria-label') || '';
      if (t === '×' || t === '✕' || t === 'x' || t === 'X' || /删除|삭제|remove/i.test(aria)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.x > 0 && r.y > 0)
          out.push({ t: t || aria, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
      }
    });
    return out;
  });
  console.log('X buttons:', xs);
  // Click X buttons that are in the lower part of form (place area y > 400-ish or near 동방)
  for (const x of xs) {
    // get nearby text
    const near = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x - 40, y);
      return (el?.innerText || el?.parentElement?.innerText || '').slice(0, 100);
    }, x);
    console.log('X near text:', near, x);
    if (/동방|서울|중구|旅游地|旅遊地/.test(near)) {
      await page.mouse.click(x.x + x.w / 2, x.y + x.h / 2);
      console.log('removed via X');
      await sleep(500);
    }
  }
}

still = await page.evaluate(() => /서울|퇴계로/.test(document.body.innerText));
console.log('after remove Seoul?', still);

// If still there, try opening place card edit
if (still) {
  // Click on the place name then look for delete
  const place = page.getByText(/대한민국 서울/);
  if ((await place.count()) > 0) {
    await place.first().click();
    await sleep(500);
    const del = page.getByRole('button', { name: /删除|삭제|移除|Remove/ });
    if ((await del.count()) > 0) await del.first().click();
  }
}

// 2) Open add place
await page.keyboard.press('Escape');
await sleep(300);
const addBtn = page.getByRole('button', { name: /添加地区和地点|添加地區和地點/ });
if ((await addBtn.count()) > 0) {
  await addBtn.first().click();
  console.log('opened add place');
  await sleep(1200);
}

// Find search
const search = page.locator('input[placeholder*="검색"], input[placeholder*="搜索"], input[placeholder*="관광지"]').first();
await search.waitFor({ state: 'visible', timeout: 8000 });
await search.click();
await page.keyboard.press('Meta+a');
// Search more specifically for the tower in Shanghai
await page.keyboard.type('동방명주탑 상하이', { delay: 50 });
await page.keyboard.press('Enter');
console.log('searched 동방명주탑 상하이');
await sleep(2500);

// List results and pick Shanghai only
const results = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('div, li, button').forEach((el) => {
    const t = (el.innerText || '').trim().replace(/\s+/g, ' ');
    if (!t || t.length > 150 || t.length < 4) return;
    if (!/동방명주탑|东方明珠|Oriental Pearl/i.test(t)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 50 || r.height < 20 || r.y < 80 || r.y > 900) return;
    out.push({
      t: t.slice(0, 120),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      isShanghai: /上海|상하이|Shang Hai|Pudong|Lujiazui|Pu Dong|中国|중국|中华/.test(t),
      isKorea: /서울|경기도|대전|대한민국/.test(t) && !/중국|中国|上海/.test(t),
    });
  });
  // dedupe by y
  const seen = new Set();
  return out.filter((r) => {
    const k = r.y;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
});
console.log('results:', JSON.stringify(results, null, 2));

// Prefer Shanghai
const target = results.find((r) => r.isShanghai) || results.find((r) => /동방명주탑/.test(r.t) && !r.isKorea);
if (!target) {
  // try alternate query
  await search.click();
  await page.keyboard.press('Meta+a');
  await page.keyboard.type('Oriental Pearl Tower Shanghai', { delay: 40 });
  await page.keyboard.press('Enter');
  await sleep(2500);
  const results2 = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('div, li').forEach((el) => {
      const t = (el.innerText || '').trim().replace(/\s+/g, ' ');
      if (!/Pearl|동방|明珠|名珠/i.test(t)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 50 || r.y < 80) return;
      out.push({ t: t.slice(0, 120), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        isShanghai: /上海|Shang|Pudong|중국|中国/.test(t) });
    });
    return out.slice(0, 15);
  });
  console.log('results2:', JSON.stringify(results2, null, 2));
  const t2 = results2.find((r) => r.isShanghai) || results2[0];
  if (!t2) {
    console.log('FAIL no Shanghai POI');
    process.exit(2);
  }
  await page.mouse.click(t2.x + 30, t2.y + 12);
  console.log('clicked', t2.t);
} else {
  await page.mouse.click(target.x + 30, target.y + 12);
  console.log('clicked', target.t);
}
await sleep(1500);

// 添加地点
const addPlace = page.getByRole('button', { name: /添加地点|添加地點/ });
if ((await addPlace.count()) > 0) {
  await addPlace.first().click();
  console.log('添加地点');
  await sleep(800);
}

// 旅游地
for (const lab of ['旅游地', '旅遊地', '여행지']) {
  const el = page.getByText(lab, { exact: true });
  if ((await el.count()) > 0) {
    const box = await el.first().boundingBox();
    if (box) {
      await page.mouse.click(box.x + 8, box.y + box.height / 2);
      console.log('type', lab);
      await sleep(300);
      break;
    }
  }
}

// 添加
const confirm = page.getByRole('button', { name: /^(添加|新增|추가)$/ });
if ((await confirm.count()) > 0) {
  const b = confirm.last();
  if (!(await b.isDisabled())) {
    await b.click();
    console.log('✓ 添加 confirmed');
    await sleep(1200);
  }
}

// If we still have Seoul, remove it again after adding correct one
still = await page.evaluate(() => /서울|퇴계로/.test(document.body.innerText));
if (still) {
  console.log('still Seoul after add — try remove again');
  await removeWrongPlaces();
}

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
  const placeLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (/地区|地点|동방|东方|Pearl|上海|서울|旅游地|司机|韩语|保存然后/.test(lines[i])) {
      placeLines.push(lines.slice(i, i + 3).join(' | '));
    }
  }
  return {
    redMsgs: [...new Set(redMsgs)],
    saveThenDisabled: saveThen?.disabled,
    placeLines: placeLines.slice(0, 25),
    hasShanghai: /上海|상하이|Pudong|Lujiazui|Shi Ji|世纪大道|中国|중华|中华/.test(document.body.innerText),
    hasSeoul: /서울|퇴계로/.test(document.body.innerText),
    hasTheme: /司机提供车辆|기사제공차량/.test(document.body.innerText),
    hasLang: /韩语|韓語|한국어/.test(document.body.innerText),
  };
});
console.log('\nFINAL:', JSON.stringify(final, null, 2));
process.exit(0);
