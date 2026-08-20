import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TSV_DIR = '/Users/mac/viator产品爬取/data/feishu_tsv';

const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('feishu.cn'));
await page.bringToFront();

const grid = async () => page.evaluate(() => {
  const c = document.querySelector('canvas.faster-single-canvas');
  const b = c.getBoundingClientRect();
  return { x: b.x, y: b.y };
});

const pasteSheet = async (sheet) => {
  console.log('paste', sheet);
  await page.locator('.sheet-tabs').getByText(sheet, { exact: true }).first().click();
  await sleep(700);
  await page.keyboard.press('Escape');
  await sleep(200);
  const g = await grid();
  await page.mouse.click(g.x + 18, g.y + 10);
  await sleep(200);
  await page.keyboard.press('Delete');
  await sleep(400);
  execFileSync('pbcopy', { input: fs.readFileSync(path.join(TSV_DIR, `${sheet}.tsv`)) });
  await page.mouse.click(g.x + 90, g.y + 36);
  await sleep(200);
  await page.keyboard.press('Escape');
  await sleep(120);
  await page.mouse.click(g.x + 90, g.y + 36);
  await page.keyboard.press('Meta+V');
  await sleep(2500);
  await page.screenshot({ path: `artifacts/screenshots/feishu-repaste-${sheet}.png` });
};

await pasteSheet('包车产品');
await pasteSheet('日游产品');
console.log('ok');
process.exit(0);
