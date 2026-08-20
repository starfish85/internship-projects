/**
 * Create ONE Pop Mart option (argv index 0-3). Element locators only.
 * Usage: node popmart-one-option.mjs 1
 */
import { chromium } from 'playwright';

const DRAFT = '3851a9dd-61bb-4b8c-ad7a-e6616eb3f611';
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const CITY = '베이징 시내 호텔';
const DEST = '베이징 팝마트';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IDX = Number(process.argv[2] ?? 1);

const OPTIONS = [
  {
    key: '5go',
    price: '219',
    name: `${CITY} 출발 → ${DEST} 편도 이동 (5인승 차량)`,
    desc: `${CITY} 출발 → ${DEST} 편도 이동 (5인승 차량, 최대 4인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n5인승 차량: 최대 2개까지 적재 가능`,
    pt: '5인승 가는',
    ptd: '5인승 차량',
  },
  {
    key: '7go',
    price: '313',
    name: `${CITY} 출발 → ${DEST} 편도 이동 (7인승 차량)`,
    desc: `${CITY} 출발 → ${DEST} 편도 이동 (7인승 차량, 최대 6인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n7인승 차량: 최대 3개까지 적재 가능`,
    pt: '7인승 가는',
    ptd: '7인승 차량',
  },
  {
    key: '5rtn',
    price: '219',
    name: `${DEST} 출발 → ${CITY} 편도 이동 (5인승 차량)`,
    desc: `${DEST} 출발 → ${CITY} 편도 이동 (5인승 차량, 최대 4인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n5인승 차량: 최대 2개까지 적재 가능`,
    pt: '5인승 오는',
    ptd: '5인승 차량',
  },
  {
    key: '7rtn',
    price: '313',
    name: `${DEST} 출발 → ${CITY} 편도 이동 (7인승 차량)`,
    desc: `${DEST} 출발 → ${CITY} 편도 이동 (7인승 차량, 최대 6인 탑승 가능)\n24인치(표준) 이하 수하물 기준: 59cm(높이) × 41cm(너비) × 24cm(두께) 이내\n7인승 차량: 최대 3개까지 적재 가능`,
    pt: '7인승 오는',
    ptd: '7인승 차량',
  },
];

const opt = OPTIONS[IDX];
if (!opt) throw new Error('bad index ' + IDX);

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
await page.bringToFront();
page.setDefaultTimeout(8000);

console.log('ONE', IDX, opt.key, opt.price);

// clean list
await page.keyboard.press('Escape').catch(() => {});
await page.goto(LIST, { waitUntil: 'domcontentloaded' });
await sleep(2500);
const before = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
console.log('mods before', before);

await page.getByRole('button', { name: /注册\/添加选项|註冊\/添加選項|注册\/添加/ }).first().click();
await sleep(2500);
console.log('form open', page.url().includes('option'));

await page.locator('#name').fill(opt.name);
await page.locator('textarea[name=description], #description').first().fill(opt.desc);
await page.locator('#minPurchaseQuantity').fill('1').catch(() => {});
await page.locator('#maxPurchaseQuantity').fill('10').catch(() => {});
console.log('basic filled');

// price type
await page.getByRole('button', { name: /选择价格类型|選擇價格類型/ }).first().click();
await sleep(1200);
console.log('pt modal open');

// click 其他价格类型 via evaluate (element click)
await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('button,div,label,span')).find((e) => {
    const t = (e.innerText || '').trim();
    return /其他价格类型|其他價格類型|기타 가격 타입/.test(t) && t.length < 40;
  });
  el?.click();
});
await sleep(800);
console.log('other pt clicked');

// fill pt name/desc via evaluate set + input event (avoid actionability hang)
await page.evaluate(
  ({ pt, ptd }) => {
    const dlg = document.querySelector('[role=dialog]');
    if (!dlg) return 'no-dlg';
    const inputs = Array.from(dlg.querySelectorAll('input')).filter((i) => {
      const ty = (i.type || 'text').toLowerCase();
      return ty === 'text' || ty === '' || ty === 'search' || !i.type;
    });
    const set = (el, val) => {
      if (!el) return;
      const proto = HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    // heuristics: first non-qty text = name, second = desc
    const texts = inputs.filter((i) => !/quantity|min|max|number/i.test(i.name || i.id || ''));
    set(texts[0] || inputs[0], pt);
    set(texts[1] || inputs[1], ptd);
    // required + representative checkboxes by aria
    for (const sel of [
      '[aria-labelledby="ETC-required-label"]',
      '[aria-labelledby="ETC-representative-label"]',
      '[aria-labelledby*="required"]',
      '[aria-labelledby*="representative"]',
    ]) {
      const el = dlg.querySelector(sel);
      if (el && el.getAttribute('aria-checked') !== 'true') el.click();
    }
    // also tick inputs named required if any
    dlg.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      const lab = cb.getAttribute('aria-labelledby') || '';
      if (/required|representative/i.test(lab) && !cb.checked) cb.click();
    });
    return { inputs: inputs.length, texts: texts.length };
  },
  { pt: opt.pt, ptd: opt.ptd },
);
console.log('pt filled via evaluate');
await sleep(300);

