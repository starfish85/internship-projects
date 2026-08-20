import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('artifacts/screenshots', { recursive: true });

const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const page = pages.find((p) => (p.url() || '').includes('feishu.cn'));
if (!page) {
  console.error('no feishu tab');
  process.exit(1);
}

await page.bringToFront();
await sleep(1500);
const info = await page.evaluate(() => {
  const text = (document.body?.innerText || '').slice(0, 3500);
  const tabs = [...document.querySelectorAll('[role="tab"], .sheet-tab, [class*="sheet"], [class*="Sheet"], button, a')]
    .map((el) => ({
      tag: el.tagName,
      text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40),
      cls: (el.className || '').toString().slice(0, 80),
    }))
    .filter((x) => x.text && /门票|接送|包车|日游|sheet|工作表|导入|import|file/i.test(x.text));
  return {
    title: document.title,
    url: location.href,
    text,
    tabs: tabs.slice(0, 40),
  };
});
await page.screenshot({ path: 'artifacts/screenshots/feishu-now.png', fullPage: false });
console.log(JSON.stringify({ title: info.title, url: info.url, tabs: info.tabs }, null, 2));
console.log('--- text ---');
console.log(info.text.slice(0, 2000));
process.exit(0);
