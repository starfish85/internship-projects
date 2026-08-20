import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
await page.getByText('添加地點', { exact: true }).click();
await page.waitForTimeout(2000);
const text = await page.locator('body').innerText();
console.log(text.slice(0, 12000));
await browser.close();
