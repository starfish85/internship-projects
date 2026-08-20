import { chromium } from 'playwright';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('feishu.cn'));
await page.bringToFront();
await page.keyboard.press('Escape');
await sleep(400);

const menu = page.getByText('菜单', { exact: true }).first();
await menu.click();
await sleep(800);
await page.screenshot({ path: 'artifacts/screenshots/feishu-menu.png' });
const items = await page.evaluate(() =>
  [...document.querySelectorAll('[role="menuitem"], [class*="menu-item"], li, button')]
    .map((el) => (el.innerText || '').trim())
    .filter((t) => t && t.length < 30)
    .slice(0, 40)
);
console.log(items);
process.exit(0);
