/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Add POI 东方明珠 for Pearl draft — single focused step.
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

// Ensure place search is open
if (!page.url().includes('place-search') && !page.url().includes('place')) {
  // close other popups
  await page.keyboard.press('Escape');
  await sleep(400);
  const btn = page.getByRole('button', { name: /添加地区和地点|添加地區和地點/ });
  if ((await btn.count()) > 0) {
    await btn.first().click();
    console.log('opened 添加地区和地点');
    await sleep(1200);
  }
}

// Dump all visible inputs and interactive elements in popup
const dump = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input, textarea')).map((el, i) => {
    const r = el.getBoundingClientRect();
    return {
      i,
      type: el.type,
      name: el.name,
      ph: el.placeholder,
      val: el.value,
      vis: r.width > 0 && r.height > 0 && r.x > -100,
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      aria: el.getAttribute('aria-label'),
      cls: (el.className || '').toString().slice(0, 60),
    };
  });
  const dialog = document.querySelector('[role="dialog"]') ||
    document.querySelector('[class*="Modal"]') ||
    document.querySelector('[class*="popup"]');
  return {
    url: location.href,
    inputs,
    dialogText: (dialog?.innerText || document.body.innerText).slice(0, 2000),
  };
});
console.log('DUMP inputs:', JSON.stringify(dump.inputs, null, 2));
console.log('DIALOG text:\n', dump.dialogText.slice(0, 1200));

// Try to find search box by placeholder 地方、地址搜索 or similar
async function findSearch() {
  // By placeholder
  const phs = [
    '地方',
    '地址',
    '搜索',
    '搜尋',
    '검색',
    'search',
    '장소',
  ];
  for (const ph of phs) {
    const loc = page.locator(`input[placeholder*="${ph}"]`);
    if ((await loc.count()) > 0) {
      const first = loc.first();
      if (await first.isVisible().catch(() => false)) {
        console.log('found by placeholder', ph);
        return first;
      }
    }
  }
  // By visible text input with reasonable size
  const all = page.locator('input');
  const n = await all.count();
  for (let i = 0; i < n; i++) {
    const el = all.nth(i);
    const box = await el.boundingBox().catch(() => null);
    if (!box || box.x < 0 || box.width < 80) continue;
    const type = await el.getAttribute('type');
    if (type && !['text', 'search', ''].includes(type)) continue;
    console.log('found visible input idx', i, box);
    return el;
  }
  return null;
}

let search = await findSearch();
if (!search) {
  // Click the "地方、地址搜索" area first
  const area = page.getByText(/地方.*地址|地址搜索|장소.*검색/);
  if ((await area.count()) > 0) {
    await area.first().click();
    console.log('clicked 地方、地址搜索 area');
    await sleep(500);
    search = await findSearch();
  }
}

if (!search) {
  console.log('FAIL: no search input');
  // try coordinate click near top of dialog
  await page.mouse.click(400, 200);
  await sleep(300);
  search = await findSearch();
}

if (!search) {
  console.log('STILL no search — exit');
  process.exit(1);
}

// Search for Oriental Pearl
const queries = ['동방명주', '东方明珠', 'Oriental Pearl Tower'];
let picked = false;

for (const q of queries) {
  console.log('\n--- search:', q);
  await search.click({ force: true });
  await sleep(200);
  // select all and type
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
  await page.keyboard.type(q, { delay: 40 });
  await sleep(400);
  await page.keyboard.press('Enter');
  console.log('pressed Enter');
  await sleep(2000);

  // dump results
  const results = await page.evaluate(() => {
    const texts = [];
    document.querySelectorAll('li, [role="option"], [class*="result"], [class*="Result"], [class*="item"], button, a, div').forEach((el) => {
      const t = (el.innerText || '').trim().replace(/\s+/g, ' ');
      if (!t || t.length > 80 || t.length < 2) return;
      if (/동방|东方|東方|Pearl|명주|明珠/i.test(t)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.y > 50 && r.y < 800)
          texts.push({ t: t.slice(0, 80), x: Math.round(r.x), y: Math.round(r.y), tag: el.tagName });
      }
    });
    return texts.slice(0, 15);
  });
  console.log('results:', JSON.stringify(results, null, 2));

  if (results.length > 0) {
    // click the first good result via mouse
    const r = results[0];
    await page.mouse.click(r.x + 20, r.y + 10);
    console.log('clicked result', r.t);
    picked = true;
    await sleep(1500);
    break;
  }

  // also try getByText
  for (const re of [/동방명주/, /东方明珠/, /Oriental Pearl/i]) {
    const loc = page.getByText(re);
    const c = await loc.count();
    if (c === 0) continue;
    for (let i = 0; i < Math.min(c, 5); i++) {
      const el = loc.nth(i);
      const box = await el.boundingBox();
      if (!box || box.y < 80) continue;
      await el.click({ timeout: 3000 });
      console.log('clicked getByText', re);
      picked = true;
      await sleep(1500);
      break;
    }
    if (picked) break;
  }
  if (picked) break;
}

