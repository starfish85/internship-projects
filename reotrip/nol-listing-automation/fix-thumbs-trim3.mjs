/**
 * Trim intro thumbs to exactly 3 pure car images; fix Osaka-Kyoto 스즈카 leak.
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CARS = [
  '/Users/mac/nol/upload-ready-images/japan-car-only/car-1.jpg',
  '/Users/mac/nol/upload-ready-images/japan-car-only/car-2.jpg',
  '/Users/mac/nol/upload-ready-images/japan-car-only/car-3.jpg',
];
const JOBS = [
  { id: 'd1fc3cef-bcab-4f1e-a838-cdeeda3ec906', name: '京都-KIX' },
  { id: '9cef6c16-064d-4cff-be6d-9a6cc81e14eb', name: '大阪-京都酒店', fixCopy: true },
  { id: '72d8f629-815d-4d9c-a02f-e3cc1afe5fa7', name: '东京站-羽田' },
  { id: '346a18c1-f6bd-4238-923e-64310bdbc507', name: '奈良-KIX' },
  { id: '731d947c-670a-441c-8b37-eeaa06832786', name: '神户-KIX' },
];

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

async function countX(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).filter((b) => {
      const t = (b.innerText || '').trim();
      const r = b.getBoundingClientRect();
      return (t === '×' || t === '✕') && r.width > 0 && r.width < 50 && r.y > 120 && r.y < 1100;
    }).length,
  );
}

async function deleteOneExtra(page) {
  return page.evaluate(() => {
    const xs = Array.from(document.querySelectorAll('button'))
      .filter((b) => {
        const t = (b.innerText || '').trim();
        const r = b.getBoundingClientRect();
        return (t === '×' || t === '✕') && r.width > 0 && r.width < 50 && r.y > 120 && r.y < 1100;
      })
      .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
    if (!xs.length) return false;
    xs[0].click();
    return true;
  });
}

async function deleteAll(page) {
  for (let i = 0; i < 15; i++) {
    if (!(await deleteOneExtra(page))) break;
    await sleep(450);
  }
}

async function save(page) {
  const st = page.getByRole('button', { name: /保存然后|保存然後/ });
  if ((await st.count()) && !(await st.first().isDisabled().catch(() => true))) {
    await st.first().click();
    await sleep(3200);
    return 'saveThen';
  }
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => {
        const t = (b.innerText || '').trim();
        return (t === '临时保存' || t === '臨時存儲') && !b.disabled;
      })
      ?.click();
  });
  await sleep(2500);
  return 'temp';
}

const { page } = await connectNolPage({
  selfHint: 'trim3',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

console.log('【将要】缩略图修剪到正好 3 张纯车图');
const results = [];
for (const j of JOBS) {
  console.log(`\n======== ${j.name} ========`);
  await dismiss(page);
  await page.goto(introUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  await dismiss(page);

  let n = await countX(page);
  console.log('【读回】before', n);

  // hard reset: delete all + upload 3
  console.log('【将要】全删后上传 3 车图');
  await deleteAll(page);
  await sleep(600);
  n = await countX(page);
  console.log('【读回】after delete all', n);

  await page.locator('input[type=file][accept*="image"]').first().setInputFiles(CARS);
  await sleep(4500);
  n = await countX(page);
  console.log('【读回】after upload', n);

  // trim if >3
  while ((await countX(page)) > 3) {
    await deleteOneExtra(page);
    await sleep(500);
  }
  n = await countX(page);
  console.log('【读回】trimmed', n);

  if (j.fixCopy) {
    const ch = await page.evaluate(() => {
      const ban = /스즈카|铃鹿|鈴鹿/;
      const hits = [];
      for (const el of document.querySelectorAll('textarea, input')) {
        const v = el.value || '';
        if (!ban.test(v)) continue;
        let nv = v
          .replace(/스즈카\s*시내[^\n·,]*/g, '교토 시내 호텔')
          .replace(/스즈카/g, '교토')
          .replace(/铃鹿[^\n]*/g, '京都酒店')
          .replace(/鈴鹿[^\n]*/g, '京都酒店');
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, nv);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        hits.push({ name: el.name, to: nv.slice(0, 90) });
      }
      return hits;
    });
    console.log('【读回】copy', ch);
  }

  const saveMode = await save(page);
  console.log('【结果】save', saveMode);

  await page.goto(introUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  n = await countX(page);
  const scan = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const fields = [];
    for (const el of document.querySelectorAll('textarea, input')) {
      if (/스즈카|铃鹿/.test(el.value || '')) fields.push(el.name);
    }
    return {
      banBody: /스즈카|铃鹿|To\/From Tokyo Hotels|Osaka City Hotels/i.test(body),
      banFields: fields,
    };
  });
  const ok = n === 3 && !scan.banBody && !scan.banFields.length;
  console.log('【结果】', ok ? 'PASS' : 'NEED', { n, ...scan });
  results.push({ name: j.name, n, ok, scan });
}

console.log(JSON.stringify(results, null, 2));
console.log('未点提交审核');
process.exit(results.every((r) => r.ok) ? 0 : 2);
