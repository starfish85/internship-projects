/**
 * 虹桥机场 SHA 创建单个选项（无时段，时段另批）
 * usage: node hq-create-one.mjs go|rtn
 */
import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';

const DRAFT = '761d6911-b55e-47c0-af96-08f04636f8a2';
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const CITY = '상하이 시내 호텔';
const DEST = '상하이 훙차오국제공항(SHA)';
const isRtn = process.argv[2] === 'rtn';
const OPT = isRtn
  ? {
      key: '7rtn',
      name: `${DEST} 출발 → ${CITY} 편도 이동 (7인승 차량)`,
      desc: `${DEST} 출발 → ${CITY} 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 4개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.`,
      pt: '7인승 오는',
      ptd: '7인승 차량',
      price: '407',
    }
  : {
      key: '7go',
      name: `${CITY} 출발 → ${DEST} 편도 이동 (7인승 차량)`,
      desc: `${CITY} 출발 → ${DEST} 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 4개까지 적재 가능\n별도 항공권, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.`,
      pt: '7인승 가는',
      ptd: '7인승 차량',
      price: '320',
    };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
killPeerCdpScripts('sha-create-one');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
if (!page) failExit('no page');
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);

async function dismiss() {
  await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '消除')
      ?.click(),
  );
  await sleep(300);
}

async function listClean() {
  await page.keyboard.press('Escape').catch(() => {});
  await dismiss();
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  await dismiss();
}

await listClean();
console.log('【读回】url', page.url());
const body0 = await page.locator('body').innerText();
if (body0.includes(OPT.name) || body0.includes(OPT.pt)) {
  console.log('【结果】已存在 skip', OPT.key);
  const mods = await page.locator('button').filter({ hasText: /修改选项|修改選項/ }).count();
  console.log('修改选项 count', mods);
  process.exit(0);
}

console.log('\n【将要】注册添加选项', OPT.key, OPT.price);
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button'))
    .find((b) => /注册.?添加选项|註冊.?添加選項|添加选项/.test(b.innerText || ''))
    ?.click();
});
await sleep(2500);
await page.locator('#name').waitFor({ state: 'visible', timeout: 15000 });
await page.locator('#name').fill(OPT.name);
await page.locator('#description').fill(OPT.desc);
await page.locator('input[name="rule.bookingRule.minimumPurchaseQuantityPerSession"]').fill('1');
await page.locator('input[name="rule.bookingRule.maximumPurchaseQuantityPerSession"]').fill('10');
console.log('【读回】name', (await page.locator('#name').inputValue()).slice(0, 40));

console.log('\n【将要】选择价格类型 其他', OPT.pt);
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button'))
    .find((b) => (b.innerText || '').includes('选择价格类型'))
    ?.click();
});
await sleep(1500);
const tabBtn = page.getByRole('button', { name: /其他价格类型/ }).first();
if (await tabBtn.count()) await tabBtn.click({ timeout: 10000 });
else await page.locator('button,li').filter({ hasText: /其他价格类型/ }).first().click({ timeout: 10000 });
await sleep(1200);
await page
  .locator('input[placeholder*="输入的名称"], input[placeholder*="輸入的名稱"], input[placeholder*="销售渠道"]')
  .first()
  .fill(OPT.pt);
await page
  .locator('input[placeholder*="滿 19"], input[placeholder*="满 19"], input[placeholder*="例)"]')
  .first()
  .fill(OPT.ptd);
await page.evaluate(() => {
  for (const id of ['ETC-required-label', 'ETC-representative-label']) {
    const box = document.querySelector(`[aria-labelledby="${id}"]`);
    if (box && box.getAttribute('aria-checked') !== 'true') box.click();
  }
});
await sleep(300);
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button'))
    .find((b) => (b.innerText || '').trim() === '完成' && !b.disabled)
    ?.click();
});
await sleep(1500);
// re-fill name (NOL overwrite)
await page.locator('#name').fill(OPT.name);

console.log('\n【将要】销售期 1年 + 价格', OPT.price);
await page.locator('input[value=ONE_YEAR]').click({ force: true }).catch(async () => {
  await page.getByText('1年', { exact: true }).click().catch(() => {});
});
await sleep(1200);
const priceOk = await page.evaluate((p) => {
  const el = Array.from(document.querySelectorAll('input')).find(
    (i) =>
      ((i.placeholder || '').includes('请输入价格') || (i.placeholder || '').includes('請輸入價格')) &&
      !i.disabled,
  );
  if (!el) return false;
  const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  s.call(el, p);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return el.value === p;
}, OPT.price);
if (!priceOk) {
  const pi = page.locator('input[placeholder*="价格"], input[placeholder*="價格"]').last();
  if ((await pi.count()) && !(await pi.isDisabled())) await pi.fill(OPT.price);
}
console.log('【读回】price fill', await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('input')).find((i) =>
    (i.placeholder || '').includes('价格') || (i.placeholder || '').includes('價格'),
  );
  return el?.value;
}));

// 临时保存 → 下一个（无时段先落卡）
console.log('\n【将要】临时保存');
await page.locator('#name').fill(OPT.name);
const temp = page.getByRole('button', { name: /^临时保存$|^臨時存儲$/ });
// prefer narrow footer
const temps = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button'))
    .map((b, i) => {
      const r = b.getBoundingClientRect();
      return { i, t: (b.innerText || '').trim(), w: Math.round(r.width), d: b.disabled, y: Math.round(r.y) };
    })
    .filter((b) => b.t === '临时保存' || b.t === '臨時存儲'),
);
console.log('【定位】临时保存 buttons', temps);
await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
    .map((b) => {
      const r = b.getBoundingClientRect();
      return { b, t: (b.innerText || '').trim(), w: r.width, d: b.disabled };
    })
    .filter((x) => (x.t === '临时保存' || x.t === '臨時存儲') && !x.d)
    .sort((a, b) => a.w - b.w);
  btns[0]?.b.click();
});
await sleep(2500);

console.log('【将要】下一个');
await page.evaluate(() => {
  const c = Array.from(document.querySelectorAll('button'))
    .map((b) => {
      const r = b.getBoundingClientRect();
      return { b, t: (b.innerText || '').trim(), d: b.disabled, w: r.width };
    })
    .filter((x) => (x.t === '下一个' || x.t === '下個') && !x.d && x.w > 150)
    .sort((a, b) => b.w - a.w);
  c[0]?.b.click();
});
await sleep(3500);
await dismiss();

// verify list
await listClean();
const mods = await page.locator('button').filter({ hasText: /修改选项|修改選項/ }).count();
const body = await page.locator('body').innerText();
const hasName = body.includes(OPT.name) || body.includes(OPT.pt);
console.log('【读回】修改选项', mods, 'hasOpt', hasName, OPT.key);
console.log('【结果】', hasName || mods > 0 ? 'PASS card' : 'FAIL');
process.exit(hasName || mods > 0 ? 0 : 2);
