/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Complete place-type selection (旅游地) then 添加 for already-picked Shanghai POI.
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

// Dump interactive controls in the place dialog
const dump = await page.evaluate(() => {
  const root = document.querySelector('[role=dialog]') || document.body;
  const controls = [];
  root.querySelectorAll('button, input, select, [role=button], [role=combobox], [role=listbox], [role=option], [role=radio], [role=checkbox], label').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || r.y < 0 || r.y > 1000) return;
    controls.push({
      tag: el.tagName,
      role: el.getAttribute('role'),
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      text: (el.innerText || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60),
      ph: el.getAttribute('placeholder'),
      disabled: !!el.disabled,
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
    });
  });
  return {
    text: root.innerText.slice(0, 2000),
    controls: controls.slice(0, 60),
  };
});
console.log('TEXT:\n', dump.text);
console.log('CONTROLS:', JSON.stringify(dump.controls, null, 2));

// Click "选择地点类型" area / combobox
async function openTypePicker() {
  const labels = ['选择地点类型', '選擇地點類型', '장소 유형', '地点类型'];
  for (const lab of labels) {
    const el = page.getByText(lab);
    if ((await el.count()) === 0) continue;
    const box = await el.first().boundingBox();
    if (!box) continue;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + 20);
    console.log('clicked near', lab, box);
    await sleep(600);
    return true;
  }
  // try combobox
  const cb = page.locator('[role=combobox], select').first();
  if ((await cb.count()) > 0) {
    await cb.click();
    console.log('clicked combobox');
    await sleep(500);
    return true;
  }
  return false;
}

// If 添加地点 still visible, click it first
const addPlace = page.getByRole('button', { name: /添加地点|添加地點/ });
if ((await addPlace.count()) > 0) {
  const dis = await addPlace.first().isDisabled().catch(() => true);
  if (!dis) {
    await addPlace.first().click();
    console.log('clicked 添加地点');
    await sleep(1000);
  }
}

await openTypePicker();

// Dump options after open
const opts = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('[role=option], li, [class*="option"], [class*="Option"], [class*="menu"] div, [class*="Menu"] div, label').forEach((el) => {
    const t = (el.innerText || '').trim().replace(/\s+/g, ' ');
    if (!t || t.length > 40) return;
    if (!/旅游|旅遊|住宿|机场|機場|车站|車站|여행|호텔|관광|기타|其他|景点/.test(t)) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.y > 0)
      out.push({ t, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w || r.width), h: Math.round(r.height), tag: el.tagName });
  });
  return out.slice(0, 30);
});
console.log('type options:', JSON.stringify(opts, null, 2));

// Click 旅游地 option
const tour = opts.find((o) => /旅游地|旅遊地|여행지/.test(o.t) && !/选择|選擇|请|請/.test(o.t));
if (tour) {
  await page.mouse.click(tour.x + 20, tour.y + tour.h / 2);
  console.log('✓ selected type', tour.t);
  await sleep(600);
} else {
  // try getByRole option
  const opt = page.getByRole('option', { name: /旅游地|旅遊地|여행지/ });
  if ((await opt.count()) > 0) {
    await opt.first().click();
    console.log('✓ option role 旅游地');
    await sleep(600);
  } else {
    // click any visible exact 旅游地 below y=500 (form area)
    const all = page.getByText('旅游地', { exact: true });
    const c = await all.count();
    console.log('旅游地 count', c);
    for (let i = 0; i < c; i++) {
      const box = await all.nth(i).boundingBox();
      console.log('  旅游地', i, box);
      if (box && box.y > 500) {
        await page.mouse.click(box.x + 10, box.y + box.height / 2);
        console.log('  clicked lower 旅游地');
        await sleep(500);
        break;
      }
    }
  }
}

// Maybe need place name field too - fill if empty
const nameInput = page.locator('input[name*="name"], input[placeholder*="名称"], input[placeholder*="이름"], input[placeholder*="地点名称"]').first();
if ((await nameInput.count()) > 0 && (await nameInput.isVisible().catch(() => false))) {
  const v = await nameInput.inputValue();
  console.log('name input value:', v);
  if (!v) {
    await nameInput.fill('동방명주탑');
    console.log('filled name 동방명주탑');
  }
}

// Also look for all inputs in dialog
const inputs = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('input, select, textarea')).map((el) => {
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      type: el.type,
      name: el.name,
      ph: el.placeholder,
      val: el.value,
      vis: r.width > 0 && r.y > 0 && r.y < 1000,
      x: Math.round(r.x),
      y: Math.round(r.y),
    };
  }).filter((i) => i.vis);
});
console.log('visible inputs:', JSON.stringify(inputs, null, 2));

// Fill any empty text input in lower form that looks like name
for (const inp of inputs) {
  if (inp.type === 'text' && !inp.val && inp.y > 500) {
    const loc = page.locator('input').nth(
      await page.evaluate((y) => {
        const list = Array.from(document.querySelectorAll('input'));
        return list.findIndex((el) => Math.abs(el.getBoundingClientRect().y - y) < 2);
      }, inp.y),
    );
    // skip search bar
    if (inp.ph && /검색|搜索|관광지/.test(inp.ph)) continue;
    await page.mouse.click(inp.x + 20, inp.y + 20);
    await page.keyboard.type('동방명주탑', { delay: 30 });
    console.log('typed name into y=', inp.y);
    await sleep(300);
  }
}

await sleep(500);

// Check 添加 enabled
const adds = page.locator('button').filter({ hasText: /^(添加|新增|추가)$/ });
const n = await adds.count();
for (let i = 0; i < n; i++) {
  const b = adds.nth(i);
  const dis = await b.isDisabled().catch(() => true);
  const t = (await b.innerText()).trim();
  const box = await b.boundingBox();
  console.log(`添加[${i}] disabled=${dis}`, box);
  if (!dis) {
    await b.click();
    console.log('✓ 添加 clicked');
    await sleep(1500);
  }
}

// If still disabled, dump again
const finalDump = await page.evaluate(() => {
  const root = document.querySelector('[role=dialog]') || document.body;
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
    if (/商品地区|旅游地|동방|司机|韩语|保存然后|Century|选择地点/.test(lines[i])) {
      place.push(lines.slice(i, i + 3).join(' | '));
    }
  }
  return {
    dialog: root.innerText.slice(0, 1500),
    redMsgs: [...new Set(redMsgs)],
    saveThenDisabled: saveThen?.disabled ?? 'missing',
    place: place.slice(0, 12),
  };
});
console.log('\nFINAL', JSON.stringify(finalDump, null, 2));
process.exit(0);
