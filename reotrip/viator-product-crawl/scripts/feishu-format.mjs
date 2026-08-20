import { chromium } from 'playwright';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('feishu.cn'));
await page.bringToFront();

const grid = async () => page.evaluate(() => {
  const c = document.querySelector('canvas.faster-single-canvas');
  const b = c.getBoundingClientRect();
  return { x: b.x, y: b.y };
});

const clickTab = async (name) => {
  await page.locator('.sheet-tabs').getByText(name, { exact: true }).first().click();
  await sleep(600);
};

const formatSheet = async (name) => {
  await clickTab(name);
  const g = await grid();
  await page.keyboard.press('Escape');
  await sleep(150);
  // select all
  await page.mouse.click(g.x + 18, g.y + 10);
  await sleep(250);
  const clearBtn = page.getByText('清除格式', { exact: true }).first();
  if (await clearBtn.count()) {
    await clearBtn.click();
    await sleep(500);
  }
  // auto-fit col A: double-click boundary between A and B in header
  // header canvas is above grid
  await page.mouse.dblclick(g.x + 200, g.y + 8);
  await sleep(300);
  // drag A wider in case dblclick didn't auto-fit
  await page.mouse.move(g.x + 210, g.y + 8);
  await page.mouse.down();
  await page.mouse.move(g.x + 380, g.y + 8, { steps: 8 });
  await page.mouse.up();
  await sleep(300);
  // widen C a bit for tickets/options
  await page.mouse.move(g.x + 520, g.y + 8);
  await page.mouse.down();
  await page.mouse.move(g.x + 640, g.y + 8, { steps: 6 });
  await page.mouse.up();
  await sleep(250);
  await page.screenshot({ path: `artifacts/screenshots/feishu-fmt-${name}.png` });
};

for (const s of ['门票产品', '接送产品', '包车产品', '日游产品']) {
  await formatSheet(s);
}
await clickTab('门票产品');
await sleep(400);
await page.screenshot({ path: 'artifacts/screenshots/feishu-final.png' });
console.log('formatted');
process.exit(0);
