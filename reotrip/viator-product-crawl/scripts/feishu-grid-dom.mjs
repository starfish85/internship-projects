import { chromium } from 'playwright';
const CDP = 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => (p.url() || '').includes('feishu.cn'));
await page.bringToFront();
const info = await page.evaluate(() => {
  const canvases = [...document.querySelectorAll('canvas')].map((c) => {
    const r = c.getBoundingClientRect();
    return { w: c.width, h: c.height, x: r.x, y: r.y, dw: r.width, dh: r.height, cls: c.className };
  });
  const interesting = [...document.querySelectorAll('[class*="cell"], [class*="grid"], [class*="canvas"], [class*="sheet-body"]')]
    .slice(0, 25)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, cls: (el.className || '').toString().slice(0, 80), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    });
  return { canvases, interesting, size: { iw: innerWidth, ih: innerHeight } };
});
console.log(JSON.stringify(info, null, 2));
process.exit(0);
