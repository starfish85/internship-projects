/**
 * Pop Mart option step helper — element locators only.
 * argv: resume | times | next | create <0-3> | status
 */
import { chromium } from 'playwright';

const DRAFT = '3851a9dd-61bb-4b8c-ad7a-e6616eb3f611';
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const CITY = '베이징 시내 호텔';
const DEST = '베이징 팝마트';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CMD = process.argv[2] || 'status';
const ARG = process.argv[3];

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

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
await page.bringToFront();
page.setDefaultTimeout(12000);

async function stay() {
  const elim = page.getByRole('button', { name: /^消除$/ });
  if ((await elim.count()) > 0) await elim.last().click().catch(() => {});
}

function readTimes() {
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

async function tempThenNext(label) {
  await stay();
  // Prefer form footer buttons by exact text; pick narrowest 临时保存 / widest 下一个
  const temps = page.locator('button').filter({ hasText: /^(临时保存|臨時存儲)$/ });
  let ti = -1,
    tw = Infinity;
  for (let i = 0; i < (await temps.count()); i++) {
    if (await temps.nth(i).isDisabled()) continue;
    const b = await temps.nth(i).boundingBox();
    if (b && b.width < tw) {
      tw = b.width;
      ti = i;
    }
  }
  if (ti >= 0) {
    await temps.nth(ti).click();
    console.log(label, 'temp', tw);
    await sleep(1800);
  }
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
  if (ni >= 0) {
    await nexts.nth(ni).click();
    console.log(label, 'next', nw);
    await sleep(3500);
  }
  await stay();
}

/** Fill 08:00–21:30 / 30min / gen / modal save — element only */
async function setTimes() {
  // If already in time popup (hash option-time-slots), don't re-open
  const inPopup =
    page.url().includes('time-slots') ||
    (await page.getByRole('button', { name: /重复\s*小时\s*添加|반복 시간/ }).count()) > 0;

  if (!inPopup) {
    const setup = page.getByRole('button', { name: /^(设置时间|設定時間)$/ });
    if ((await setup.count()) > 0) await setup.first().click();
    else {
      const more = page.locator('button[aria-label="더 보기"]');
      if ((await more.count()) > 0) {
        await more.first().click();
        await sleep(400);
        await page.getByText('编辑', { exact: true }).click().catch(() => {});
      }
    }
    await sleep(1200);
  }

  // clear rows
  for (let i = 0; i < 40; i++) {
    const del = page.getByRole('button', { name: /^(删除|刪除)$/ });
    if ((await del.count()) === 0) break;
    await del.first().click().catch(() => {});
    await sleep(80);
  }

  // 重复 小时 添加
  const rep = page.getByRole('button', { name: /重复\s*小时\s*添加|重复小时添加|반복 시간 추가/ });
  console.log('rep count', await rep.count());
  if ((await rep.count()) > 0) await rep.first().click();
  await sleep(1000);

  async function pick(idx, h, m) {
    // time field buttons: 选择 or HH:MM inside dialog / page near 开始
    const candidates = page.locator('button').filter({ hasText: /^(选择|選擇|\d{2}:\d{2})$/ });
    const wide = [];
    for (let i = 0; i < (await candidates.count()); i++) {
      const box = await candidates.nth(i).boundingBox();
      if (box && box.width >= 80 && box.y > 50) wide.push(i);
    }
    const pickI = wide[idx] ?? idx;
    console.log('  pick field', idx, '→', pickI, 'wide', wide);
    await candidates.nth(pickI).click();
    await sleep(500);

    // hour
    let hourHit = page.getByRole('option', { name: h, exact: true });
    if ((await hourHit.count()) === 0) hourHit = page.locator('[role=listbox]').getByText(h, { exact: true });
    if ((await hourHit.count()) > 0) await hourHit.first().click();
    else await page.getByText(h, { exact: true }).first().click().catch(() => {});
    await sleep(200);

    // minute
    let minHit = page.getByRole('option', { name: m, exact: true });
    if ((await minHit.count()) === 0) minHit = page.locator('[role=listbox]').getByText(m, { exact: true });
    if ((await minHit.count()) > 0) await minHit.last().click();
    else await page.getByText(m, { exact: true }).last().click().catch(() => {});
    await sleep(250);
    await page.getByRole('button', { name: /^(确定|確定)$/ }).click().catch(() => {});
    await sleep(200);
  }

  await pick(0, '08', '00');
  await pick(1, '21', '30');

  // 分钟 interval
  const minBtn = page.locator('button').filter({ hasText: /^(分钟|分鐘)$/ });
  if ((await minBtn.count()) > 0) await minBtn.first().click();
  else await page.getByText(/分钟|分鐘/).first().click().catch(() => {});
  await sleep(400);
  const thirty = page.getByRole('option', { name: '30', exact: true });
  if ((await thirty.count()) > 0) await thirty.last().click();
  else {
    // pick 30 near dropdown, not day 30
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[role=option],button,li,div')).filter((e) => {
        const t = (e.innerText || '').trim();
        const r = e.getBoundingClientRect();
        return t === '30' && r.height > 10 && r.height < 48 && r.width > 20 && r.y > 80;
      });
      els[els.length - 1]?.click();
    });
  }
  await sleep(400);

  // read back before gen
  const pre = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).map((b) => (b.innerText || '').trim());
    return {
      times: btns.filter((t) => /^\d{2}:\d{2}$/.test(t) || t === '选择' || t === '選擇'),
      gen: btns.find((t) => t === '生成' || t === '一代' || t === '생성'),
      genDis: Array.from(document.querySelectorAll('button')).find((b) =>
        /^(生成|一代|생성)$/.test((b.innerText || '').trim()),
      )?.disabled,
    };
  });
  console.log('  preGen', pre);

  const gen = page.getByRole('button', { name: /^(生成|一代|생성)$/ });
  if ((await gen.count()) > 0) await gen.first().click();
  else await page.locator('button').filter({ hasText: /生成|一代|생성/ }).first().click();
  await sleep(2000);

  // modal 保存
  const save = page.locator('[role=dialog]').getByRole('button', { name: /^(保存|節省|节省)$/ });
  if ((await save.count()) > 0) await save.last().click();
  else await page.getByRole('button', { name: /^(保存|節省|节省)$/ }).filter({ hasNotText: /临时/ }).last().click();
  await sleep(1500);

  const v = await readTimes();
  console.log('  times result', v);
  return v;
}

