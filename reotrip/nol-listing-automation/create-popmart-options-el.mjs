/**
 * Pop Mart — create 4 options + China times (ELEMENT LOCATORS ONLY).
 * No page.mouse.click(x,y). Draft 3851a9dd-…
 * Prices: 5→219  7→313 | Korean pt only | NEVER 提交审核
 */
import { chromium } from 'playwright';

const DRAFT = '3851a9dd-61bb-4b8c-ad7a-e6616eb3f611';
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const CITY = '베이징 시내 호텔';
const DEST = '베이징 팝마트';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
page.setDefaultTimeout(20000);

async function stayIfLeave() {
  const elim = page.getByRole('button', { name: /^消除$/ });
  if ((await elim.count()) > 0) {
    await elim.last().click().catch(() => {});
    await sleep(400);
  }
}

/** Form footer: narrow 临时保存 then wide 下一个 — pick by text + relative width (not mouse xy click). */
async function tempThenNext(label) {
  await stayIfLeave();
  const temps = page.locator('button').filter({ hasText: /^(临时保存|臨時存儲)$/ });
  let tempIdx = -1;
  let minW = Infinity;
  for (let i = 0; i < (await temps.count()); i++) {
    if (await temps.nth(i).isDisabled()) continue;
    const box = await temps.nth(i).boundingBox();
    if (box && box.width < minW) {
      minW = box.width;
      tempIdx = i;
    }
  }
  if (tempIdx >= 0) {
    await temps.nth(tempIdx).click();
    console.log(label, 'tempSave w=', minW);
    await sleep(1800);
  } else {
    console.log(label, 'tempSave MISSING');
  }

  const nexts = page.locator('button').filter({ hasText: /^(下一个|下個|下个)$/ });
  let nextIdx = -1;
  let maxW = 0;
  for (let i = 0; i < (await nexts.count()); i++) {
    if (await nexts.nth(i).isDisabled()) continue;
    const box = await nexts.nth(i).boundingBox();
    if (box && box.width > maxW) {
      maxW = box.width;
      nextIdx = i;
    }
  }
  if (nextIdx >= 0) {
    await nexts.nth(nextIdx).click();
    console.log(label, 'next w=', maxW);
    await sleep(3500);
  } else {
    console.log(label, 'next MISSING');
  }
  await stayIfLeave();
}

