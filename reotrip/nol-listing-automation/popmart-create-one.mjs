/**
 * Create ONE Pop Mart option by index 0-3. Element locators only.
 * Hard gates: price-type sheet closed → times 28 → popup closed → temp+next → mods+1
 * Usage: node popmart-create-one.mjs <0-3>
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
if (!opt) throw new Error('bad idx ' + IDX);

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
await page.bringToFront();
page.setDefaultTimeout(10000);

function log(...a) {
  console.log(...a);
}

async function listClean() {
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => {
    [...document.querySelectorAll('button')]
      .find((b) => /^(消除|关闭|關閉)$/.test((b.innerText || '').trim()))
      ?.click();
  });
  await sleep(300);
  await page.goto(LIST, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
}

async function modsCount() {
  return page.getByRole('button', { name: /修改选项|修改選項/ }).count();
}

async function waitNoScrim(label, max = 12) {
  for (let i = 0; i < max; i++) {
    const st = await page.evaluate(() => {
      const scrim = !!document.querySelector('[class*="DimmedScrim"], [class*="action-popup__Dimmed"]');
      const hash = location.hash || '';
      const next = [...document.querySelectorAll('button')].some((b) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return (t === '下一个' || t === '下個') && r.width > 150 && r.height > 20 && !b.disabled;
      });
      const tempNarrow = [...document.querySelectorAll('button')].some((b) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return (t === '临时保存' || t === '臨時存儲') && r.width > 80 && r.width < 200 && !b.disabled;
      });
      return { scrim, hash, next, tempNarrow };
    });
    log(`  [${label}] gate`, i, st);
    if (!st.scrim && !/age-type|time-slots|action-sheet/.test(st.hash) && st.next && st.tempNarrow) {
      return true;
    }
    // try close/save/eliminate
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const save = btns.find((b) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return t === '保存' && r.width > 40 && r.y > 100;
      });
      if (save) {
        save.click();
        return;
      }
      const close = btns.find((b) => /^(关闭|關閉|完成|완료)$/.test((b.innerText || '').trim()) && b.getBoundingClientRect().width > 40);
      if (close) {
        close.click();
        return;
      }
    });
    await sleep(600);
  }
  return false;
}

async function fillPriceType() {
  await page.getByRole('button', { name: /选择价格类型|選擇價格類型/ }).first().click();
  await sleep(1200);
  // 其他价格类型
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,div,label,span')].find((e) => {
      const t = (e.innerText || '').trim();
      return /其他价格类型|其他價格類型|기타 가격 타입/.test(t) && t.length < 50;
    });
    el?.click();
  });
  await sleep(900);

  // fill via evaluate
  const filled = await page.evaluate(
    ({ pt, ptd }) => {
      const roots = [...document.querySelectorAll('[role=dialog]')];
      const root = roots[roots.length - 1] || document.body;
      const inputs = [...root.querySelectorAll('input')].filter((i) => {
        const t = (i.type || 'text').toLowerCase();
        return t === 'text' || t === '' || t === 'search' || !i.type;
      });
      const set = (el, val) => {
        if (!el) return;
        const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        d?.set?.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      set(inputs[0], pt);
      set(inputs[1], ptd);
      // min/max if present among number-looking
      for (const inp of root.querySelectorAll('input')) {
        const ph = (inp.placeholder || '') + (inp.name || '');
        if (/最小|最少|min/i.test(ph)) set(inp, '1');
        if (/最大|max/i.test(ph)) set(inp, '10');
      }
      for (const sel of [
        '[aria-labelledby="ETC-required-label"]',
        '[aria-labelledby="ETC-representative-label"]',
      ]) {
        const el = document.querySelector(sel);
        if (el && el.getAttribute('aria-checked') !== 'true') el.click();
      }
      // also role=checkbox near 必须/代表
      return { n: inputs.length, v0: inputs[0]?.value, v1: inputs[1]?.value };
    },
    { pt: opt.pt, ptd: opt.ptd },
  );
  log('  pt fill', filled);
  await sleep(400);

  // 完成
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => {
      const t = (x.innerText || '').trim();
      return t === '完成' || t === '완료';
    });
    b?.click();
  });
  await sleep(1200);

  // wait age-type hash gone
  for (let i = 0; i < 10; i++) {
    if (!page.url().includes('age-type')) break;
    log('  waiting pt close', i, page.url().slice(-40));
    await page.evaluate(() => {
      [...document.querySelectorAll('button')]
        .find((b) => /^(完成|완료)$/.test((b.innerText || '').trim()))
        ?.click();
    });
    await sleep(500);
  }
  if (page.url().includes('age-type')) {
    // cancel and fail
    await page.getByRole('button', { name: /^消除$/ }).click().catch(() => {});
    throw new Error('price type sheet still open');
  }
  log('  pt closed OK');
}

async function setTimes() {
  // open
  const setup = page.locator('button').filter({ hasText: /^(设置时间|設定時間)$/ });
  if ((await setup.count()) > 0) {
    await setup.first().scrollIntoViewIfNeeded().catch(() => {});
    await setup.first().click({ force: true });
  } else {
    await page.evaluate(() => {
      [...document.querySelectorAll('button')]
        .find((b) => /设置时间|設定時間/.test((b.innerText || '').trim()))
        ?.click();
    });
  }
  await sleep(1500);

  // clear
  for (let i = 0; i < 25; i++) {
    const ok = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => {
        const t = (x.innerText || '').trim();
        const r = x.getBoundingClientRect();
        return (t === '删除' || t === '刪除') && !x.disabled && r.width > 0 && r.y > 80;
      });
      if (!b) return false;
      b.click();
      return true;
    });
    if (!ok) break;
    await sleep(50);
  }

  // 重复 小时 添加
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => {
      const t = (x.innerText || '').replace(/\s+/g, ' ').trim();
      return t === '重复 小时 添加' || t === '重复小时添加' || t.includes('반복 시간');
    });
    b?.click();
  });
  await sleep(1000);

  async function pick(idx, hour, minute) {
    await page.evaluate((idx) => {
      const fields = [...document.querySelectorAll('button')]
        .map((b, i) => {
          const t = (b.innerText || '').trim();
          const r = b.getBoundingClientRect();
          return { i, t, w: r.width, y: r.y };
        })
        .filter(
          (b) =>
            (b.t === '选择' || b.t === '選擇' || /^\d{2}:\d{2}$/.test(b.t)) &&
            b.w >= 100 &&
            b.y > 80 &&
            b.y < 900,
        );
      const f = fields[idx] || fields[0];
      if (f) document.querySelectorAll('button')[f.i].click();
    }, idx);
    await sleep(450);
    await page.evaluate((h) => {
      const els = [...document.querySelectorAll('[role=option],div,li,span')].filter((e) => {
        const t = (e.innerText || '').trim();
        const r = e.getBoundingClientRect();
        return t === h && e.children.length === 0 && r.height > 8 && r.height < 40 && r.y > 50;
      });
      els.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
      els[0]?.click();
    }, hour);
    await sleep(150);
    await page.evaluate((m) => {
      const els = [...document.querySelectorAll('[role=option],div,li,span')].filter((e) => {
        const t = (e.innerText || '').trim();
        const r = e.getBoundingClientRect();
        return t === m && e.children.length === 0 && r.height > 8 && r.height < 40 && r.y > 50;
      });
      els.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
      els[0]?.click();
    }, minute);
    await sleep(200);
    await page.evaluate(() => {
      [...document.querySelectorAll('button')]
        .find((b) => /^(确定|確定)$/.test((b.innerText || '').trim()))
        ?.click();
    });
    await sleep(120);
  }

  await pick(0, '08', '00');
  await pick(1, '21', '30');

  // 分钟 30
  await page.evaluate(() => {
    [...document.querySelectorAll('button')]
      .find((b) => {
        const t = (b.innerText || '').trim();
        return t === '分钟' || t === '分鐘';
      })
      ?.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('[role=option],button,li,div')].filter((e) => {
      const t = (e.innerText || '').trim();
      const r = e.getBoundingClientRect();
      return t === '30' && r.height > 10 && r.height < 48 && r.width > 20 && r.y > 80 && r.y < 900;
    });
    els[els.length - 1]?.click();
  });
  await sleep(300);

  // 生成
  await page.evaluate(() => {
    [...document.querySelectorAll('button')]
      .find((b) => /^(生成|一代|생성)$/.test((b.innerText || '').trim()))
      ?.click();
  });
  await sleep(2200);

  // 弹窗 保存 — must click
  const saveClicked = await page.evaluate(() => {
    const saves = [...document.querySelectorAll('button')].filter((b) => {
      const t = (b.innerText || '').trim();
      const r = b.getBoundingClientRect();
      return t === '保存' && r.width > 40 && r.height > 20;
    });
    if (!saves.length) return 0;
    saves[saves.length - 1].click();
    return saves.length;
  });
  log('  modal save clicks', saveClicked);
  await sleep(1500);

  // wait popup gone
  const ok = await waitNoScrim('afterTimes');
  if (!ok) {
    // force 关闭
    await page.evaluate(() => {
      [...document.querySelectorAll('button')]
        .find((b) => /^(关闭|關閉)$/.test((b.innerText || '').trim()))
        ?.click();
    });
    await sleep(800);
  }

  const times = await page.evaluate(() => {
    const m = document.body.innerText.match(/时间段\s*\n\s*([0-9:·.\s]+)/);
    if (!m) return { count: 0 };
    const slots = m[1]
      .split(/[·.\s]+/)
      .map((s) => s.trim())
      .filter((x) => /^\d{2}:\d{2}$/.test(x));
    return { count: slots.length, first: slots[0], last: slots[slots.length - 1] };
  });
  log('  form times', times);
  return times;
}

async function tempThenNext() {
  // ensure no scrim
  await waitNoScrim('beforeSave', 6);

  const temps = page.locator('button').filter({ hasText: /^(临时保存|臨時存儲)$/ });
  let ti = -1,
    tw = Infinity;
  for (let i = 0; i < (await temps.count()); i++) {
    if (await temps.nth(i).isDisabled()) continue;
    const b = await temps.nth(i).boundingBox();
    // prefer form footer narrow (~120), skip page-level ~359 if narrow exists
    if (b && b.width > 0 && b.width < tw) {
      tw = b.width;
      ti = i;
    }
  }
  log('  temp pick', ti, tw);
  if (ti < 0) throw new Error('no temp save');
  await temps.nth(ti).click({ force: true });
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
  log('  next pick', ni, nw, 'count', await nexts.count());
  if (ni < 0) {
    // try DOM click
    const ok = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => {
        const t = (x.innerText || '').trim();
        const r = x.getBoundingClientRect();
        return (t === '下一个' || t === '下個') && r.width > 100 && !x.disabled;
      });
      if (!b) return false;
      b.click();
      return true;
    });
    if (!ok) throw new Error('no next button');
  } else {
    await nexts.nth(ni).click({ force: true });
  }
  await sleep(3500);

  const leave = await page.evaluate(() => /有变化|更改将丢失|确定要离开/.test(document.body.innerText));
  if (leave) {
    log('  LEAVE DIALOG — unsaved');
    await page.getByRole('button', { name: /^消除$/ }).last().click().catch(() => {});
    return false;
  }
  return true;
}

// —— main ——
log('=== CREATE', IDX, opt.key, opt.price);
await listClean();
const before = await modsCount();
log('mods before', before);

await page.getByRole('button', { name: /注册\/添加选项|註冊\/添加選項|注册\/添加/ }).first().click();
await sleep(2500);

await page.locator('#name').fill(opt.name);
await page.locator('textarea[name=description], #description').first().fill(opt.desc);
await page.locator('#minPurchaseQuantity').fill('1').catch(() => {});
await page.locator('#maxPurchaseQuantity').fill('10').catch(() => {});
log('basic ok');

await fillPriceType();
// re-fill name after PT overwrite
await page.locator('#name').fill(opt.name);

// 1 year
await page.evaluate(() => {
  const one = document.querySelector('input[value=ONE_YEAR]');
  if (one && !one.checked) one.click();
  else
    [...document.querySelectorAll('label,button,div')]
      .find((e) => (e.innerText || '').trim() === '1年')
      ?.click();
});
await sleep(400);

const priceIn = page.locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]');
if ((await priceIn.count()) > 0) await priceIn.last().fill(opt.price);
log('price', opt.price);

let times = await setTimes();
if (!(times.count === 28 && times.first === '08:00' && times.last === '21:30')) {
  log('times retry');
  times = await setTimes();
}
if (!(times.count === 28 && times.first === '08:00' && times.last === '21:30')) {
  console.error('FAIL times gate', times);
  process.exit(2);
}

let saved = await tempThenNext();
if (!saved) {
  log('retry tempThenNext');
  saved = await tempThenNext();
}

// verify list
await sleep(500);
let after = await modsCount();
if (after <= before) {
  await listClean();
  after = await modsCount();
}
const body = await page.locator('body').innerText();
log('DONE', {
  key: opt.key,
  before,
  after,
  times,
  saved,
  hasName: body.includes(opt.name.slice(0, 20)),
});
console.log('NEVER 提交审核');
process.exit(after > before ? 0 : 1);
