/**
 * 京都市区酒店-大阪港 — 创建或恢复草稿
 * Excel (9) 日本接送 R70–73 · 7/10 去返 成本933.33/1160.78 → 售价1333/1658 · 无假日
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';

const PRODUCT_KO = '교토 시내 호텔 ↔ 오사카항 단독 차량 편도 이동 서비스';
const INTERNAL = '京都市区酒店-大阪港';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('【将要】杀残留 CDP + 打开列表 创建/恢复 京都市区酒店-大阪港 草稿');
killPeerCdpScripts('kp-bootstrap');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const pages = browser.contexts().flatMap((c) => c.pages());
let page =
  pages.find((p) => p.url().includes('tour.triple.partners')) ||
  pages.find((p) => /triple\.partners/i.test(p.url())) ||
  pages[0];
if (!page) failExit('no page — open partner Chrome :9222');
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);
await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});

const iw = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
console.log('【读回】视口', iw);
if (iw.w < 1280) failExit('innerWidth < 1280');

await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
});
await sleep(3000);
console.log('【读回】url', page.url());

const body = await page.locator('body').innerText();
if (body.includes(INTERNAL) || body.includes(PRODUCT_KO) || /교토 시내 호텔.*오사카항|京都市区酒店-大阪港/i.test(body)) {
  console.log('【将要】恢复草稿 京都市区酒店-大阪港');
  const card = page
    .locator('div[class*="slot___StyledContainer4"]')
    .filter({ hasText: /京都市区酒店-大阪港|교토 시내 호텔 ↔ 오사카항/ })
    .first();
  if (await card.count()) {
    await card.click({ force: true });
    await sleep(3500);
    console.log('【读回】resume', page.url());
    const m = page.url().match(/id=([0-9a-f-]{36})/i);
    console.log('【结果】PASS resume DRAFT', m?.[1] || '?');
    if (m?.[1]) writeFileSync(new URL('./.kp-draft-id', import.meta.url), m[1]);
    process.exit(0);
  }
}

console.log('【将要】新产品注册 弹窗填韩文名（禁搜索框）');
await page.evaluate(() => {
  const search = Array.from(document.querySelectorAll('input')).find((i) =>
    /搜索|搜尋|검색|search/i.test(i.placeholder || ''),
  );
  if (search?.value) {
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await page.evaluate(() => {
  Array.from(document.querySelectorAll('button,a,div'))
    .find((b) => {
      const t = (b.innerText || '').trim();
      const r = b.getBoundingClientRect();
      return (t === '新产品注册' || t === '新產品註冊') && r.height > 20 && r.height < 80;
    })
    ?.click();
});
await sleep(1800);

const filled = await page.evaluate((name) => {
  const d = document.querySelector('[role=dialog]');
  const inp = d
    ? Array.from(d.querySelectorAll('input')).find((i) => i.type === 'text' || i.type === '')
    : null;
  if (!inp) return { ok: false, err: 'no modal name' };
  if (/搜索|搜尋|검색/i.test(inp.placeholder || '')) return { ok: false, err: 'search box refuse' };
  const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  s.call(inp, name);
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  return { ok: true, val: inp.value.slice(0, 50), ph: inp.placeholder };
}, PRODUCT_KO);
console.log('【读回】modal name', filled);
if (!filled.ok) failExit(filled.err || 'name fill fail');

await sleep(400);
await page.evaluate(() => {
  const radio = document.querySelector('input[type=radio][value=TRANSPORTATION]');
  if (radio) (radio.closest('label') || radio).click();
});
console.log('【读回】TRANSPORTATION', await page.evaluate(
  () => !!document.querySelector('input[type=radio][value=TRANSPORTATION]')?.checked,
));

await sleep(400);
console.log('【将要】点 开始創建产品');
const create = page.getByRole('button', { name: /开始創建产品|开始创建产品|開始創建產品/ });
if (await create.count()) await create.last().click({ force: true });
else {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /开始|開始/.test(b.innerText || '') && /创建|創建/.test(b.innerText || ''))
      ?.click();
  });
}
await page.waitForURL(/registration\/properties/, { timeout: 90000 }).catch(() => {});
await sleep(3000);
console.log('【读回】created', page.url());
const m = page.url().match(/id=([0-9a-f-]{36})/i);
if (!m) failExit('no draft id');
console.log('【结果】PASS create DRAFT', m[1]);
writeFileSync(new URL('./.kp-draft-id', import.meta.url), m[1]);
process.exit(0);
