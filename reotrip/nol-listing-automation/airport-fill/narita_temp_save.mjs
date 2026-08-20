import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
const temp = page.getByText('臨時存儲', { exact: true });
const count = await temp.count();
await temp.nth(count - 1).click();
await page.waitForTimeout(2500);
console.log((await page.locator('body').innerText()).slice(-2000));
await browser.close();