async function fixPriceType(opt) {
  // if mangled (5度去 etc), re-open and set Korean
  const body = await page.locator('body').innerText();
  if (body.includes(opt.pt)) {
    console.log('pt already', opt.pt);
    return;
  }
  await page.getByRole('button', { name: /选择价格类型|選擇價格類型/ }).first().click().catch(() => {});
  await sleep(1000);
  // if already has a type, may need edit — click 其他
  await page.getByText(/其他价格类型|其他價格類型|기타 가격 타입/).first().click().catch(() => {});
  await sleep(600);
  const namePh = page.locator(
    'input[placeholder*="销售渠道"], input[placeholder*="銷售渠道"], input[placeholder*="名稱"], input[placeholder*="名称"], [role=dialog] input[type=text]',
  );
  if ((await namePh.count()) > 0) {
    await namePh.first().fill(opt.pt);
  }
  const descPh = page.locator('input[placeholder*="滿"], input[placeholder*="例"]');
  if ((await descPh.count()) > 0) await descPh.last().fill(opt.ptd);
  for (const sel of ['[aria-labelledby="ETC-required-label"]', '[aria-labelledby="ETC-representative-label"]']) {
    const el = page.locator(sel).first();
    if ((await el.count()) && (await el.getAttribute('aria-checked')) !== 'true') await el.click();
  }
  await page.getByRole('button', { name: /^(完成|완료)$/ }).last().click();
  await sleep(800);
  await page.locator('#name').fill(opt.name);
}

