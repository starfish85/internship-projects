/**
 * 札幌-二世谷公园 创建单个选项（无时段）
 * usage: node snk-create-one.mjs 7go|10go|7rtn|10rtn
 */
import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const DRAFT = process.env.SNK_DRAFT || readFileSync(join(__dir, '.snk-draft-id'), 'utf8').trim();
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const HOTEL = '삿포로 시내';
const DEST = '니세코';
const key = process.argv[2] || '7go';

const MAP = {
  '7go': {
    key: '7go',
    name: `${HOTEL} 출발 → ${DEST} 편도 이동 (7인승 차량)`,
    desc: `${HOTEL} 출발 → ${DEST} 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 5개 적재 가능\n별도 입장권·기타 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.`,
    pt: '7인승 가는',
    ptd: '7인승 차량',
    price: '3476',
  },
  '10go': {
    key: '10go',
    name: `${HOTEL} 출발 → ${DEST} 편도 이동 (10인승 차량)`,
    desc: `${HOTEL} 출발 → ${DEST} 편도 이동 (10인승 차량, 최대 9인 탑승 가능)\n26인치 이하 수하물 기준: 최대 10개 적재 가능\n별도 입장권·기타 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.`,
    pt: '10인승 가는',
    ptd: '10인승 차량',
    price: '3950',
  },
  '7rtn': {
    key: '7rtn',
    name: `${DEST} 출발 → ${HOTEL} 편도 이동 (7인승 차량)`,
    desc: `${DEST} 출발 → ${HOTEL} 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 5개 적재 가능\n별도 입장권·기타 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.`,
    pt: '7인승 오는',
    ptd: '7인승 차량',
    price: '3476',
  },
  '10rtn': {
    key: '10rtn',
    name: `${DEST} 출발 → ${HOTEL} 편도 이동 (10인승 차량)`,
    desc: `${DEST} 출발 → ${HOTEL} 편도 이동 (10인승 차량, 최대 9인 탑승 가능)\n26인치 이하 수하물 기준: 최대 10개 적재 가능\n별도 입장권·기타 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.`,
    pt: '10인승 오는',
    ptd: '10인승 차량',
    price: '3950',
  },
};
const OPT = MAP[key];
if (!OPT) {
  console.error('usage: node snk-create-one.mjs 7go|10go|7rtn|10rtn');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
killPeerCdpScripts('snk-create-one');
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
console.log('【读回】name', (await page.locator('#name').inputValue()).slice(0, 50));

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
await page.locator('#name').fill(OPT.name);

console.log('\n【将要】销售期 1年 + 价格', OPT.price);
await page.locator('input[value=ONE_YEAR]').click({ force: true }).catch(async () => {
  await page.getByText('1年', { exact: true }).click().catch(() => {});
});
await sleep(1200);
await page.evaluate((p) => {
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
console.log('【读回】price', await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('input')).find((i) =>
    (i.placeholder || '').includes('价格') || (i.placeholder || '').includes('價格'),
  );
  return el?.value;
}));

console.log('\n【将要】临时保存 → 下一个');
await page.locator('#name').fill(OPT.name);
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
await listClean();
const mods = await page.locator('button').filter({ hasText: /修改选项|修改選項/ }).count();
const body = await page.locator('body').innerText();
const hasName = body.includes(OPT.name) || body.includes(OPT.pt);
console.log('【读回】修改选项', mods, 'hasOpt', hasName, OPT.key);
console.log('【结果】', hasName || mods > 0 ? 'PASS card' : 'FAIL');
process.exit(hasName || mods > 0 ? 0 : 2);
