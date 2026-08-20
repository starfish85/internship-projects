import { chromium } from 'playwright';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('feishu.cn'));
await page.bringToFront();

const clickTab = async (name) => {
  await page.locator('.sheet-tabs').getByText(name, { exact: true }).first().click();
  await sleep(700);
};
const grid = async () => {
  const r = await page.evaluate(() => {
    const c = document.querySelector('canvas.faster-single-canvas');
    const b = c.getBoundingClientRect();
    return { x: b.x, y: b.y };
  });
  return r;
};

await clickTab('门票产品');
const g = await grid();
// scroll to top-left
await page.mouse.click(g.x + 90, g.y + 36);
await page.keyboard.press('Control+Home');
await page.keyboard.press('Meta+Home');
await sleep(400);
await page.screenshot({ path: 'artifacts/screenshots/feishu-tickets-top.png' });

await clickTab('包车产品');
await sleep(400);
await page.screenshot({ path: 'artifacts/screenshots/feishu-charter.png' });

await clickTab('接送产品');
await sleep(300);
await page.screenshot({ path: 'artifacts/screenshots/feishu-transfer-top.png' });

process.exit(0);
