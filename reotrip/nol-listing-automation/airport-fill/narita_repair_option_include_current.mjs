import { chromium } from 'playwright';

const include = '도쿄 시내 호텔 ↔ 나리타공항(NRT) 편도 전용 차량 이동 및 주차비 포함';
const exclude = '항공권 / 아동용 카시트 / 야간 할증 / 개인 경비 / 팁 / 기타 추가 서비스';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();

const visibleTextareas = page.locator('textarea').filter({ visible: true });
const textCount = await visibleTextareas.count();
if (textCount >= 2) {
  await visibleTextareas.nth(textCount - 2).fill(include);
  await visibleTextareas.nth(textCount - 1).fill(exclude);
} else if (textCount === 1) {
  await visibleTextareas.nth(0).fill(exclude);
}

const save = page.getByText('節省', { exact: true });
if (await save.count()) await save.nth((await save.count()) - 1).click();
await page.waitForTimeout(1200);
if (await page.getByText('確定', { exact: true }).count()) {
  const ok = page.getByText('確定', { exact: true });
  await ok.nth((await ok.count()) - 1).click();
  await page.waitForTimeout(900);
}

const next = page.getByText('下個', { exact: true });
if (await next.count()) await next.nth((await next.count()) - 1).click();
await page.waitForTimeout(1800);
console.log((await page.locator('body').innerText()).slice(0, 7000));
await browser.close();