async function createFresh(opt) {
  console.log('create', opt.key);
  // close any popup
  await page.keyboard.press('Escape').catch(() => {});
  await stay();
  if (!page.url().includes('/option') || page.url().includes('hash')) {
    await page.goto(LIST, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
  }
  await page.getByRole('button', { name: /注册\/添加选项|註冊\/添加選項|注册\/添加/ }).first().click();
  await sleep(2500);
  await page.locator('#name').fill(opt.name);
  await page.locator('#description, textarea[name=description]').first().fill(opt.desc);
  await page.locator('#minPurchaseQuantity, input[name=minPurchaseQuantity]').fill('1').catch(() => {});
  await page.locator('#maxPurchaseQuantity, input[name=maxPurchaseQuantity]').fill('10').catch(() => {});

  await page.getByRole('button', { name: /选择价格类型|選擇價格類型/ }).first().click();
  await sleep(1000);
  await page.getByText(/其他价格类型|其他價格類型|기타 가격 타입/).first().click();
  await sleep(700);
  const inputs = page.locator('[role=dialog] input');
  // first text-like for name
  for (let i = 0; i < (await inputs.count()); i++) {
    const ph = (await inputs.nth(i).getAttribute('placeholder')) || '';
    const ty = (await inputs.nth(i).getAttribute('type')) || 'text';
    if (ty === 'checkbox' || ty === 'radio' || ty === 'hidden') continue;
    if (/说明|說明|滿|例|desc/i.test(ph)) {
      await inputs.nth(i).fill(opt.ptd);
    } else if (i < 3) {
      await inputs.nth(i).fill(opt.pt);
      break;
    }
  }
  // fill desc second pass
  for (let i = 0; i < (await inputs.count()); i++) {
    const ph = (await inputs.nth(i).getAttribute('placeholder')) || '';
    if (/说明|說明|滿|例/.test(ph)) await inputs.nth(i).fill(opt.ptd);
  }
  for (const sel of ['[aria-labelledby="ETC-required-label"]', '[aria-labelledby="ETC-representative-label"]']) {
    const el = page.locator(sel).first();
    if ((await el.count()) && (await el.getAttribute('aria-checked')) !== 'true') await el.click().catch(() => {});
  }
  // qty in dialog if any
  await page.getByRole('button', { name: /^(完成|완료)$/ }).last().click();
  await sleep(1000);
  await page.locator('#name').fill(opt.name);

  const oneYear = page.locator('input[value=ONE_YEAR]');
  if ((await oneYear.count()) > 0) await oneYear.first().evaluate((el) => el.click());
  else await page.getByText(/^1年$/).first().click().catch(() => {});
  await sleep(400);
  const priceIn = page.locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]');
  if ((await priceIn.count()) > 0) await priceIn.last().fill(opt.price);

  const v = await setTimes();
  await tempThenNext(opt.key);
  return v;
}

async function status() {
  const mods = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
  const name = await page.locator('#name').inputValue().catch(() => '');
  const times = await readTimes();
  console.log({
    url: page.url().slice(0, 120),
    mods,
    name: name.slice(0, 50),
    times,
    bodyHead: (await page.locator('body').innerText()).slice(0, 400).replace(/\n/g, ' | '),
  });
}

console.log('CMD', CMD);
if (CMD === 'status') {
  await status();
} else if (CMD === 'times') {
  const v = await setTimes();
  console.log('DONE times', v);
  process.exit(v.count === 28 ? 0 : 2);
} else if (CMD === 'next') {
  await tempThenNext('manual');
  await status();
} else if (CMD === 'resume') {
  // finish current open form: fix pt + times + next
  const opt = OPTIONS[Number(ARG || 0)];
  console.log('resume', opt.key);
  await page.locator('#name').fill(opt.name).catch(() => {});
  await fixPriceType(opt);
  // price
  const priceIn = page.locator('input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"]');
  if ((await priceIn.count()) > 0) await priceIn.last().fill(opt.price);
  const v = await setTimes();
  if (!(v.count === 28 && v.first === '08:00' && v.last === '21:30')) {
    console.log('times fail, retry');
    await setTimes();
  }
  await tempThenNext(opt.key);
  await status();
} else if (CMD === 'create') {
  const i = Number(ARG || 0);
  const v = await createFresh(OPTIONS[i]);
  console.log('created', OPTIONS[i].key, v);
  await status();
} else if (CMD === 'all') {
  // if form open with name, resume 0 first
  const name = await page.locator('#name').inputValue().catch(() => '');
  let start = 0;
  if (name && name.includes('5인승') && name.includes('출발')) {
    console.log('form open — resume 0');
    const opt = OPTIONS[0];
    await page.locator('#name').fill(opt.name);
    const v = await setTimes();
    console.log('times0', v);
    await tempThenNext('5go');
    start = 1;
  }
  for (let i = start; i < 4; i++) {
    await createFresh(OPTIONS[i]);
  }
  await page.goto(LIST, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  const mods = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
  console.log('FINAL mods', mods, 'NEVER 提交审核');
  process.exit(mods >= 4 ? 0 : 1);
}

process.exit(0);
