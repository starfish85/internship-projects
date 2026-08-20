/**
 * Probe list-level 더 보기 → 编辑列表 UI for delete controls (icons/text).
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = process.argv[2] || '7c220325-8783-4f58-a1dc-5fbfc4137a5e';
const url = `https://tour.triple.partners/product-management/registration/option?id=${ID}&status=UNPUBLISHED&lang=zh-tw`;

const { page } = await connectNolPage({
  selfHint: 'probe-edit-list',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

await dismiss(page);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
await dismiss(page);

// dump top-area more buttons (y < 400)
const topMore = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('button, [role=button], a'));
  return all
    .map((b, i) => {
      const r = b.getBoundingClientRect();
      return {
        i,
        t: (b.innerText || '').trim().slice(0, 40),
        al: b.getAttribute('aria-label') || '',
        y: Math.round(r.y),
        x: Math.round(r.x),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    })
    .filter((b) => b.y >= 0 && b.y < 500 && b.w > 0 && (b.al || b.t));
});
console.log('TOP_BTNS', JSON.stringify(topMore, null, 2));

// click any list-level more (aria 더 보기 with y small, or near 注册/添加选项)
console.log('【将要】找列表顶 더 보기 / 编辑列表入口');
const moreBoxes = await page.evaluate(() =>
  Array.from(document.querySelectorAll('button[aria-label="더 보기"]')).map((b, i) => {
    const r = b.getBoundingClientRect();
    return { i, y: r.y, x: r.x, w: r.width, h: r.height };
  }),
);
console.log('MORE_BOXES', moreBoxes);

// Try click 注册/添加选项 sibling more, or getByText 编辑列表 if already visible
const editListVis = await page.getByText(/^编辑列表$|^編輯列表$/).count();
console.log('editListVis before', editListVis);

if (moreBoxes.length) {
  // prefer topmost
  const sorted = [...moreBoxes].sort((a, b) => a.y - b.y);
  console.log('click more idx', sorted[0].i, 'y', sorted[0].y);
  await page.locator('button[aria-label="더 보기"]').nth(sorted[0].i).click();
  await sleep(800);
}

const afterMore = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[role=menuitem], li, button, div, span, a'))
    .map((e) => {
      const r = e.getBoundingClientRect();
      return {
        t: (e.innerText || '').trim().slice(0, 40),
        y: Math.round(r.y),
        w: Math.round(r.width),
        tag: e.tagName,
      };
    })
    .filter((x) => x.t && x.t.length < 40 && x.w > 0 && x.y > 0 && x.y < 800)
    .filter((x) => /编辑|編輯|删|刪|삭제|列表|목록|顺序|順序|등록|添加/.test(x.t))
    .slice(0, 40),
);
console.log('MENU_AFTER_MORE', JSON.stringify(afterMore, null, 2));

// click 编辑列表
const el = page.getByText(/^编辑列表$|^編輯列表$|^편집 목록$/);
if (await el.count()) {
  console.log('【将要】点 编辑列表');
  await el.first().click();
  await sleep(1500);
} else {
  console.log('no exact 编辑列表 text, try evaluate');
  await page.evaluate(() => {
    const n = Array.from(document.querySelectorAll('button,div,span,li,a')).find((e) =>
      /^编辑列表$|^編輯列表$/.test((e.innerText || '').trim()),
    );
    n?.click();
  });
  await sleep(1500);
}

// dump ALL interactive in option cards area
const editMode = await page.evaluate(() => {
  const body = (document.body.innerText || '').slice(0, 200);
  const dels = Array.from(document.querySelectorAll('button, [role=button], a, svg, path, i, span, div'))
    .map((e) => {
      const r = e.getBoundingClientRect();
      const t = (e.innerText || e.textContent || '').trim().slice(0, 30);
      const al = e.getAttribute('aria-label') || e.getAttribute('title') || '';
      return {
        tag: e.tagName,
        t,
        al,
        cls: (e.className || '').toString().slice(0, 60),
        y: Math.round(r.y),
        x: Math.round(r.x),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    })
    .filter((x) => x.w > 0 && x.h > 0 && x.y > 80 && x.y < 2000)
    .filter(
      (x) =>
        /删|刪|삭제|remove|delete|trash|close|×|✕|제거|드래그|drag|排序|순서|icon/i.test(
          x.t + x.al + x.cls,
        ) ||
        (x.w <= 40 && x.h <= 40 && x.tag === 'BUTTON'),
    );
  // also all small buttons near 修改选项
  const mods = Array.from(document.querySelectorAll('button')).filter((b) =>
    /修改选项|修改選項/.test((b.innerText || '').trim()),
  );
  const near = mods.map((btn, i) => {
    let root = btn;
    for (let d = 0; d < 8 && root; d++) root = root.parentElement;
    const btns = Array.from(root?.querySelectorAll('button, [role=button]') || []).map((b) => {
      const r = b.getBoundingClientRect();
      return {
        t: (b.innerText || '').trim().slice(0, 30),
        al: b.getAttribute('aria-label') || '',
        cls: (b.className || '').toString().slice(0, 50),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        html: b.outerHTML.slice(0, 180),
      };
    });
    return { i, nearBtns: btns };
  });
  return { bodyHead: body, delCandidates: dels.slice(0, 50), nearCards: near };
});
console.log('EDIT_MODE', JSON.stringify(editMode, null, 2));

// also count text 删除
const delText = await page.evaluate(
  () =>
    Array.from(document.querySelectorAll('*'))
      .filter((e) => {
        const t = (e.innerText || '').trim();
        return e.children.length === 0 && (t === '删除' || t === '刪除' || t === '삭제');
      })
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { t: e.innerText.trim(), y: r.y, w: r.width, tag: e.tagName, parent: e.parentElement?.tagName };
      }),
);
console.log('DEL_TEXT_LEAVES', delText);

process.exit(0);
