import { chromium } from 'playwright';

const productName = '오사카 시내 호텔 ↔ 간사이공항(KIX) 단독 차량 편도 이동 서비스';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
if (!page) throw new Error('NOL registration page not found');

await page.bringToFront();
await page.setViewportSize({ width: 1280, height: 900 });
if (!page.url().includes('/registration?')) {
  await page.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw');
  await page.waitForLoadState('domcontentloaded');
}

await page.getByText('新產品註冊', { exact: true }).click();
await page.waitForTimeout(800);

const inputs = page.locator('input:visible');
const inputCount = await inputs.count();
await inputs.nth(inputCount > 1 ? 1 : 0).fill(productName);

await page.getByText('TRANSPORTATION', { exact: true }).click();
await page.getByText('開始創建產品', { exact: true }).click();
await page.waitForURL(/registration\/properties/, { timeout: 30000 });
await page.waitForTimeout(1500);

console.log(JSON.stringify({
  url: page.url(),
  text: (await page.locator('body').innerText()).slice(0, 6000),
}, null, 2));

await browser.close();
