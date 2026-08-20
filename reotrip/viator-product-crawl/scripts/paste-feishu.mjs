import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TSV_DIR = '/Users/mac/viator产品爬取/data/feishu_tsv';

const copyTsv = (name) => {
  const file = path.join(TSV_DIR, `${name}.tsv`);
  execFileSync('pbcopy', { input: fs.readFileSync(file) });
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length;
};

const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('feishu.cn'));
if (!page) process.exit(1);
await page.bringToFront();

const grid = async () => {
  const r = await page.evaluate(() => {
    const c = document.querySelector('canvas.faster-single-canvas');
    const b = c.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  return r;
};

const clickA1 = async () => {
  const g = await grid();
  // first cell: skip row-header (~40px) and col-header (~22px)
  await page.mouse.click(g.x + 90, g.y + 36);
  await sleep(200);
};

const selectAll = async () => {
  const g = await grid();
  // top-left select-all corner
  await page.mouse.click(g.x + 18, g.y + 10);
  await sleep(250);
};

const clickTab = async (name) => {
  await page.locator('.sheet-tabs').getByText(name, { exact: true }).first().click();
  await sleep(900);
};

const pasteSheet = async (sheet) => {
  console.log('===', sheet);
  await page.keyboard.press('Escape');
  await sleep(200);
  await clickTab(sheet);
  await page.keyboard.press('Escape');
  await sleep(200);

  await selectAll();
  await page.keyboard.press('Delete');
  await sleep(500);
  await page.keyboard.press('Backspace');
  await sleep(400);
  await page.screenshot({ path: `artifacts/screenshots/feishu-cleared-${sheet}.png` });

  const n = copyTsv(sheet);
  console.log('rows', n);
  await clickA1();
  await page.keyboard.press('Escape');
  await sleep(150);
  await clickA1();
  await page.keyboard.press('Meta+V');
  await sleep(3000);
  await page.screenshot({ path: `artifacts/screenshots/feishu-pasted-${sheet}.png` });
};

for (const sheet of ['门票产品', '接送产品', '包车产品', '日游产品']) {
  await pasteSheet(sheet);
  await sleep(800);
}

await clickTab('门票产品');
await sleep(600);
await page.screenshot({ path: 'artifacts/screenshots/feishu-done-tickets.png' });
console.log('all pasted');
process.exit(0);
