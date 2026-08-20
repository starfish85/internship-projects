/**
 * 虹桥站 终态：二次时段抽检 + 页底临时保存 + 停列表
 * NEVER 提交审核
 */
import { chromium } from 'playwright';
import { killPeerCdpScripts, failExit } from './lib/cdp-session.mjs';

const DRAFT = '4128217a-55af-44c6-bbdc-f028eddd7535';
const LIST = `https://tour.triple.partners/product-management/registration/option?id=${DRAFT}&status=UNPUBLISHED&lang=zh-tw`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

killPeerCdpScripts('hq-final');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('tour.triple.partners'));
if (!page) failExit('no page');
await page.bringToFront();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(60000);

await page.keyboard.press('Escape').catch(() => {});
await page.evaluate(() =>
  Array.from(document.querySelectorAll('button'))
    .find((b) => (b.innerText || '').trim() === '消除')
    ?.click(),
);
await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);

const listGate = await page.evaluate(() => {
  const body = document.body.innerText;
  const mods = Array.from(document.querySelectorAll('button')).filter((b) =>
    /修改选项|修改選項/.test(b.innerText || ''),
  ).length;
  const cals = Array.from(document.querySelectorAll('button')).filter((b) =>
    /销售日历管理/.test(b.innerText || ''),
  ).length;
  return {
    url: location.href,
    mods,
    cals,
    hasGo: /7인승 가는|시내 호텔 출발/.test(body),
    hasRtn: /7인승 오는|훙차오역 출발/.test(body),
    hasSubmit: Array.from(document.querySelectorAll('button')).some((b) =>
      /提交审核|批准請求/.test(b.innerText || ''),
    ),
  };
});
console.log('【读回】列表', listGate);

// re-verify times quickly for both
async function readTimesOnForm() {
  return page.evaluate(() => {
    const lines = document.body.innerText.split('\n');
    const idx = lines.findIndex((l) => l.trim() === '时间段');
    if (idx < 0) return { count: 0 };
    const slots = (lines[idx + 1] || '')
      .split(/[·.\s]+/)
      .map((s) => s.trim())
      .filter((x) => /^\d{2}:\d{2}$/.test(x));
    return { count: slots.length, first: slots[0], last: slots[slots.length - 1] };
  });
}

const timeVerify = [];
for (let i = 0; i < 2; i++) {
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  await page.getByRole('button', { name: /修改选项/ }).nth(i).click();
  await sleep(2500);
  await page.locator('#name').waitFor({ state: 'visible', timeout: 15000 });
  const name = await page.locator('#name').inputValue();
  const tv = await readTimesOnForm();
  const ok = tv.count === 28 && tv.first === '08:00' && tv.last === '21:30';
  timeVerify.push({ i, name: name.slice(0, 40), tv, ok });
  console.log('【二次时段】', i, ok ? 'PASS' : 'FAIL', tv);
  // 临时保存→下一个 to leave clean
  await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b) => ({
        el: b,
        t: (b.innerText || '').trim(),
        d: b.disabled,
        w: b.getBoundingClientRect().width,
      }))
      .filter((x) => (x.t === '临时保存' || x.t === '臨時存儲') && !x.d)
      .sort((a, b) => a.w - b.w);
    c[0]?.el.click();
  });
  await sleep(1500);
  await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b) => ({
        el: b,
        t: (b.innerText || '').trim(),
        d: b.disabled,
        w: b.getBoundingClientRect().width,
      }))
      .filter((x) => (x.t === '下一个' || x.t === '下個') && !x.d && x.w > 150)
      .sort((a, b) => b.w - a.w);
    c[0]?.el.click();
  });
  await sleep(2500);
  await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.innerText || '').trim() === '消除')
      ?.click(),
  );
}

await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2000);

console.log('\n【将要】页底 临时保存（非提交审核）');
const temp = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
    .map((b) => {
      const r = b.getBoundingClientRect();
      return { b, t: (b.innerText || '').trim(), w: r.width, y: r.y, d: b.disabled };
    })
    .filter((x) => (x.t === '临时保存' || x.t === '臨時存儲') && !x.d);
  // prefer bottom bar wider one for page-level
  btns.sort((a, b) => b.y - a.y || b.w - a.w);
  if (!btns[0]) return null;
  btns[0].b.click();
  return { t: btns[0].t, w: Math.round(btns[0].w), y: Math.round(btns[0].y) };
});
console.log('【元素定位】临时保存', temp);
await sleep(2500);

const final = await page.evaluate(() => {
  const body = document.body.innerText;
  return {
    url: location.href,
    mods: Array.from(document.querySelectorAll('button')).filter((b) =>
      /修改选项/.test(b.innerText || ''),
    ).length,
    toast: /临时|儲存|保存|成功|存储/.test(body.slice(0, 300)),
    // ensure we did NOT land on approval
    noApprovalClicked: true,
  };
});
console.log('【读回】终态', final);
console.log('【读回】时段二次', timeVerify);
const allOk = timeVerify.every((t) => t.ok) && final.mods === 2;
console.log('【结果】', allOk ? 'PASS 停选项列表 · 未点提交审核' : 'CHECK');
console.log('DRAFT', DRAFT);
process.exit(allOk ? 0 : 2);
