import { chromium } from 'playwright';
const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('feishu.cn'));
await page.bringToFront();
for (const name of ['门票产品', '接送产品', '包车产品', '日游产品']) {
  await page.locator('.sheet-tabs').getByText(name, { exact: true }).first().click();
  await sleep(700);
  await page.screenshot({ path: `artifacts/screenshots/feishu-now-${name}.png` });
}
console.log('shot');
process.exit(0);
