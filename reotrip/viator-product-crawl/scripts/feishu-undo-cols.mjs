import { chromium } from 'playwright';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('feishu.cn'));
await page.bringToFront();

const clickTab = async (name) => {
  await page.locator('.sheet-tabs').getByText(name, { exact: true }).first().click();
  await sleep(500);
};

for (const name of ['接送产品', '包车产品', '日游产品']) {
  await clickTab(name);
  await page.keyboard.press('Escape');
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Meta+Z');
    await sleep(180);
  }
  await page.screenshot({ path: `artifacts/screenshots/feishu-undone-${name}.png` });
}
console.log('undone');
process.exit(0);
