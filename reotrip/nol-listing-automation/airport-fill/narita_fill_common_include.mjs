import { chromium } from 'playwright';

const includeText = '도쿄 시내 호텔 ↔ 나리타공항(NRT) 편도 전용 차량 이동 및 주차비 포함';
const excludeText = '항공권 / 아동용 카시트 / 야간 할증 / 개인 경비 / 팁 / 기타 추가 서비스';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
if ((await page.getByText('節省', { exact: true }).count()) === 0) {
  await page.getByText('编辑', { exact: true }).first().click();
  await page.waitForTimeout(700);
}
const transport = page.locator('input[type="checkbox"][value="TRANSPORTATION"]');
if (await transport.count()) await transport.check({ force: true }).catch(async () => {
  await page.getByText('運輸', { exact: true }).click({ force: true });
});
await page.waitForTimeout(1000);
const textareas = page.locator('textarea:visible');
const count = await textareas.count();
if (count === 1) {
  await textareas.nth(0).fill(excludeText);
} else if (count >= 2) {
  await textareas.nth(count - 2).fill(includeText);
  await textareas.nth(count - 1).fill(excludeText);
}
await page.waitForTimeout(500);
const data = await page.evaluate(() => ({
  checked: Array.from(document.querySelectorAll('input[type="checkbox"]')).filter((el) => el.checked).map((el) => el.value),
  textareas: Array.from(document.querySelectorAll('textarea')).map((el) => ({ value: el.value, placeholder: el.placeholder, rect: (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })() })),
  buttons: Array.from(document.querySelectorAll('button')).map((b, i) => ({ i, text: b.innerText, disabled: b.disabled })).filter((b) => b.text.includes('節省') || b.text.includes('關閉')),
}));
console.log(JSON.stringify(data, null, 2));
await page.getByText('節省', { exact: true }).click();
await page.waitForTimeout(1500);
console.log((await page.locator('body').innerText()).slice(0, 12000));
await browser.close();
