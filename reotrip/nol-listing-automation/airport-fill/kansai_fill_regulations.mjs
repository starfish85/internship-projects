import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())
  .find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration/regulations'));
if (!page) throw new Error('NOL regulations page not found');

await page.bringToFront();
await page.setViewportSize({ width: 1280, height: 900 });

// Core limits and confirmation
await page.locator('input[name="minimumPurchaseDay"]').fill('3');
await page.locator('input[name="minimumPurchaseQuantityPerSession"]').fill('1');
await page.locator('input[name="maximumPurchaseQuantityPerSession"]').fill('10');
await page.locator('input[name="range-select.inventory-managed"][value="RIGHT"]').check({ force: true });
await page.locator('input[name="bookingConfirmType"][value="MANUAL"]').check({ force: true });
await page.locator('input[name="confirmationLeadTimeValue"]').fill('3');
await page.locator('select[name="confirmationLeadTimeType"]').selectOption({ value: 'DAYS' });

// Cancellation
await page.locator('input[name="isCancelType"][value="1"]').check({ force: true });
await page.locator('input[name="isPartnerConfirm"][value="true"]').check({ force: true });
await page.locator('input[name="windows.0.deadline"]').fill('2');
await page.locator('input[name="windows.0.penalty"]').fill('0');
await page.locator('select[name="windows.0.penaltyType"]').selectOption({ value: 'RATE' });
const fixedText = page.locator('input[name="windows.0.penaltyType"]').locator('xpath=following-sibling::input[1]');
if ((await fixedText.count()) > 0) {
  await fixedText.fill('100').catch(() => {});
}

console.log(JSON.stringify({
  values: await page.evaluate(() => ({
    minimumPurchaseDay: (document.querySelector('input[name="minimumPurchaseDay"]') || {}).value,
    minQty: (document.querySelector('input[name="minimumPurchaseQuantityPerSession"]') || {}).value,
    maxQty: (document.querySelector('input[name="maximumPurchaseQuantityPerSession"]') || {}).value,
    confirmationLeadTimeValue: (document.querySelector('input[name="confirmationLeadTimeValue"]') || {}).value,
    confirmationLeadTimeType: (document.querySelector('select[name="confirmationLeadTimeType"]') || {}).value,
    isCancelType: Array.from(document.querySelectorAll('input[name="isCancelType"]')).map((el) => ({ value: el.value, checked: el.checked })),
    isPartnerConfirm: Array.from(document.querySelectorAll('input[name="isPartnerConfirm"]')).map((el) => ({ value: el.value, checked: el.checked })),
    deadline: (document.querySelector('input[name="windows.0.deadline"]') || {}).value,
    penalty: (document.querySelector('input[name="windows.0.penalty"]') || {}).value,
    penaltyType: (document.querySelector('select[name="windows.0.penaltyType"]') || {}).value,
  })),
}, null, 2));

await browser.close();
