/**
 * Delete one option: 编辑列表 → click icon-delete.svg button on card → verify count.
 * usage: node delete-one-icon.mjs <draftId> <label> [cardIndex]
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const id = process.argv[2];
const label = process.argv[3] || id?.slice(0, 8);
const forceIdx = process.argv[4] != null ? Number(process.argv[4]) : null;
if (!id) {
  console.error('usage: node delete-one-icon.mjs <id> <label> [idx]');
  process.exit(2);
}

function optionUrl(draftId) {
  return `https://tour.triple.partners/product-management/registration/option?id=${draftId}&status=UNPUBLISHED&lang=zh-tw`;
}

async function listNames(page) {
  return page.evaluate(() => {
    // Prefer title text nodes with 인승
    const titles = Array.from(document.querySelectorAll('div')).filter((d) => {
      const t = (d.innerText || '').trim();
      return (
        d.children.length === 0 &&
        /인승/.test(t) &&
        t.length > 15 &&
        t.length < 120 &&
        /출발|편도/.test(t)
      );
    });
    if (titles.length) {
      return titles.map((el, i) => ({ i, title: el.innerText.trim() }));
    }
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
      return { i, title: title.trim() };
    });
  });
}

async function deleteIcons(page) {
  // buttons whose background is icon-delete.svg
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const cs = getComputedStyle(b);
        const r = b.getBoundingClientRect();
        return {
          i,
          bg: cs.backgroundImage || '',
          y: r.y,
          w: r.width,
          h: r.height,
          t: (b.innerText || '').trim(),
        };
      })
      .filter((x) => /icon-delete|delete\.svg/i.test(x.bg) && x.w > 0)
      .sort((a, b) => a.y - b.y),
  );
}

const { page } = await connectNolPage({
  selfHint: 'del-icon',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

console.log(`【将要】打开 ${label}`);
await dismiss(page);
await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
await dismiss(page);

const before = await listNames(page);
console.log(
  '【读回】删前',
  before.length,
  before.map((x) => `${x.i}:${x.title.slice(0, 45)}`),
);

console.log('【将要】点 编辑列表');
const editBtn = page.getByText(/^编辑列表$|^編輯列表$/);
if (!(await editBtn.count())) {
  console.log('【结果】FAIL 无编辑列表');
  process.exit(2);
}
await editBtn.first().click();
await sleep(1200);

const icons = await deleteIcons(page);
console.log('【读回】delete图标数', icons.length, icons.map((x) => Math.round(x.y)));

if (!icons.length) {
  console.log('【结果】FAIL 无 icon-delete 按钮');
  process.exit(2);
}

const idx = forceIdx != null && !Number.isNaN(forceIdx) ? forceIdx : icons.length - 1;
console.log(`【将要】删除第 ${idx} 张 (共${icons.length})`);

// click via evaluate matching icon-delete bg, sorted by y
const clickR = await page.evaluate((targetIdx) => {
  const icons = Array.from(document.querySelectorAll('button'))
    .map((b) => {
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return { b, bg: cs.backgroundImage || '', y: r.y, w: r.width };
    })
    .filter((x) => /icon-delete|delete\.svg/i.test(x.bg) && x.w > 0)
    .sort((a, b) => a.y - b.y);
  if (!icons[targetIdx]) return { ok: false, n: icons.length };
  icons[targetIdx].b.click();
  return { ok: true, n: icons.length, y: icons[targetIdx].y };
}, idx);
console.log('【读回】click', clickR);
await sleep(2000);

// optional confirm
await page.evaluate(() => {
  const ok = Array.from(document.querySelectorAll('button')).find((b) => {
    const t = (b.innerText || '').trim();
    return (/^删除$|^刪除$|^삭제$|^确定$|^確定$|^确认$|^確認$/).test(t);
  });
  ok?.click();
});
await sleep(1000);

// mid-state count (no reload)
const mid = await listNames(page);
console.log(
  '【读回】点后未刷新',
  mid.length,
  mid.map((x) => x.title.slice(0, 40)),
);

// try 临时保存 if enabled
const temp = page.getByRole('button', { name: /^临时保存$|^臨時存儲$/ });
if (await temp.count()) {
  const dis = await temp.first().isDisabled().catch(() => true);
  console.log('【读回】临时保存 disabled=', dis);
  if (!dis) {
    console.log('【将要】点 临时保存');
    await temp.first().click();
    await sleep(2000);
  }
}

// exit edit mode
const done = page.getByText(/^已編輯$|^已编辑$/);
if (await done.count()) {
  console.log('【将要】退出编辑 点 已編輯');
  await done.first().click().catch(() => {});
  await sleep(1000);
}

// reload verify
console.log('【将要】刷新列表验收');
await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
await dismiss(page);
const after = await listNames(page);
console.log(
  '【读回】删后',
  after.length,
  after.map((x) => `${x.i}:${x.title.slice(0, 45)}`),
);

const ok = after.length === before.length - 1;
console.log(
  ok
    ? `【结果】PASS ${before.length}→${after.length}`
    : `【结果】FAIL 期望${before.length - 1} 实${after.length}`,
);
console.log('未点提交审核');
process.exit(ok ? 0 : 2);