async function listClean() {
  await page.keyboard.press('Escape').catch(() => {});
  await stayIfLeave();
  await page.goto(LIST, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
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

async function setChinaTimes() {
  // open editor via role/text
  const setup = page.getByRole('button', { name: /^(设置时间|設定時間)$/ });
  if ((await setup.count()) > 0) {
    await setup.first().click();
  } else {
    const more = page.locator('button[aria-label="더 보기"]');
    if ((await more.count()) > 0) {
      await more.first().click();
      await sleep(400);
      await page.getByText('编辑', { exact: true }).click().catch(() =>
        page.getByRole('menuitem', { name: /编辑|編輯/ }).click(),
      );
    }
  }
  await sleep(1500);

  // delete old rows
  for (let g = 0; g < 40; g++) {
    const del = page.getByRole('button', { name: /^(删除|刪除)$/ });
    if ((await del.count()) === 0) break;
    await del.first().click().catch(() => {});
    await sleep(100);
  }

  // 重复 小时 添加 — exact button
  const rep = page.getByRole('button', { name: /重复\s*小时\s*添加|重复小时添加|반복 시간 추가/ });
  if ((await rep.count()) > 0) await rep.first().click();
  else {
    await page
      .locator('button')
      .filter({ hasText: /重复.*添加|반복 시간/ })
      .first()
      .click();
  }
  await sleep(1000);

  async function pickTimeField(idx, hour, minute) {
    // element: dialog buttons that are 选择 or HH:MM
    const dlg = page.locator('[role=dialog]').last();
    const fields = dlg.locator('button').filter({ hasText: /^(选择|選擇|\d{2}:\d{2})$/ });
    // filter wide ones in evaluate via nth of matching
    const count = await fields.count();
    let clicked = false;
    for (let i = 0, seen = 0; i < count; i++) {
      const box = await fields.nth(i).boundingBox();
      if (!box || box.width < 80) continue;
      if (seen === idx) {
        await fields.nth(i).click();
        clicked = true;
        break;
      }
      seen++;
    }
    if (!clicked && count > idx) await fields.nth(idx).click();
    await sleep(500);

    // hour option (left) — getByRole option preferred
    const hourOpt = page.getByRole('option', { name: hour, exact: true });
    if ((await hourOpt.count()) > 0) {
      await hourOpt.first().click();
    } else {
      await dlg.getByText(hour, { exact: true }).first().click().catch(() => {});
    }
    await sleep(200);

    // minute option (right) — last matching text in picker
    const minOpt = page.getByRole('option', { name: minute, exact: true });
    if ((await minOpt.count()) > 0) {
      await minOpt.last().click();
    } else {
      await dlg.getByText(minute, { exact: true }).last().click().catch(() => {});
    }
    await sleep(300);
    await page.getByRole('button', { name: /^(确定|確定)$/ }).click().catch(() => {});
    await sleep(200);
  }

  await pickTimeField(0, '08', '00');
  await pickTimeField(1, '21', '30');

  // interval 分钟 → 30
  await page
    .locator('button')
    .filter({ hasText: /^(分钟|分鐘)$/ })
    .first()
    .click()
    .catch(() => page.getByText(/分钟|分鐘/).first().click());
  await sleep(400);
  const thirty = page.getByRole('option', { name: '30', exact: true });
  if ((await thirty.count()) > 0) await thirty.last().click();
  else await page.getByText('30', { exact: true }).last().click().catch(() => {});
  await sleep(400);

  // generate
  const gen = page.getByRole('button', { name: /^(生成|一代|생성)$/ });
  if ((await gen.count()) > 0) {
    if (await gen.first().isDisabled()) {
      console.log('  gen disabled — retry interval');
      await page.getByText('30', { exact: true }).last().click().catch(() => {});
      await sleep(300);
    }
    await gen.first().click();
  } else {
    await page.locator('button').filter({ hasText: /生成|一代|생성/ }).first().click();
  }
  await sleep(2000);

  // modal 保存 (element)
  const save = page.locator('[role=dialog]').getByRole('button', { name: /^(保存|節省|节省)$/ });
  if ((await save.count()) > 0) await save.last().click();
  else await page.getByRole('button', { name: /^(保存|節省|节省)$/ }).last().click();
  await sleep(1500);

  const v = await readTimes();
  console.log('  times', v);
  return v.count === 28 && v.first === '08:00' && v.last === '21:30';
}

async function createOne(opt, index) {
  console.log('\n=== create', index, opt.key, opt.price);
  await listClean();
  // if already exists skip create
  const body = await page.locator('body').innerText();
  if (body.includes(opt.pt) || body.includes(opt.name.slice(0, 20))) {
    const mods = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
    console.log('  maybe exists, mods=', mods);
  }

  await page.getByRole('button', { name: /注册\/添加选项|註冊\/添加選項|注册\/添加/ }).first().click();
  await sleep(2500);

  await page.locator('#name, input[name=name]').first().fill(opt.name);
  await page.locator('#description, textarea[name=description]').first().fill(opt.desc);
  await page.locator('input[name=minPurchaseQuantity], #minPurchaseQuantity').fill('1').catch(() => {});
  await page.locator('input[name=maxPurchaseQuantity], #maxPurchaseQuantity').fill('10').catch(() => {});

  // price type modal
  await page.getByRole('button', { name: /选择价格类型|選擇價格類型|가격 타입/ }).first().click();
  await sleep(1200);
  await page.getByText(/其他价格类型|其他價格類型|기타 가격 타입/).first().click();
  await sleep(800);

  const namePh = page.locator(
    'input[placeholder*="销售渠道"], input[placeholder*="銷售渠道"], input[placeholder*="輸入的名稱"], input[placeholder*="名称"]',
  );
  if ((await namePh.count()) > 0) await namePh.last().fill(opt.pt);
  else {
    // fallback: last text inputs in dialog
    const inputs = page.locator('[role=dialog] input[type=text], [role=dialog] input:not([type])');
    if ((await inputs.count()) > 0) await inputs.first().fill(opt.pt);
  }
  const descPh = page.locator(
    'input[placeholder*="滿"], input[placeholder*="例)"], input[placeholder*="说明"], input[placeholder*="說明"]',
  );
  if ((await descPh.count()) > 0) await descPh.last().fill(opt.ptd);

  // required + representative — element aria
  for (const sel of [
    '[aria-labelledby="ETC-required-label"]',
    '[aria-labelledby*="required"]',
    '[aria-labelledby="ETC-representative-label"]',
    '[aria-labelledby*="representative"]',
  ]) {
    const el = page.locator(sel).first();
    if ((await el.count()) === 0) continue;
    const a = await el.getAttribute('aria-checked');
    if (a !== 'true') await el.click();
  }
  // also try checkboxes by text
  for (const re of [/必需品购买|필수/, /代表价|대표/]) {
    const row = page.locator('[role=dialog] label, [role=dialog] [role=checkbox]').filter({ hasText: re });
    if ((await row.count()) > 0) {
      const a = await row.first().getAttribute('aria-checked').catch(() => null);
      if (a !== 'true') await row.first().click().catch(() => {});
    }
  }

  await page.getByRole('button', { name: /^(完成|완료)$/ }).last().click();
  await sleep(1000);
  // re-fill name (NOL overwrites)
  await page.locator('#name, input[name=name]').first().fill(opt.name);

  // sale period 1 year
  const oneYear = page.locator('input[value=ONE_YEAR]');
  if ((await oneYear.count()) > 0) {
    await oneYear.first().evaluate((el) => el.click());
  } else {
    await page.getByText(/1年|1 年|一年/).first().click().catch(() => {});
  }
  await sleep(400);

  const priceIn = page.locator(
    'input[placeholder*="请输入价格"], input[placeholder*="請輸入價格"], input[name*=price]',
  );
  if ((await priceIn.count()) > 0) {
    await priceIn.last().fill(opt.price);
  }

  let timesOk = await setChinaTimes();
  if (!timesOk) {
    console.log('  times retry once');
    timesOk = await setChinaTimes();
  }
  if (!timesOk) {
    console.log('  FAIL times gate — still save card, will fix later');
  }

  await tempThenNext(opt.key);
  return timesOk;
}

// —— main ——
await listClean();
let mods = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
console.log('start mods', mods);

const timesResults = [];
for (let i = mods; i < 4; i++) {
  const ok = await createOne(OPTIONS[i], i);
  timesResults.push({ i, key: OPTIONS[i].key, timesOk: ok });
  mods = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
  console.log('mods now', mods);
}

// secondary verify times by reopening
const reVerify = [];
mods = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
for (let i = 0; i < Math.min(4, mods); i++) {
  await listClean();
  await page.getByRole('button', { name: /修改选项|修改選項/ }).nth(i).click();
  await sleep(2500);
  for (let w = 0; w < 25; w++) {
    const v = await page.locator('#name').inputValue().catch(() => '');
    if (v && v.length > 5) break;
    await sleep(200);
  }
  let v = await readTimes();
  if (!(v.count === 28 && v.first === '08:00' && v.last === '21:30')) {
    console.log('reopen fail', i, v, '— fixing');
    await setChinaTimes();
    v = await readTimes();
    await tempThenNext(`refix${i}`);
  } else {
    console.log('reopen OK', i, v);
    // leave without dirty
    await page.keyboard.press('Escape').catch(() => {});
    await page.getByRole('button', { name: /^消除$/ }).click().catch(() => {});
    // or 下一个 without changes
    const next = page.locator('button').filter({ hasText: /^(下一个|下個)$/ });
    if ((await next.count()) > 0) await next.last().click().catch(() => {});
    await sleep(1500);
  }
  reVerify.push({ i, ...v });
}

await listClean();
const finalMods = await page.getByRole('button', { name: /修改选项|修改選項/ }).count();
console.log('DONE create', { finalMods, timesResults, reVerify });
console.log('NEVER 提交审核');
// exit 0 only if 4 cards; times failure → 2
const allTimes =
  reVerify.length === 4 &&
  reVerify.every((r) => r.count === 28 && r.first === '08:00' && r.last === '21:30');
process.exit(finalMods >= 4 && allTimes ? 0 : finalMods >= 4 ? 2 : 1);
