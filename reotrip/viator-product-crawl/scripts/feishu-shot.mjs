import { chromium } from 'playwright';
const CDP = 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('feishu.cn'));
await page.bringToFront();
await page.screenshot({ path: 'artifacts/screenshots/feishu-mid-paste.png' });
const box = await page.evaluate(() => {
  const wrap = document.querySelector('.spreadsheet-wrap, .js-spreadsheet-wrap, canvas');
  const r = wrap?.getBoundingClientRect();
  return { url: location.href, title: document.title, wrap: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null, text: document.body.innerText.slice(0, 800) };
});
console.log(JSON.stringify(box, null, 2));
process.exit(0);
