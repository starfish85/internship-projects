/**
 * Delete ONE duplicate option via: list → 修改选项 nth → form 더 보기 → 删除 → confirm
 * usage: node delete-one-dup.mjs <draftId> <label> [optIndex]
 *   optIndex default = last card (highest index)
 * Readback: list count before/after + titles
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const id = process.argv[2];
const label = process.argv[3] || id?.slice(0, 8);
const forceIdx = process.argv[4] != null ? Number(process.argv[4]) : null;

if (!id) {
  console.error('usage: node delete-one-dup.mjs <draftId> <label> [optIndex]');
  process.exit(2);
}

function optionUrl(draftId) {
  return `https://tour.triple.partners/product-management/registration/option?id=${draftId}&status=UNPUBLISHED&lang=zh-tw`;
}

async function listNames(page) {
  return page.evaluate(() => {
    const mods = Array.from(document.querySelectorAll('button')).filter((b) =>
      /修改选项|修改選項/.test((b.innerText || '').trim()),
    );
    return mods.map((btn, i) => {
      let n = btn;
      let text = '';
      for (let d = 0; d < 12 && n; d++) {
        const t = (n.innerText || '').replace(/\s+/g, ' ').trim();
        if (t.length > 20 && t.length < 500) {
          text = t;
          break;
        }
        n = n.parentElement;
      }
      const title =
        text.match(/[\uac00-\ud7af].{8,90}(?:차량|차량\)|이동)/)?.[0] || text.slice(0, 80);
      return { i, title: title.trim(), text: text.slice(0, 120) };
    });
  });
}

async function findDupIndex(names) {
  const seen = new Map();
  let lastDup = null;
  names.forEach((x, i) => {
    const key = x.title
      .replace(/可销售|可供出售|판매중/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 70);
    if (seen.has(key)) lastDup = i;
    else seen.set(key, i);
  });
  return { lastDup, unique: seen.size, keys: [...seen.keys()] };
}

const { page } = await connectNolPage({
  selfHint: 'delete-one-dup',
  killPeers: true,
  // user window was 961 — force once to allowed size (§52)
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

console.log(`【将要】打开 ${label} 选项列表`);
await dismiss(page);
await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
await dismiss(page);

const w = await page.evaluate(() => window.innerWidth);
console.log('【读回】innerWidth=', w);
if (w < 1280) {
  console.log('【结果】FAIL 视口过窄');
  process.exit(2);
}

let names = await listNames(page);
console.log(
  '【读回】删前 count=',
  names.length,
  names.map((x) => `${x.i}:${x.title.slice(0, 45)}`),
);

const { lastDup, unique } = await findDupIndex(names);
const idx = forceIdx != null && !Number.isNaN(forceIdx) ? forceIdx : lastDup;
console.log('【读回】unique=', unique, '目标删 idx=', idx);

if (idx == null || idx < 0 || idx >= names.length) {
  console.log('【结果】无重复可删 / idx 无效');
  process.exit(0);
}

console.log(`【将要】修改选项 nth(${idx}) 打开重复卡`);
const mod = page.getByRole('button', { name: /修改选项|修改選項/ }).nth(idx);
await mod.scrollIntoViewIfNeeded();
await mod.click({ timeout: 10000 });
await sleep(2500);

// wait form ready
const nameVal = await page.locator('#name').inputValue({ timeout: 15000 }).catch(() => '');
console.log('【读回】#name=', nameVal.slice(0, 60) || '(empty)');

// Prefer option-form header 더 보기 (not timeslot 더 보기)
console.log('【将要】点表单 더 보기 菜单');
const moreCount = await page.locator('button[aria-label="더 보기"]').count();
console.log('【读回】더 보기 count=', moreCount);

// Prefer the topmost 더 보기 in form header (usually first, or highest y small)
let menuTexts = [];
if (moreCount > 0) {
  // click the first visible 더 보기 that is in upper half of viewport if possible
  const boxes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button[aria-label="더 보기"]')).map((b, i) => {
      const r = b.getBoundingClientRect();
      return { i, y: r.y, x: r.x, w: r.width, h: r.height, vis: r.width > 0 && r.height > 0 };
    }),
  );
  console.log('【读回】더 보기 boxes', boxes);
  // pick topmost visible (smallest y)
  const vis = boxes.filter((b) => b.vis).sort((a, b) => a.y - b.y);
  const pick = vis[0]?.i ?? 0;
  await page.locator('button[aria-label="더 보기"]').nth(pick).click({ timeout: 5000 });
  await sleep(800);
} else {
  // fallback text
  await page.getByText(/더 보기|更多/).first().click({ timeout: 3000 }).catch(() => {});
  await sleep(800);
}

menuTexts = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[role=menuitem], li, button, div, span, a'))
    .map((e) => (e.innerText || '').trim())
    .filter((t) => t && t.length < 30)
    .filter((t) => /删|刪|삭제|编辑|編輯|复制|複製|제거|remove|delete/i.test(t)),
);
console.log('【读回】菜单候选', menuTexts);

console.log('【将要】点 删除');
const delClicked = await page.evaluate(() => {
  const candidates = Array.from(
    document.querySelectorAll('[role=menuitem], button, li, div, span, a'),
  ).filter((e) => {
    const t = (e.innerText || '').trim();
    return (
      (t === '删除' ||
        t === '刪除' ||
        t === '삭제' ||
        t === '삭제하기' ||
        t === '删除选项' ||
        t === '刪除選項') &&
      e.getBoundingClientRect().width > 0
    );
  });
  // prefer leaf with shortest text
  candidates.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
  if (!candidates[0]) return { ok: false, n: 0 };
  candidates[0].click();
  return { ok: true, n: candidates.length, t: (candidates[0].innerText || '').trim() };
});
console.log('【读回】点删除', delClicked);
await sleep(1000);

// confirm dialog
console.log('【将要】确认删除对话框（若有）');
const conf = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button')).map((b) => ({
    t: (b.innerText || '').trim(),
    dis: b.disabled,
  }));
  const ok = Array.from(document.querySelectorAll('button')).find((b) => {
    const t = (b.innerText || '').trim();
    return (
      (/确定|確定|确认|確認|삭제|删除|刪除|예|是|OK/i.test(t) &&
        !/取消|消除|닫기|关闭/.test(t)) ||
      t === '삭제' ||
      t === '删除'
    );
  });
  if (ok) {
    ok.click();
    return { clicked: true, t: (ok.innerText || '').trim(), all: btns.slice(0, 20) };
  }
  return { clicked: false, all: btns.slice(0, 20) };
});
console.log('【读回】确认', conf);
await sleep(2000);
await dismiss(page);

// back to list
console.log('【将要】回选项列表验收');
await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
await dismiss(page);
const after = await listNames(page);
console.log(
  '【读回】删后 count=',
  after.length,
  after.map((x) => `${x.i}:${x.title.slice(0, 45)}`),
);

const ok = after.length === names.length - 1;
console.log(
  ok
    ? `【结果】PASS 删 1 张 ${names.length}→${after.length}`
    : `【结果】FAIL 期望 ${names.length - 1} 实 ${after.length}`,
);
console.log('未点提交审核');
process.exit(ok ? 0 : 2);
