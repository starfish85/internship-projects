import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration'));
await page.bringToFront();
const buttons = page.getByText('保存然後', { exact: true });
const count = await buttons.count();
const target = buttons.nth(count - 1);
console.log('enabled', await target.isEnabled());
await target.click({ timeout: 10000 });
await page.waitForTimeout(3000);
console.log(JSON.stringify({ url: page.url(), text: (await page.locator('body').innerText()).slice(0, 4000) }, null, 2));
await browser.close();