// 完成
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('[role=dialog] button, button')).find((x) => {
    const t = (x.innerText || '').trim();
    return t === '完成' || t === '완료';
  });
  b?.click();
});
await sleep(1000);
console.log('pt done');

// re-fill name
await page.locator('#name').fill(opt.name);

// 1 year
await page.evaluate(() => {
  const one = document.querySelector('input[value=ONE_YEAR]');
  if (one && !one.checked) one.click();
  else {
    Array.from(document.querySelectorAll('label,button,div'))
      .find((e) => (e.innerText || '').trim() === '1年')
      ?.click();
  }
});
await sleep(400);

// price
const priceIn = page.locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]');
if ((await priceIn.count()) > 0) {
  await priceIn.last().fill(opt.price);
  console.log('price', opt.price);
}

// —— times ——
async function setTimes() {
  console.log('setTimes…');
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return t === '设置时间' || t === '設定時間';
    });
    b?.click();
  });
  await sleep(1200);

  // delete old
  for (let i = 0; i < 25; i++) {
    const ok = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => {
        const t = (x.innerText || '').trim();
        const r = x.getBoundingClientRect();
        return (t === '删除' || t === '刪除') && !x.disabled && r.y > 80;
      });
      if (!b) return false;
      b.click();
      return true;
    });
    if (!ok) break;
    await sleep(60);
  }

  // 重复 小时 添加
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').replace(/\s+/g, ' ').trim();
      return t === '重复 小时 添加' || t === '重复小时添加' || t.includes('반복 시간');
    });
    b?.click();
  });
  await sleep(1000);

  async function pick(idx, hour, minute) {
    await page.evaluate((idx) => {
      const fields = Array.from(document.querySelectorAll('button'))
        .map((b, i) => {
          const t = (b.innerText || '').trim();
          const r = b.getBoundingClientRect();
          return { i, t, w: r.width, y: r.y };
        })
        .filter((b) => (b.t === '选择' || b.t === '選擇' || /^\d{2}:\d{2}$/.test(b.t)) && b.w >= 100 && b.y > 80 && b.y < 900);
      const f = fields[idx] || fields[0];
      if (f) document.querySelectorAll('button')[f.i].click();
    }, idx);
    await sleep(500);
    await page.evaluate((h) => {
      const els = Array.from(document.querySelectorAll('[role=option],div,li,span')).filter((e) => {
        const t = (e.innerText || '').trim();
        const r = e.getBoundingClientRect();
        return t === h && e.children.length === 0 && r.height > 8 && r.height < 40 && r.y > 50;
      });
      els.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
      els[0]?.click();
    }, hour);
    await sleep(200);
    await page.evaluate((m) => {
      const els = Array.from(document.querySelectorAll('[role=option],div,li,span')).filter((e) => {
        const t = (e.innerText || '').trim();
        const r = e.getBoundingClientRect();
        return t === m && e.children.length === 0 && r.height > 8 && r.height < 40 && r.y > 50;
      });
      els.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
      els[0]?.click();
    }, minute);
    await sleep(250);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /^(确定|確定)$/.test((b.innerText || '').trim()))
        ?.click();
    });
    await sleep(150);
  }

  await pick(0, '08', '00');
  await pick(1, '21', '30');

  // 分钟 30
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => {
        const t = (b.innerText || '').trim();
        return t === '分钟' || t === '分鐘';
      })
      ?.click();
  });
  await sleep(350);
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[role=option],button,li,div')).filter((e) => {
      const t = (e.innerText || '').trim();
      const r = e.getBoundingClientRect();
      return t === '30' && r.height > 10 && r.height < 48 && r.width > 20 && r.y > 80 && r.y < 900;
    });
    els[els.length - 1]?.click();
  });
  await sleep(350);

  // 生成/一代
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /^(生成|一代|생성)$/.test((b.innerText || '').trim()))
      ?.click();
  });
  await sleep(2000);

  // modal 保存
  await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role=dialog]'));
    const dlg = dialogs[dialogs.length - 1] || document;
    Array.from(dlg.querySelectorAll('button'))
      .find((b) => /^(保存|節省|节省)$/.test((b.innerText || '').trim()))
      ?.click();
  });
  await sleep(1500);

  // close leftover time popup / dimmed scrim that blocks 临时保存
  // MUST wait until form footer 下一个 is visible (not just Escape which may discard)
  for (let k = 0; k < 8; k++) {
    const st = await page.evaluate(() => {
      const scrim = !!document.querySelector('[class*="DimmedScrim"], [class*="action-popup__Dimmed"]');
      const hash = location.hash.includes('time-slots');
      const next = Array.from(document.querySelectorAll('button')).some((b) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return (t === '下一个' || t === '下個') && r.width > 150 && r.height > 0 && !b.disabled;
      });
      return { scrim, hash, next };
    });
    console.log('  popup state', k, st);
    if (!st.scrim && !st.hash && st.next) break;
    // prefer 保存 then 关闭 inside dialog
    await page.evaluate(() => {
      const dialogs = Array.from(document.querySelectorAll('[role=dialog]'));
      const root = dialogs[dialogs.length - 1] || document;
      const save = Array.from(root.querySelectorAll('button')).find((b) =>
        /^(保存|節省|节省)$/.test((b.innerText || '').trim()),
      );
      if (save) {
        save.click();
        return;
      }
      const close = Array.from(root.querySelectorAll('button')).find((b) =>
        /^(关闭|關閉)$/.test((b.innerText || '').trim()),
      );
      close?.click();
    });
    await sleep(600);
  }

  return page.evaluate(() => {
    const t = document.body.innerText;
    const m = t.match(/时间段\s*\n\s*([0-9:·.\s]+)/);
    if (!m) return { count: 0 };
    const slots = m[1]
      .split(/[·.\s]+/)
      .map((s) => s.trim())
      .filter((x) => /^\d{2}:\d{2}$/.test(x));
    return { count: slots.length, first: slots[0], last: slots[slots.length - 1] };
  });
}

