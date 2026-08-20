/**
 * Pop Mart attrs — element locators only (no coordinate mouse.click).
 * draft: 3851a9dd-61bb-4b8c-ad7a-e6616eb3f611
 */
import { chromium } from 'playwright';

const DRAFT = '3851a9dd-61bb-4b8c-ad7a-e6616eb3f611';
const PRODUCT = '베이징 시내 호텔 ↔ 베이징 팝마트 단독 차량 편도 이동 서비스';
const INTERNAL = '北京市区酒店-北京泡泡马特';
const URL = `https://tour.triple.partners/product-management/registration/properties?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
if (!page) throw new Error('no NOL tab');
await page.bringToFront();

// close leftover sheets
await page.keyboard.press('Escape').catch(() => {});
await sleep(300);
const closeBtn = page.getByRole('button', { name: /^(关闭|關閉|消除|取消)$/ });
if ((await closeBtn.count()) > 0) await closeBtn.last().click().catch(() => {});
await sleep(300);

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await sleep(3000);

async function yixuan() {
  const b = page.getByRole('button', { name: /^(已选|已選)$/ });
  if ((await b.count()) > 0) {
    await b.last().click();
    await sleep(1000);
    return true;
  }
  return false;
}

// —— titles ——
await page.locator('#title').fill(PRODUCT);
await page.locator('#managementTitle').fill(INTERNAL);
console.log('titles ok');

// —— date / use type (radio by value) ——
for (const [name, val] of [
  ['productDateRule', 'FIXED_DATE_RULE'],
  ['useType', 'USE_DATE'],
  ['nationalityType', 'ANOTHER_NATIONALITY'],
]) {
  const radio = page.locator(`input[name="${name}"][value="${val}"]`);
  if ((await radio.count()) > 0) {
    await radio.first().scrollIntoViewIfNeeded();
    // click associated label if any
    const id = await radio.first().getAttribute('id');
    if (id) {
      const lab = page.locator(`label[for="${id}"]`);
      if ((await lab.count()) > 0) await lab.first().click({ force: true });
      else await radio.first().click({ force: true });
    } else {
      await radio.first().click({ force: true });
    }
  }
}
console.log('radios date/use/nation');

// —— passenger limit YES ——
const passYes = page.locator('input[name=isPassengerLimit][value="1"]');
if ((await passYes.count()) > 0) {
  await passYes.first().scrollIntoViewIfNeeded();
  await passYes.first().click({ force: true });
  await sleep(500);
}
// min/max
const minIn = page.locator('#requiredNumberOfPeople, input[name=requiredNumberOfPeople]');
const maxIn = page.locator('#availableNumberOfPeople, input[name=availableNumberOfPeople]');
if ((await minIn.count()) > 0) await minIn.first().fill('1');
if ((await maxIn.count()) > 0) await maxIn.first().fill('6');
console.log('passenger', await passYes.first().isChecked().catch(() => null), {
  min: await minIn.first().inputValue().catch(() => '?'),
  max: await maxIn.first().inputValue().catch(() => '?'),
});

// —— 私人的 if present (some TRANSPORT forms omit it) ——
const privateLab = page.locator('label').filter({ hasText: /^私人/ });
if ((await privateLab.count()) > 0) {
  await privateLab.first().scrollIntoViewIfNeeded();
  const inp = page.locator('input[name=tourTypes][value="0"]');
  const checked = (await inp.count()) > 0 ? await inp.first().isChecked() : false;
  if (!checked) await privateLab.first().click({ force: true });
  console.log('private', await inp.first().isChecked().catch(() => 'n/a'));
} else {
  console.log('private section not present');
}

// —— theme ——
await page.getByRole('button', { name: /选择类别（主题）|選擇類別（主題）/ }).first().click();
await sleep(1500);
const themeDlg = page.locator('[role=dialog]');
await themeDlg.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
// prefer exact option text inside dialog
const themeOpt = themeDlg.getByText('司机提供车辆', { exact: true });
if ((await themeOpt.count()) > 0) {
  await themeOpt.first().click();
} else {
  const ko = themeDlg.getByText('기사제공차량', { exact: true });
  if ((await ko.count()) > 0) await ko.first().click();
  else await page.getByText('司机提供车辆', { exact: true }).first().click();
}
await sleep(400);
await yixuan();
console.log(
  'theme ok?',
  await page.evaluate(() => /司机提供车辆|기사제공차량/.test(document.body.innerText) && !/请选择类别（主题）/.test(document.body.innerText)),
);

// —— language ——
await page.getByRole('button', { name: /选择语言|選擇語言/ }).first().click();
await sleep(1500);
const langDlg = page.locator('[role=dialog]');
await langDlg.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
const langOpt = langDlg.getByText('韩语', { exact: true });
if ((await langOpt.count()) > 0) await langOpt.first().click();
else if ((await langDlg.getByText('韓語', { exact: true }).count()) > 0)
  await langDlg.getByText('韓語', { exact: true }).first().click();
else await page.getByText('韩语', { exact: true }).first().click();
await sleep(400);
await yixuan();
console.log(
  'lang ok?',
  await page.evaluate(() => !/请至少为产品选择一种语言|請至少/.test(document.body.innerText)),
);

// —— POI ——
const hasCard = await page.evaluate(() => /删除|刪除/.test(document.body.innerText));
if (!hasCard) {
  await page.getByRole('button', { name: /添加地区和地点|添加地區和地點/ }).first().click();
  await sleep(2000);

  const dlg = page.locator('[role=dialog]');
  const search = dlg.locator('input').first();
  await search.waitFor({ state: 'visible', timeout: 10000 });

  // try several queries; pick first 旅游地 + 北京 result via text filter
  const queries = ['Beijing', '天坛', '베이징', '朝阳公园', '故宫'];
  let selected = false;
  for (const q of queries) {
    await search.fill(q);
    await search.press('Enter');
    await sleep(2200);

    // result rows: prefer getByText containing 旅游地 and 北京
    const candidates = dlg.locator('div').filter({ hasText: /旅游地|旅遊地/ }).filter({ hasText: /北京|Beijing|중화|中国/ });
    const n = await candidates.count();
    console.log('query', q, 'candidates', n);
    if (n === 0) continue;

    // click the first reasonably sized visible match
    for (let i = 0; i < Math.min(n, 8); i++) {
      const el = candidates.nth(i);
      const box = await el.boundingBox().catch(() => null);
      if (!box || box.height < 40 || box.height > 160 || box.width < 200) continue;
      await el.click({ force: true });
      selected = true;
      console.log('clicked result', i, (await el.innerText()).slice(0, 80).replace(/\s+/g, ' '));
      break;
    }
    if (selected) break;
  }

  if (selected) {
    await sleep(800);
    // 添加地点
    const addPlace = page.getByRole('button', { name: /添加地点|添加地點/ });
    if ((await addPlace.count()) > 0) {
      await addPlace.last().click();
      await sleep(1200);
    }
    // type 旅游地
    const typeLab = page.locator('label').filter({ hasText: /^(旅游地|旅遊地)$/ });
    if ((await typeLab.count()) > 0) {
      await typeLab.first().click({ force: true });
    } else {
      const radio = page.locator('input[value="TRAVEL_PLACE"]');
      if ((await radio.count()) > 0) await radio.first().click({ force: true });
      else {
        const t = page.getByText('旅游地', { exact: true });
        if ((await t.count()) > 0) await t.first().click();
      }
    }
    await sleep(400);
    // final 添加 (enabled)
    const addFinal = page.getByRole('button', { name: /^添加$/ });
    const cnt = await addFinal.count();
    for (let i = cnt - 1; i >= 0; i--) {
      if (!(await addFinal.nth(i).isDisabled())) {
        await addFinal.nth(i).click();
        console.log('final 添加 clicked index', i);
        break;
      }
    }
    await sleep(2000);
  } else {
    console.log('no POI result; Escape');
    await page.keyboard.press('Escape');
  }
}

// re-check people after UI settle
await page.locator('#requiredNumberOfPeople').fill('1').catch(() => {});
await page.locator('#availableNumberOfPeople').fill('6').catch(() => {});

const st = await page.evaluate(() => {
  const save = Array.from(document.querySelectorAll('button')).find((b) =>
    /保存然后|保存然後/.test(b.innerText || ''),
  );
  const t = document.body.innerText;
  return {
    saveDisabled: !!save?.disabled,
    themeErr: /请选择类别（主题）/.test(t),
    langErr: /请至少为产品选择一种语言|請至少/.test(t),
    placeErr: /请选择产品的地区|請選擇產品的地區/.test(t),
    placeCard: /删除|刪除/.test(t),
    theme: /司机提供车辆|기사제공차량/.test(t),
    pass: document.querySelector('input[name=isPassengerLimit][value="1"]')?.checked,
    min: document.querySelector('#requiredNumberOfPeople')?.value,
    max: document.querySelector('#availableNumberOfPeople')?.value,
  };
});
console.log('STATE', st);

if (!st.saveDisabled) {
  await page.getByRole('button', { name: /保存然后|保存然後/ }).filter({ hasNotText: /临时/ }).first().click();
  // if multiple, pick enabled
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(
      (x) => /保存然后|保存然後/.test(x.innerText || '') && !x.disabled,
    );
    b?.click();
  });
  await sleep(4500);
  console.log('SAVED url=', page.url());
  process.exit(0);
}

console.log('still blocked');
process.exit(2);
