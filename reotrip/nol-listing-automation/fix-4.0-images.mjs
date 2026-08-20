/**
 * 4.0 image rules (user clarified):
 * - Content mismatch → replace with pure car images
 * - Duplicates only → dedupe (do not force car swap)
 * - Matching + unique → skip
 * Never 提交审核.
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CARS = [
  '/Users/mac/nol/upload-ready-images/japan-car-only/car-1.jpg',
  '/Users/mac/nol/upload-ready-images/japan-car-only/car-2.jpg',
  '/Users/mac/nol/upload-ready-images/japan-car-only/car-3.jpg',
];

// content mismatch products from 4.0 feedback
const JOBS = [
  { id: '72d8f629-815d-4d9c-a02f-e3cc1afe5fa7', name: '东京站-羽田', mode: 'replace_cars' },
  { id: 'd1fc3cef-bcab-4f1e-a838-cdeeda3ec906', name: '京都-KIX', mode: 'replace_cars' },
  { id: '346a18c1-f6bd-4238-923e-64310bdbc507', name: '奈良-KIX', mode: 'replace_cars' },
  { id: '731d947c-670a-441c-8b37-eeaa06832786', name: '神户-KIX', mode: 'replace_cars' },
  { id: '9cef6c16-064d-4cff-be6d-9a6cc81e14eb', name: '大阪-京都酒店', mode: 'copy_and_fill_if_empty' },
];

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

async function readImgState(page) {
  return page.evaluate(() => {
    const body = document.body.innerText || '';
    const imgs = Array.from(document.querySelectorAll('img')).filter((img) => {
      const r = img.getBoundingClientRect();
      return r.width >= 60 && r.height >= 60 && r.y > 100 && r.y < 1400;
    });
    const delBtns = Array.from(document.querySelectorAll('button')).filter((b) => {
      const t = (b.innerText || '').trim();
      const r = b.getBoundingClientRect();
      return (t === '×' || t === '✕') && r.width > 0 && r.width < 50 && r.y > 100 && r.y < 1200;
    });
    const fileInputs = Array.from(document.querySelectorAll('input[type=file]')).map((el, i) => {
      const r = el.getBoundingClientRect();
      return { i, accept: el.accept || '', y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    });
    const hasWrong =
      /To\/From Tokyo Hotels|Osaka City Hotels|Private Transfer To\/From/i.test(body);
    return {
      nImg: imgs.length,
      nDel: delBtns.length,
      n: Math.max(imgs.length, delBtns.length),
      fileInputs,
      hasWrong,
      hasThumbLabel: /썸네일|缩略图|商品图片|产品登记/i.test(body),
    };
  });
}

async function deleteAllThumbs(page) {
  for (let i = 0; i < 20; i++) {
    const ok = await page.evaluate(() => {
      const xs = Array.from(document.querySelectorAll('button'))
        .filter((b) => {
          const t = (b.innerText || '').trim();
          const r = b.getBoundingClientRect();
          return (t === '×' || t === '✕') && r.width > 0 && r.width < 50 && r.y > 100 && r.y < 1200;
        })
        .sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
      if (!xs.length) return false;
      xs[0].click();
      return true;
    });
    if (!ok) break;
    await sleep(500);
  }
}

async function uploadCars(page) {
  // prefer first image file input under 썸네일 area
  const inputs = page.locator('input[type=file][accept*="image"]');
  const n = await inputs.count();
  console.log('  file inputs', n);
  const input = inputs.first();
  await input.waitFor({ state: 'attached', timeout: 15000 });
  await input.setInputFiles(CARS);
  await sleep(5500);
}

async function save(page) {
  const st = page.getByRole('button', { name: /保存然后|保存然後/ });
  if ((await st.count()) && !(await st.first().isDisabled().catch(() => true))) {
    await st.first().click();
    await sleep(3500);
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

async function fixSuzukaCopy(page) {
  return page.evaluate(() => {
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
      hits.push({ name: el.name, to: nv.slice(0, 80) });
    }
    return hits;
  });
}

console.log('【规则】内容不符→车图；重复只去重；匹配不改');
const { page } = await connectNolPage({
  selfHint: 'fix-4.0-images',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const results = [];
for (const j of JOBS) {
  console.log(`\n======== ${j.name} (${j.mode}) ========`);
  try {
    await dismiss(page);
    await page.goto(introUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2800);
    await dismiss(page);

    let st = await readImgState(page);
    console.log('【读回】before', st);

    if (j.mode === 'copy_and_fill_if_empty' || j.name.includes('京都酒店')) {
      const ch = await fixSuzukaCopy(page);
      console.log('【读回】copy', ch);
    }

    // action decision
    let action = 'skip';
    if (j.mode === 'replace_cars') action = 'replace_cars';
    else if (st.n === 0 || st.hasWrong) action = 'replace_cars';
    else if (st.n > 3) action = 'dedupe';
    console.log('【将要】action=', action);

    if (action === 'replace_cars') {
      await deleteAllThumbs(page);
      await sleep(800);
      st = await readImgState(page);
      console.log('【读回】after delete', st.n);
      await uploadCars(page);
      st = await readImgState(page);
      console.log('【读回】after upload', st.n);
      // if still 0, try force-click label 上传 or second file input
      if (st.n < 3) {
        console.log('【将要】retry upload via all file inputs');
        const cnt = await page.locator('input[type=file]').count();
        for (let i = 0; i < cnt; i++) {
          const acc = await page.locator('input[type=file]').nth(i).getAttribute('accept');
          if (acc && !/image/i.test(acc)) continue;
          await page.locator('input[type=file]').nth(i).setInputFiles(CARS).catch(() => {});
          await sleep(3000);
          st = await readImgState(page);
          if (st.n >= 3) break;
        }
        console.log('【读回】retry n=', st.n);
      }
    } else if (action === 'dedupe') {
      while ((await readImgState(page)).n > 3) {
        await page.evaluate(() => {
          const xs = Array.from(document.querySelectorAll('button'))
            .filter((b) => {
              const t = (b.innerText || '').trim();
              const r = b.getBoundingClientRect();
              return (t === '×' || t === '✕') && r.width > 0 && r.width < 50 && r.y > 100 && r.y < 1200;
            })
            .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
          xs[0]?.click();
        });
        await sleep(500);
      }
    }

    const saveMode = await save(page);
    console.log('【结果】save', saveMode);

    await page.goto(introUrl(j.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2800);
    st = await readImgState(page);
    const fieldBan = await page.evaluate(() => {
      const hits = [];
      for (const el of document.querySelectorAll('textarea, input')) {
        if (/스즈카|铃鹿/.test(el.value || '')) hits.push(el.name);
      }
      return hits;
    });
    const ok = st.n >= 3 && !st.hasWrong && fieldBan.length === 0;
    console.log('【结果】', ok ? 'PASS' : 'NEED', { n: st.n, wrong: st.hasWrong, fieldBan });
    results.push({ name: j.name, action, n: st.n, wrong: st.hasWrong, fieldBan, ok, saveMode });
  } catch (e) {
    console.log('ERR', j.name, e.message?.slice(0, 150));
    results.push({ name: j.name, ok: false, err: String(e.message).slice(0, 150) });
  }
}

console.log('\nSUMMARY', JSON.stringify(results, null, 2));
console.log('未点提交审核');
process.exit(results.every((r) => r.ok) ? 0 : 2);