let times = await setTimes();
console.log('times', times);
if (!(times.count === 28 && times.first === '08:00' && times.last === '21:30')) {
  console.log('retry times');
  times = await setTimes();
  console.log('times2', times);
}

// temp + next — Playwright locators (same as successful 5go card)
async function tempThenNext() {
  // dismiss leave if any first
  const elim0 = page.getByRole('button', { name: /^消除$/ });
  if ((await elim0.count()) > 0) await elim0.last().click().catch(() => {});

  const temps = page.locator('button').filter({ hasText: /^(临时保存|臨時存儲)$/ });
  let ti = -1,
    tw = Infinity;
  for (let i = 0; i < (await temps.count()); i++) {
    if (await temps.nth(i).isDisabled()) continue;
    const b = await temps.nth(i).boundingBox();
    if (b && b.width > 0 && b.width < tw) {
      tw = b.width;
      ti = i;
    }
  }
  if (ti < 0) {
    console.log('temp MISSING', await temps.count());
    return false;
  }
  // force in case residual overlay; prefer clean close first
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(200);
  await temps.nth(ti).click({ force: true });
  console.log('temp', tw);
  await sleep(2000);

  const nexts = page.locator('button').filter({ hasText: /^(下一个|下個|下个)$/ });
  let ni = -1,
    nw = 0;
  for (let i = 0; i < (await nexts.count()); i++) {
    if (await nexts.nth(i).isDisabled()) continue;
    const b = await nexts.nth(i).boundingBox();
    if (b && b.width > nw) {
      nw = b.width;
      ni = i;
    }
  }
  if (ni < 0) {
    console.log('next MISSING', await nexts.count());
    return false;
  }
  await nexts.nth(ni).click({ force: true });
  console.log('next', nw);
  await sleep(3500);

  // if leave dialog: 消除 stay, fail; do NOT click 确定
  const leave = await page.evaluate(() => /有变化|更改将丢失|确定要离开/.test(document.body.innerText));
  if (leave) {
    console.log('LEAVE DIALOG — unsaved');
    await page.getByRole('button', { name: /^消除$/ }).last().click().catch(() => {});
    return false;
  }
  return true;
}

let saved = await tempThenNext();
if (!saved) {
  console.log('retry tempThenNext once');
  saved = await tempThenNext();
}

// only goto list if form closed; else stay and report
await sleep(500);
let after = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
if (after <= before) {
  // maybe still on form — try next only
  const onForm = (await page.locator('#name').count()) > 0;
  console.log('after save check', { after, onForm, name: await page.locator('#name').inputValue().catch(() => '') });
  if (onForm) {
    saved = await tempThenNext();
    after = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
  }
}
if (after <= before) {
  await page.goto(LIST, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  after = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
}
console.log('DONE', opt.key, { before, after, times, saved });
console.log('NEVER 提交审核');
process.exit(after > before ? 0 : 1);
