/**
 * Create Pearl option 1: 5인승 가는, price 213, times 08:00-21:30
 * Ends with 临时保存 → 下一个. Never 提交审核.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NAME = '상하이 시내 호텔 출발 → 동방명주탑 편도 이동 (5인승 차량)';
const DESC = `상하이 시내 호텔 출발 → 동방명주탑 편도 이동 (5인승 차량, 최대 4인 탑승 가능)
24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내
5인승 차량: 최대 2개까지 적재 가능`;
const PT_NAME = '5인승 가는';
const PT_DESC = '5인승 차량';
const PRICE = '213';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
await page.bringToFront().catch(() => {});
console.log('START', page.url());

async function clickBtn(re, label) {
  const loc = page.getByRole('button', { name: re });
  if ((await loc.count()) === 0) {
    // text fallback
    const hit = await page.evaluate((src) => {
      const re = new RegExp(src);
      const b = Array.from(document.querySelectorAll('button, [role=button], a')).find((el) => {
        const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
        if (/提交审核|批准/.test(t)) return false;
        return re.test(t) && !el.disabled;
      });
      if (!b) return null;
      b.scrollIntoView({ block: 'center' });
      b.click();
      return (b.innerText || '').trim().slice(0, 40);
    }, re.source || String(re));
    console.log(label || 'click', hit);
    return !!hit;
  }
  const b = loc.first();
  if (await b.isDisabled().catch(() => true)) {
    console.log(label, 'disabled');
    return false;
  }
  await b.click();
  console.log(label || 'click', await b.innerText());
  return true;
}

// 1) Open add option
console.log('\n1) 注册/添加选项');
await clickBtn(/注册\/添加选项|註冊\/添加選項|添加选项/, 'add');
await sleep(2500);
console.log('url', page.url());

// dump fields
const fields = await page.evaluate(() =>
  Array.from(document.querySelectorAll('input, textarea')).map((el) => ({
    name: el.name,
    id: el.id,
    ph: el.placeholder,
    type: el.type,
    y: Math.round(el.getBoundingClientRect().y),
  })),
);
console.log('fields', JSON.stringify(fields.slice(0, 25), null, 2));

// 2) name + desc
console.log('\n2) name/desc');
const nameLoc = page.locator('input[name=name], #name, input[name=optionName]').first();
if (await nameLoc.count()) {
  await nameLoc.fill(NAME);
  console.log('name ok');
} else {
  await page.locator('input[type=text]').first().fill(NAME);
  console.log('name via first text');
}
const descLoc = page.locator('textarea').first();
if (await descLoc.count()) {
  await descLoc.fill(DESC);
  console.log('desc ok');
}

// qty 1-10 if present
for (const [sel, val] of [
  ['input[name=minimumPurchaseQuantity]', '1'],
  ['input[name=maximumPurchaseQuantity]', '10'],
  ['input[name=minQuantity]', '1'],
  ['input[name=maxQuantity]', '10'],
]) {
  const loc = page.locator(sel);
  if (await loc.count()) await loc.fill(val);
}

// 3) price type
console.log('\n3) price type');
await clickBtn(/选择价格类型|選擇價格類型|가격 타입/, 'priceType');
await sleep(1500);

// tab 其他
await page.evaluate(() => {
  const tab = Array.from(document.querySelectorAll('div,button,span,a')).find((e) => {
    const t = (e.innerText || '').trim();
    return /其他价格|其他價格|기타 가격|手动输入|手動輸入|직접 입력/.test(t) && t.length < 40;
  });
  tab?.click();
});
await sleep(1000);

// fill by placeholder with playwright
const namePh = page.locator(
  'input[placeholder*="销售渠道"], input[placeholder*="銷售渠道"], input[placeholder*="输入的名称"], input[placeholder*="輸入的名稱"]',
);
if (await namePh.count()) {
  await namePh.first().fill(PT_NAME);
  console.log('pt name via ph');
} else {
  // first empty text in dialog
  await page.evaluate((pn) => {
    const inputs = Array.from(document.querySelectorAll('[role=dialog] input[type=text], input[type=text]')).filter(
      (i) => !i.disabled && i.getBoundingClientRect().y > 0,
    );
    const empty = inputs.filter((i) => !i.value);
    const set = (el, v) => {
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    if (empty[0]) set(empty[0], pn);
  }, PT_NAME);
  console.log('pt name fallback');
}

const descPh = page.locator('input[placeholder*="满 19"], input[placeholder*="滿 19"], input[placeholder*="例"]');
if (await descPh.count()) {
  await descPh.first().fill(PT_DESC);
  console.log('pt desc via ph');
} else {
  await page.evaluate((pd) => {
    const inputs = Array.from(document.querySelectorAll('input[type=text]')).filter(
      (i) => !i.disabled && i.getBoundingClientRect().y > 100,
    );
    const set = (el, v) => {
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    // second text field often description
    if (inputs[1]) set(inputs[1], pd);
  }, PT_DESC);
}

// min max 1 10 for price type
await page.evaluate(() => {
  const tels = Array.from(document.querySelectorAll('input[type=tel], input[type=number]')).filter(
    (i) => i.getBoundingClientRect().y > 0 && !i.disabled,
  );
  const set = (el, v) => {
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  // last two tel often min/max
  if (tels.length >= 2) {
    set(tels[tels.length - 2], '1');
    set(tels[tels.length - 1], '10');
  }
});

// required + representative checkboxes
await page.evaluate(() => {
  for (const id of ['ETC-required-label', 'ETC-representative-label']) {
    const box = document.querySelector(`[aria-labelledby="${id}"]`);
    if (box && box.getAttribute('aria-checked') !== 'true') box.click();
  }
  // also role=checkbox near 必需/代表
  document.querySelectorAll('[role=checkbox]').forEach((c) => {
    const t = (c.closest('label,div')?.innerText || '').replace(/\s+/g, ' ');
    if (/必需|必须|代表|대표|required/i.test(t) && c.getAttribute('aria-checked') !== 'true') c.click();
  });
});
await sleep(400);

await clickBtn(/^完成$|^완료$|^节省$|^節省$/, 'pt complete');
await sleep(1500);

// re-fill option name
console.log('\n4) re-fill name + period + price');
if (await nameLoc.count()) await nameLoc.fill(NAME);
else await page.locator('input[name=name], #name').fill(NAME).catch(() => {});

// ONE_YEAR
await page.evaluate(() => {
  const y = document.querySelector('input[value="ONE_YEAR"]');
  if (y) {
    y.click();
    return;
  }
  const lab = Array.from(document.querySelectorAll('label,span,div')).find((e) => {
    const t = (e.innerText || '').trim();
    return (t === '1年' || t === '一年' || t.startsWith('1年')) && t.length < 10;
  });
  lab?.click();
});
await sleep(1000);

// price once
const priceInput = page.locator(
  'input[placeholder*="价格"], input[placeholder*="價格"], input[name=price], input[placeholder*="請輸入價格"], input[placeholder*="请输入价格"]',
);
if (await priceInput.count()) {
  const el = priceInput.last();
  await el.scrollIntoViewIfNeeded();
  if (!(await el.isDisabled())) {
    await el.fill(PRICE);
    console.log('price', await el.inputValue());
  } else {
    console.log('price disabled still');
  }
} else {
  await page.evaluate((price) => {
    const el = Array.from(document.querySelectorAll('input')).find((i) => {
      const ph = i.placeholder || '';
      return /价格|價格|price/i.test(ph + i.name) && !i.disabled;
    });
    if (!el) return;
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    s.call(el, price);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, PRICE);
  console.log('price via evaluate');
}

// 5) times
console.log('\n5) times 08:00-21:30');
let timeOpened = await clickBtn(/设置时间|設定時間|设置时间段/, 'setTime');
if (!timeOpened) {
  // ⋯ menu
  await page.evaluate(() => {
    const more = Array.from(document.querySelectorAll('button')).find((b) => {
      const al = b.getAttribute('aria-label') || '';
      return al.includes('더 보기') || al.includes('more');
    });
    more?.click();
  });
  await sleep(500);
  await page.getByText('编辑', { exact: true }).click().catch(() => {});
  await sleep(1200);
}
await sleep(1500);

// dump time modal
const timeUi = await page.evaluate(() => {
  const dlg = document.querySelector('[role=dialog]');
  const btns = Array.from(document.querySelectorAll('button'))
    .map((b) => (b.innerText || '').trim())
    .filter((t) => t && t.length < 20)
    .slice(0, 40);
  return { dialog: dlg?.innerText?.slice(0, 500), btns };
});
console.log('time UI', JSON.stringify(timeUi, null, 2).slice(0, 1500));

// 重复 小时 添加
await clickBtn(/重复.*小时.*添加|重复时间添加|반복 시간 추가|重复添加/, 'repeat');
await sleep(1000);

// generate UI
const hasGen = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button')).some((b) => /生成|一代|생성/.test(b.innerText || '')),
);
console.log('has generate', hasGen);

if (hasGen) {
  // Click first time field / 选择
  await page.evaluate(() => {
    const fields = Array.from(document.querySelectorAll('button')).filter((b) => {
      const t = (b.innerText || '').trim();
      const r = b.getBoundingClientRect();
      return (t === '选择' || t === '選擇' || /^\d{2}:\d{2}$/.test(t)) && r.y > 0 && r.height > 20;
    });
    fields[0]?.click();
  });
  await sleep(500);
  // hour 08 - leftmost
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('[role=option], div, li, span')).filter((el) => {
      const t = (el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      return t === '08' && r.width > 0 && r.height > 0 && r.height < 50;
    });
    opts.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
    opts[0]?.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('[role=option], div, li, span')).filter((el) => {
      const t = (el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      return t === '00' && r.width > 0 && r.height > 0 && r.height < 50;
    });
    opts.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
    opts[0]?.click();
  });
  await sleep(400);

  // second field 21:30
  await page.evaluate(() => {
    const fields = Array.from(document.querySelectorAll('button')).filter((b) => {
      const t = (b.innerText || '').trim();
      const r = b.getBoundingClientRect();
      return (t === '选择' || t === '選擇' || /^\d{2}:\d{2}$/.test(t)) && r.y > 0 && r.height > 20;
    });
    fields[1]?.click();
  });
  await sleep(500);
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('[role=option], div, li, span')).filter((el) => {
      const t = (el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      return t === '21' && r.width > 0 && r.height > 0 && r.height < 50;
    });
    opts.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
    opts[0]?.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('[role=option], div, li, span')).filter((el) => {
      const t = (el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      return t === '30' && r.width > 0 && r.height > 0 && r.height < 50;
    });
    opts.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
    opts[0]?.click();
  });
  await sleep(400);

  // interval 30 min
  await clickBtn(/分钟|分鐘/, 'minute unit');
  await sleep(300);
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('[role=option],button,li,div')).find((e) => {
      const t = (e.innerText || '').trim();
      const r = e.getBoundingClientRect();
      return t === '30' && r.width > 0 && r.height < 60;
    });
    el?.click();
  });
  await sleep(300);

  // MUST generate
  await clickBtn(/生成|一代|생성/, 'generate');
  await sleep(2500);

  // verify count
  const slots = await page.evaluate(() => {
    const t = (document.querySelector('[role=dialog]') || document.body).innerText;
    const times = t.match(/\b\d{2}:\d{2}\b/g) || [];
    return { unique: [...new Set(times)], count: new Set(times).size };
  });
  console.log('slots unique', slots.count, slots.unique[0], '...', slots.unique[slots.unique.length - 1]);

  await clickBtn(/^保存$|^节省$|^節省$|^完成$/, 'time save');
  await sleep(1500);
}

// re-fill name again
if (await page.locator('input[name=name], #name').count()) {
  await page.locator('input[name=name], #name').first().fill(NAME);
}

// 6) 临时保存 → 下一个
console.log('\n6) 临时保存 → 下一个');
// form footer 临时保存 (narrow)
const temps = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button'))
    .map((b, i) => {
      const t = (b.innerText || '').trim();
      const r = b.getBoundingClientRect();
      return { i, t, d: b.disabled, w: Math.round(r.width), y: Math.round(r.y) };
    })
    .filter((b) => b.t === '临时保存' || b.t === '臨時存儲'),
);
console.log('temp buttons', temps);
const tempOk = temps.filter((b) => !b.d).sort((a, b) => b.y - a.y || a.w - b.w)[0];
if (tempOk) {
  await page.locator('button').nth(tempOk.i).click();
  console.log('temp saved', tempOk);
  await sleep(2000);
}

const nexts = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button'))
    .map((b, i) => {
      const t = (b.innerText || '').trim();
      const r = b.getBoundingClientRect();
      return { i, t, d: b.disabled, w: Math.round(r.width), y: Math.round(r.y) };
    })
    .filter((b) => b.t === '下一个' || b.t === '下个' || b.t === '下個'),
);
console.log('next buttons', nexts);
const nextOk = nexts.filter((b) => !b.d && b.w > 100).sort((a, b) => b.w - a.w)[0];
if (nextOk) {
  await page.locator('button').nth(nextOk.i).click();
  console.log('next clicked', nextOk);
  await sleep(3000);
} else {
  console.log('NO next enabled');
}

// leave dialog?
if (await page.getByRole('button', { name: /^消除$/ }).count()) {
  console.log('leave dialog — 消除 and retry save');
  await page.getByRole('button', { name: /^消除$/ }).last().click();
  await sleep(500);
}

console.log('AFTER', page.url());
const list = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    hasName: t.includes('5인승') || t.includes('동방명주탑 편도'),
    hasSale: /판매중|可销售|可供出售|销售中/.test(t),
    snip: t.slice(0, 600),
  };
});
console.log(JSON.stringify(list, null, 2));
process.exit(0);
