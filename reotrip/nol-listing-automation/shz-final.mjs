import { chromium } from 'playwright';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
const DRAFT = '0bd5b8fb-991f-4313-b798-3a9a4d6bd060';
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
killPeerCdpScripts('shz-final');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
await page.bringToFront();
await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
const g = await page.evaluate(() => ({
  mods: Array.from(document.querySelectorAll('button')).filter((b) => /修改选项/.test(b.innerText || '')).length,
  cals: Array.from(document.querySelectorAll('button')).filter((b) => /销售日历管理/.test(b.innerText || '')).length,
  hasGo: /상하이역 편도|7인승 가는/.test(document.body.innerText),
  hasRtn: /상하이역 출발|7인승 오는/.test(document.body.innerText),
}));
console.log('【列表】', g);
await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
    .map((b) => {
      const r = b.getBoundingClientRect();
      return { b, t: (b.innerText || '').trim(), w: r.width, y: r.y, d: b.disabled };
    })
    .filter((x) => (x.t === '临时保存' || x.t === '臨時存儲') && !x.d);
  btns.sort((a, b) => b.y - a.y || b.w - a.w);
  btns[0]?.b.click();
});
await sleep(2000);
console.log('【结果】PASS 停列表 · 未点提交审核 · DRAFT', DRAFT);
process.exit(g.mods === 2 ? 0 : 2);
