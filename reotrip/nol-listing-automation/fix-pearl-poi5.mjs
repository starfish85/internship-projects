/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Check TRAVEL_PLACE radio via real mouse, then click 添加.
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

// Locate TRAVEL_PLACE radio and its label
const info = await page.evaluate(() => {
  const radio = document.querySelector('input[type=radio][value="TRAVEL_PLACE"]');
  if (!radio) return { found: false };
  const label = radio.closest('label') || document.querySelector(`label[for="${radio.id}"]`);
  const rr = radio.getBoundingClientRect();
  const lr = label?.getBoundingClientRect();
  return {
    found: true,
    checked: radio.checked,
    radio: { x: rr.x, y: rr.y, w: rr.width, h: rr.height },
    labelText: (label?.innerText || '').slice(0, 40),
    label: lr ? { x: lr.x, y: lr.y, w: lr.width, h: lr.height } : null,
    allRadios: Array.from(document.querySelectorAll('input[type=radio]')).map((r) => ({
      value: r.value,
      checked: r.checked,
      y: Math.round(r.getBoundingClientRect().y),
      text: (r.closest('label')?.innerText || '').replace(/\s+/g, ' ').slice(0, 30),
    })),
  };
});
console.log('radio info', JSON.stringify(info, null, 2));

if (!info.found) {
  console.log('TRAVEL_PLACE not found — re-open flow');
  process.exit(2);
}

// Click label with mouse (preferred) once only if not checked
if (!info.checked) {
  if (info.label && info.label.x > -100) {
    await page.mouse.click(info.label.x + 20, info.label.y + info.label.h / 2);
    console.log('clicked TRAVEL_PLACE label');
  } else if (info.radio.x > -100) {
    await page.mouse.click(info.radio.x + 5, info.radio.y + 5);
    console.log('clicked TRAVEL_PLACE radio');
  } else {
    // force via evaluate click on label text
    await page.getByText('旅游地', { exact: true }).last().click({ force: true });
    console.log('force clicked last 旅游地');
  }
  await sleep(500);
} else {
  console.log('already TRAVEL_PLACE');
}

// verify checked
const checked = await page.evaluate(() => {
  const r = document.querySelector('input[type=radio][value="TRAVEL_PLACE"]');
  return {
    travel: r?.checked,
    all: Array.from(document.querySelectorAll('input[type=radio]')).filter((x) => x.checked).map((x) => x.value),
  };
});
console.log('checked after:', checked);

// nameTag
const nameVal = await page.evaluate(() => {
  const n = document.querySelector('input[name="nameTag"]');
  return n?.value;
});
console.log('nameTag:', nameVal);
if (!nameVal) {
  await page.locator('input[name="nameTag"]').fill('동방명주');
}

await sleep(400);

// 添加 button state
const addState = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button')).filter((b) => /^(添加|新增|추가)$/.test((b.innerText || '').trim()));
  return btns.map((b) => {
    const r = b.getBoundingClientRect();
    return { text: b.innerText.trim(), disabled: b.disabled, x: r.x, y: r.y, w: r.width, h: r.height };
  });
});
console.log('添加 state:', addState);

for (const b of addState) {
  if (!b.disabled) {
    await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
    console.log('✓ clicked 添加');
    await sleep(1500);
  }
}

// If still disabled, try clicking label area more carefully for each radio text
const stillDis = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => /^(添加|新增|추가)$/.test((b.innerText || '').trim()));
  return btn?.disabled;
});

if (stillDis) {
  console.log('still disabled — try full label texts');
  // Print full action sheet
  const sheet = await page.evaluate(() => {
    // find the bottom sheet / action sheet content
    const candidates = Array.from(document.querySelectorAll('div')).filter((d) => {
      const t = d.innerText || '';
      return t.includes('选择地点类型') || t.includes('TRAVEL') || t.includes('旅游地') && t.includes('添加');
    });
    const best = candidates.sort((a, b) => a.innerText.length - b.innerText.length)[0];
    return best ? best.innerText.slice(0, 1500) : document.body.innerText.slice(0, 1500);
  });
  console.log('sheet:\n', sheet);

  // Click by value via label association - use page.locator input value + click parent
  const travelLabel = page.locator('label').filter({ has: page.locator('input[value="TRAVEL_PLACE"]') });
  if ((await travelLabel.count()) > 0) {
    const box = await travelLabel.first().boundingBox();
    console.log('travel label box', box);
    if (box) {
      await page.mouse.click(box.x + 40, box.y + box.height / 2);
      await sleep(400);
    }
  }

  // React-friendly: dispatch click events
  await page.evaluate(() => {
    const radio = document.querySelector('input[type=radio][value="TRAVEL_PLACE"]');
    if (!radio) return;
    const label = radio.closest('label');
    if (label) {
      label.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
    radio.checked = true;
    radio.dispatchEvent(new Event('input', { bubbles: true }));
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    radio.click();
  });
  await sleep(600);

  const add2 = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /^(添加|新增|추가)$/.test((b.innerText || '').trim()));
    return btn ? { disabled: btn.disabled, text: btn.innerText } : null;
  });
  console.log('添加 after force:', add2);
  if (add2 && !add2.disabled) {
    await page.locator('button').filter({ hasText: /^(添加|新增|추가)$/ }).last().click();
    console.log('✓ 添加 after force');
    await sleep(1500);
  }
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
  const place = [];
  for (let i = 0; i < lines.length; i++) {
    if (/商品地区|旅游地|동방|司机|韩语|保存然后|Century/.test(lines[i])) {
      place.push(lines.slice(i, i + 3).join(' | '));
    }
  }
  return {
    url: location.href,
    redMsgs: [...new Set(redMsgs)],
    saveThenDisabled: saveThen?.disabled ?? 'missing',
    place: place.slice(0, 12),
    hasPlaceCard: /Century|LuJia|中华人民共和国/.test(document.body.innerText) && !location.href.includes('popup'),
  };
});
console.log('\nFINAL', JSON.stringify(final, null, 2));
process.exit(0);
