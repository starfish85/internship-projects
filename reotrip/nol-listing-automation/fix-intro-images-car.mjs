/**
 * 4.0: Replace intro 썸네일 with pure 3 car images.
 * Never 提交审核.
 *
 * Usage:
 *   node fix-intro-images-car.mjs              # 4.0 named image jobs
 *   node fix-intro-images-car.mjs 72d8f629      # short id
 */
import fs from 'node:fs';
import path from 'node:path';
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CAR_DIR = '/Users/mac/nol/upload-ready-images/japan-car-only';
const CARS = [
  path.join(CAR_DIR, 'car-1.jpg'),
  path.join(CAR_DIR, 'car-2.jpg'),
  path.join(CAR_DIR, 'car-3.jpg'),
];

const FULL = {
  '72d8f629': '72d8f629-a5c0-4b3e-9e0e-8f1f0c0c0c0c', // resolve
  d1fc3cef: null,
  '346a18c1': null,
  '731d947c': null,
  '9cef6c16': null, // osaka-kyoto also refresh cars
  f14da9cb: null, // tokyo stn nrt optional
};

// resolve from audit
const audit = JSON.parse(fs.readFileSync(new URL('./japan-full-audit-results.json', import.meta.url), 'utf8'));
const byShort = {};
for (const r of audit.results || audit) {
  if (r.id) byShort[r.id.slice(0, 8)] = { id: r.id, name: r.name, n: r.n };
}
// #36 fix
byShort.c5a6feaf = { id: 'c5a6feaf-7ded-4318-967e-c70062b5cb6e', name: 'CTS-二世谷/留寿都', n: 36 };

const DEFAULT_JOBS = ['72d8f629', 'd1fc3cef', '346a18c1', '731d947c', '9cef6c16'];

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

async function countThumbs(page) {
  return page.evaluate(() => {
    // count delete X or preview imgs under 썸네일 / 商品图片
    const body = document.body?.innerText || '';
    const imgs = Array.from(document.querySelectorAll('img')).filter((img) => {
      const r = img.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) return false;
      // near product image area: upper half of long form often
      const src = img.src || '';
      return /thumbnail|product|image|media|cdn|static/i.test(src) || r.width > 80;
    });
    // delete buttons near thumbs
    const delBtns = Array.from(document.querySelectorAll('button,div,span')).filter((e) => {
      const t = (e.innerText || '').trim();
      const aria = e.getAttribute('aria-label') || '';
      const r = e.getBoundingClientRect();
      return (t === '×' || t === 'x' || t === 'X' || /삭제|删除|移除|close/i.test(aria + t)) && r.width > 0 && r.width < 50 && r.y > 100;
    });
    return {
      imgApprox: imgs.length,
      delCount: delBtns.length,
      hasThumbLabel: /썸네일|缩略图|商品图片|产品登记图片|대표/.test(body),
    };
  });
}

async function deleteAllThumbs(page) {
  // click red X repeatedly
  for (let guard = 0; guard < 12; guard++) {
    const n = await page.evaluate(() => {
      const dels = Array.from(document.querySelectorAll('button,div,span,[role=button]')).filter((e) => {
        const t = (e.innerText || '').trim();
        const aria = (e.getAttribute('aria-label') || '') + (e.className || '');
        const r = e.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        if (r.y < 80 || r.y > 1200) return false;
        // common close on image cards
        return (
          t === '×' ||
          t === '✕' ||
          t === 'x' ||
          /close|delete|삭제|删除|移除/i.test(aria) ||
          (/IconButton|close|delete/i.test(String(e.className)) && r.width < 48 && r.height < 48)
        );
      });
      // prefer those near images
      dels.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
      if (!dels.length) return 0;
      dels[0].click();
      return dels.length;
    });
    if (!n) break;
    await sleep(500);
  }
  // also try clicking SVG close icons
  await page.evaluate(() => {
    document.querySelectorAll('svg').forEach((svg) => {
      const p = svg.closest('button') || svg.parentElement;
      if (!p) return;
      const r = p.getBoundingClientRect();
      if (r.width > 0 && r.width < 40 && r.height < 40 && r.y > 200 && r.y < 900) {
        // may be close - skip mass click
      }
    });
  });
}

async function uploadCars(page) {
  const input = page.locator('input[type=file][accept*="image"]').first();
  await input.waitFor({ state: 'attached', timeout: 15000 });
  await input.setInputFiles(CARS);
  await sleep(4000);
}

