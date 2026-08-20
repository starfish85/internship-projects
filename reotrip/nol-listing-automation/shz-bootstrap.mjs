/**
 * 上海火车站 — 创建或恢复草稿
 */
import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';

const PRODUCT_KO = '상하이 시내 호텔 ↔ 상하이역 단독 차량 편도 이동 서비스';
const INTERNAL = '上海市区酒店-上海火车站';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

killPeerCdpScripts('shz-bootstrap');
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

await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
});
await sleep(3000);
console.log('url', page.url());

// resume?
const body = await page.locator('body').innerText();
if (body.includes(INTERNAL) || body.includes(PRODUCT_KO) || /상하이역 단독/.test(body)) {
  console.log('【将要】恢复草稿 上海火车站');
  const card = page
    .locator('div[class*="slot___StyledContainer4"]')
    .filter({ hasText: /상하이역 단독|上海市区酒店-上海火车站/ })
    .filter({ hasNotText: /훙차오|虹桥|Hongqiao/ })
    .first();
  if (await card.count()) {
    await card.click({ force: true });
    await sleep(3500);
    console.log('【读回】resume', page.url());
    const m = page.url().match(/id=([0-9a-f-]{36})/i);
    console.log('DRAFT', m?.[1] || '?');
    process.exit(0);
  }
}

console.log('【将要】新产品注册');
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
await page.evaluate((name) => {
  const d = document.querySelector('[role=dialog]');
  const inp = d
    ? Array.from(d.querySelectorAll('input')).find((i) => i.type === 'text' || i.type === '')
    : null;
  if (!inp) throw new Error('no modal name');
  if (/搜索|搜尋|검색/i.test(inp.placeholder || '')) throw new Error('search box refuse');
  const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  s.call(inp, name);
  inp.dispatchEvent(new Event('input', { bubbles: true }));
}, PRODUCT_KO);
await sleep(400);
await page.evaluate(() => {
  const radio = document.querySelector('input[type=radio][value=TRANSPORTATION]');
  if (radio) (radio.closest('label') || radio).click();
});
await sleep(400);
const create = page.getByRole('button', { name: /开始創建产品|开始创建产品|開始創建產品/ });
if (await create.count()) await create.last().click({ force: true });
else {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /开始|開始/.test(b.innerText || '') && /创建|創建/.test(b.innerText || ''))
      ?.click();
  });
}
await sleep(4000);
console.log('【读回】created', page.url());
const m = page.url().match(/id=([0-9a-f-]{36})/i);
if (!m) failExit('no draft id');
console.log('DRAFT', m[1]);
process.exit(0);
