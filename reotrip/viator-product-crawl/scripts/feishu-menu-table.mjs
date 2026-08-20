import { chromium } from 'playwright';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('feishu.cn'));
await page.bringToFront();
await page.keyboard.press('Escape');
await sleep(300);
await page.getByText('菜单', { exact: true }).first().click();
await sleep(400);
await page.getByText('表格', { exact: true }).first().hover();
await sleep(300);
await page.getByText('表格', { exact: true }).first().click();
await sleep(700);
await page.screenshot({ path: 'artifacts/screenshots/feishu-menu-table.png' });
const items = await page.evaluate(() =>
  [...document.querySelectorAll('[role="menuitem"], [class*="menu"]')]
    .map((el) => (el.innerText || '').trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 30)
);
console.log(items);
process.exit(0);