if (!picked) {
  // dump full dialog again
  const t = await page.evaluate(() => (document.querySelector('[role=dialog]') || document.body).innerText.slice(0, 2500));
  console.log('NO RESULT. dialog:\n', t);
  process.exit(2);
}

// After selecting a place, UI usually asks location type + 添加
await sleep(800);
const afterPick = await page.evaluate(() => {
  const d = document.querySelector('[role=dialog]') || document.body;
  return d.innerText.slice(0, 1800);
});
console.log('after pick:\n', afterPick);

// Click 添加地点 if needed
const addPlace = page.getByRole('button', { name: /添加地点|添加地點|장소 추가/ });
if ((await addPlace.count()) > 0) {
  await addPlace.first().click().catch(() => {});
  console.log('clicked 添加地点');
  await sleep(800);
}

// Select 旅游地 / TRAVEL_PLACE
const typeLabels = ['旅游地', '旅遊地', '여행지'];
for (const lab of typeLabels) {
  const el = page.getByText(lab, { exact: false });
  if ((await el.count()) === 0) continue;
  const box = await el.first().boundingBox();
  if (box && box.x > 0) {
    await page.mouse.click(box.x + 10, box.y + box.height / 2);
    console.log('clicked type', lab);
    await sleep(400);
    break;
  }
}

// Also try radio/select
await page.evaluate(() => {
  const radios = document.querySelectorAll('input[type=radio], [role=radio]');
  for (const r of radios) {
    const txt = (r.closest('label') || r.parentElement)?.innerText || '';
    if (/旅游地|旅遊地|여행지|TRAVEL/.test(txt)) {
      r.click();
      return true;
    }
  }
  // select option
  const sels = document.querySelectorAll('select');
  for (const s of sels) {
    for (const o of s.options) {
      if (/旅游地|旅遊地|여행지|TRAVEL/.test(o.text)) {
        s.value = o.value;
        s.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
  }
  return false;
});

await sleep(400);

// Final 添加 button
const addBtns = page.getByRole('button', { name: /^(添加|新增|추가|确认|確認|완료)$/ });
const nAdd = await addBtns.count();
console.log('add buttons count', nAdd);
for (let i = nAdd - 1; i >= 0; i--) {
  const b = addBtns.nth(i);
  const dis = await b.isDisabled().catch(() => true);
  const t = await b.innerText();
  console.log(`  btn[${i}] ${t} disabled=${dis}`);
  if (!dis) {
    await b.click();
    console.log('  ✓ clicked', t);
    await sleep(1200);
    break;
  }
}

// Also try generic 添加 without exact
const generic = page.locator('button').filter({ hasText: /^添加$|^新增$|^추가$/ });
if ((await generic.count()) > 0) {
  const last = generic.last();
  if (!(await last.isDisabled().catch(() => true))) {
    await last.click().catch(() => {});
    console.log('clicked generic 添加');
    await sleep(1000);
  }
}

await sleep(800);
// Escape leftover modals
if (page.url().includes('popup')) {
  // check if still red
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
  const saveThen = Array.from(document.querySelectorAll('button')).find((b) =>
    /保存然后|保存然後/.test(b.innerText || ''),
  );
  const near = [];
  const lines = document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (/地区|地点|东方|동방|明珠|Pearl|司机|韩语|保存/.test(lines[i])) {
      near.push(lines.slice(i, i + 3).join(' | '));
    }
  }
  return {
    redMsgs: [...new Set(redMsgs)],
    saveThenDisabled: saveThen?.disabled,
    near: near.slice(0, 20),
    url: location.href,
  };
});
console.log('\nFINAL:', JSON.stringify(final, null, 2));
process.exit(0);
