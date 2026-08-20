import { chromium } from 'playwright';

const includeText = '도쿄 시내 호텔 ↔ 나리타공항(NRT) 편도 전용 차량 이동 및 주차비 포함';
const excludeText = '항공권 / 아동용 카시트 / 야간 할증 / 개인 경비 / 팁 / 기타 추가 서비스';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
const editButtons = page.getByText('编辑', { exact: true });
await editButtons.nth(0).click();
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const input = document.querySelector('input[type="checkbox"][value="TRANSPORTATION"]');
  input.parentElement.click();
});
await page.waitForTimeout(800);
const count = await page.locator('textarea:visible').count();
if (count >= 2) {
  await page.locator('textarea:visible').nth(count - 2).fill(includeText);
  await page.locator('textarea:visible').nth(count - 1).fill(excludeText);
} else if (count === 1) {
  await page.locator('textarea:visible').nth(0).fill(excludeText);
}
console.log(JSON.stringify(await page.evaluate(() => ({
  checked: Array.from(document.querySelectorAll('input[type="checkbox"]')).filter((el) => el.checked).map((el) => el.value),
  textareaValues: Array.from(document.querySelectorAll('textarea')).map((el) => el.value).filter(Boolean),
})), null, 2));
await page.getByText('節省', { exact: true }).click();
await page.waitForTimeout(1500);
console.log((await page.locator('body').innerText()).slice(0, 6500));
await browser.close();