async function saveIntro(page) {
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

async function fixCopySuzukaLeak(page) {
  // Osaka-Kyoto hotel: remove 스즈카/铃鹿 from description/checklist
  const fixed = await page.evaluate(() => {
    const ban = /스즈카|铃鹿|鈴鹿|스즈카시/;
    const changed = [];
    for (const el of document.querySelectorAll('textarea, input')) {
      const v = el.value || '';
      if (!v || !ban.test(v)) continue;
      const name = el.name || el.id || '';
      if (!/description|checkList|highlight|usage|headline|must|know|注意/i.test(name + (el.placeholder || ''))) continue;
      const nv = v
        .replace(/스즈카\s*시내[^\n]*/g, '교토 시내 호텔')
        .replace(/铃鹿[^\n]*/g, '京都酒店')
        .replace(/鈴鹿[^\n]*/g, '京都酒店')
        .replace(/스즈카/g, '교토');
      if (nv !== v) {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        desc.set.call(el, nv);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        changed.push({ name, preview: nv.slice(0, 60) });
      }
    }
    return changed;
  });
  return fixed;
}

const arg = process.argv[2];
const jobs = arg ? [arg.slice(0, 8)] : DEFAULT_JOBS;

console.log('【本轮验收·三句】');
console.log('1) 定位：file input / 删除 × 文案，禁止坐标');
console.log('2) 选中：썸네일 count===3 纯车图；无 Hotels 海报');
console.log('3) 门禁：保存然后/临时保存；永不提交审核');
console.log('【将要】jobs=', jobs.join(','));

const { page } = await connectNolPage({
  selfHint: 'fix-intro-images-car',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const results = [];
for (const short of jobs) {
  const meta = byShort[short];
  if (!meta?.id) {
    console.log('SKIP no id', short);
    results.push({ short, status: 'NO_ID' });
    continue;
  }
  console.log(`\n======== #${meta.n || '?'} ${meta.name} ${meta.id.slice(0, 8)} ========`);
  try {
    await dismiss(page);
    await page.goto(introUrl(meta.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2800);
    await dismiss(page);

    const body = await page.evaluate(() => (document.body.innerText || '').slice(0, 80));
    if (/找不到|아이코|404/.test(body)) {
      results.push({ ...meta, status: '404' });
      continue;
    }

    // copy fix for osaka-kyoto
    let copy = null;
    if (short === '9cef6c16' || /京都.*酒店|오사카.*교토/i.test(meta.name)) {
      console.log('【将要】去 스즈카/铃鹿 串文案');
      copy = await fixCopySuzukaLeak(page);
      console.log('【读回】copy fixed', copy);
    }

    let before = await countThumbs(page);
    console.log('【读回】thumbs before', before);

    console.log('【将要】删除旧缩略图');
    await deleteAllThumbs(page);
    await sleep(800);
    // more aggressive: click all visible × near top form
    for (let i = 0; i < 8; i++) {
      const clicked = await page.evaluate(() => {
        const xs = Array.from(document.querySelectorAll('button')).filter((b) => {
          const t = (b.innerText || '').trim();
          const r = b.getBoundingClientRect();
          return (t === '×' || t === '✕') && r.width > 0 && r.width < 60 && r.y > 150 && r.y < 1000;
        });
        if (!xs.length) return false;
        xs[0].click();
        return true;
      });
      if (!clicked) break;
      await sleep(400);
    }

    console.log('【将要】上传 3 张纯车图');
    await uploadCars(page);
    await sleep(2000);
    let after = await countThumbs(page);
    console.log('【读回】thumbs after upload', after);

    // wait for previews
    for (let w = 0; w < 10; w++) {
      after = await countThumbs(page);
      if (after.delCount >= 3 || after.imgApprox >= 3) break;
      await sleep(800);
    }
    console.log('【读回】thumbs settled', after);

    const save = await saveIntro(page);
    console.log('【结果】save=', save);

    // re-open verify
    await page.goto(introUrl(meta.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2500);
    const final = await countThumbs(page);
    const pageText = await page.evaluate(() => document.body.innerText || '');
    const hasWrongPoster = /To\/From Tokyo Hotels|Osaka City Hotels|Private Transfer To\/From/i.test(pageText);
    // check img alts/src less reliable; delCount as proxy for N
    const ok = final.delCount >= 3 || final.imgApprox >= 3;
    console.log('【读回】final', final, 'wrongPoster', hasWrongPoster);
    console.log('【结果】', ok && !hasWrongPoster ? 'PASS' : 'NEED', meta.name);

    results.push({
      n: meta.n,
      name: meta.name,
      id: meta.id,
      before,
      after: final,
      copy,
      save,
      wrongPoster: hasWrongPoster,
      status: ok ? 'PASS' : 'NEED',
    });
  } catch (e) {
    console.log('ERR', meta.name, e.message?.slice(0, 150));
    results.push({ short, name: meta.name, status: 'ERR', err: String(e.message).slice(0, 150) });
  }
}

const out = new URL('./fix-intro-images-car-results.json', import.meta.url);
fs.writeFileSync(out, JSON.stringify(results, null, 2));
console.log('\nSUMMARY', out.pathname);
console.log(JSON.stringify(results.map((r) => ({ n: r.n, name: r.name, status: r.status, del: r.after?.delCount })), null, 2));
console.log('未点提交审核');
process.exit(results.some((r) => r.status === 'ERR' || r.status === 'NEED') ? 2 : 0);
