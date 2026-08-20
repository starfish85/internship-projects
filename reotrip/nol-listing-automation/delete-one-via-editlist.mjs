/**
 * Delete one option via 编辑列表 icon buttons (20×20 empty buttons).
 * usage: node delete-one-via-editlist.mjs <draftId> <label> [cardIndex]
 *   cardIndex: which icon to click (default last)
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const id = process.argv[2];
const label = process.argv[3] || id?.slice(0, 8);
const forceIdx = process.argv[4] != null ? Number(process.argv[4]) : null;
if (!id) {
  console.error('usage: node delete-one-via-editlist.mjs <id> <label> [idx]');
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
    // also try cards by 可销售
    if (!mods.length) {
      const sales = Array.from(document.querySelectorAll('div,span')).filter((e) =>
        /^(可销售|可供出售|판매중)$/.test((e.innerText || '').trim()),
      );
      return sales.map((el, i) => {
        let n = el.parentElement;
        let text = '';
        for (let d = 0; d < 8 && n; d++) {
          const t = (n.innerText || '').replace(/\s+/g, ' ').trim();
          if (t.length > 30 && t.length < 400) {
            text = t;
            break;
          }
          n = n.parentElement;
        }
        const title =
          text.match(/[\uac00-\ud7af].{8,90}(?:차량|차량\)|이동)/)?.[0] || text.slice(0, 80);
        return { i, title: title.trim() };
      });
    }
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

async function enterEditList(page) {
  // 编辑列表 may already be a visible toggle DIV next to 注册/添加选项
  const before = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll('button')).filter((b) => {
        const r = b.getBoundingClientRect();
        return !b.innerText?.trim() && r.width >= 16 && r.width <= 28 && r.height >= 16 && r.height <= 28;
      }).length,
  );
  console.log('【读回】小图标钮 before', before);

  const editList = page.getByText(/^编辑列表$|^編輯列表$/);
  if (await editList.count()) {
    console.log('【将要】点 编辑列表');
    await editList.first().click({ timeout: 5000 });
    await sleep(1200);
  } else {
    console.log('【结果】FAIL 无 编辑列表 文案');
    return 0;
  }

  // After enter, button may become 已編輯 / 完成编辑 — dump
  const toggleText = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('div,button,span,a')).filter((e) => {
      const t = (e.innerText || '').trim();
      return /编辑列表|已編輯|已编辑|完成|완료|編輯列表/.test(t) && t.length < 20;
    });
    return els.map((e) => (e.innerText || '').trim()).slice(0, 10);
  });
  console.log('【读回】toggle文案', toggleText);

  const icons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        return {
          i,
          t: (b.innerText || '').trim(),
          al: b.getAttribute('aria-label') || '',
          cls: (b.className || '').toString().slice(0, 40),
          y: Math.round(r.y),
          x: Math.round(r.x),
          w: Math.round(r.width),
          h: Math.round(r.height),
          html: b.outerHTML.slice(0, 220),
        };
      })
      .filter((b) => b.w >= 16 && b.w <= 32 && b.h >= 16 && b.h <= 32 && !b.t),
  );
  console.log('【读回】编辑态小图标', JSON.stringify(icons, null, 2));
  return icons;
}

const { page } = await connectNolPage({
  selfHint: 'del-editlist',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

console.log(`【将要】打开 ${label} 列表`);
await dismiss(page);
await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
await dismiss(page);

const before = await listNames(page);
console.log(
  '【读回】删前',
  before.length,
  before.map((x) => `${x.i}:${x.title.slice(0, 40)}`),
);

const icons = await enterEditList(page);
if (!icons.length) {
  console.log('【结果】FAIL 编辑列表无小图标');
  process.exit(2);
}

const idx = forceIdx != null && !Number.isNaN(forceIdx) ? forceIdx : icons.length - 1;
console.log(`【将要】点第 ${idx} 个删除图标 (共${icons.length}) html=`, icons[idx]?.html?.slice(0, 120));

// click by nth among empty 16-32px buttons, sorted by y
const clickR = await page.evaluate((targetIdx) => {
  const icons = Array.from(document.querySelectorAll('button'))
    .map((b) => {
      const r = b.getBoundingClientRect();
      return { b, y: r.y, w: r.width, h: r.height, t: (b.innerText || '').trim() };
    })
    .filter((x) => !x.t && x.w >= 16 && x.w <= 32 && x.h >= 16 && x.h <= 32 && x.y > 100)
    .sort((a, b) => a.y - b.y);
  if (!icons[targetIdx]) return { ok: false, n: icons.length };
  icons[targetIdx].b.click();
  return { ok: true, n: icons.length, y: icons[targetIdx].y };
}, idx);
console.log('【读回】click icon', clickR);
await sleep(1000);

// confirm dialog
const conf = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('button')).map((b) => ({
    t: (b.innerText || '').trim(),
    dis: b.disabled,
  }));
  // dialog buttons: prefer exact 删除/确定 that is not page footer
  const candidates = Array.from(document.querySelectorAll('button')).filter((b) => {
    const t = (b.innerText || '').trim();
    const r = b.getBoundingClientRect();
    return r.width > 40 && /确定|確定|确认|確認|删除|刪除|삭제|예|是|OK/i.test(t) && !/取消|消除/.test(t);
  });
  // prefer ones with 删除/삭제 in dialog
  candidates.sort((a, b) => {
    const score = (el) => {
      const t = (el.innerText || '').trim();
      if (/^删除$|^刪除$|^삭제$/.test(t)) return 0;
      if (/确定|確認|确认/.test(t)) return 1;
      return 2;
    };
    return score(a) - score(b);
  });
  if (candidates[0]) {
    const t = (candidates[0].innerText || '').trim();
    candidates[0].click();
    return { clicked: true, t, all: all.filter((x) => x.t).slice(0, 25) };
  }
  // also check role=dialog text
  const dlg = document.querySelector('[role=dialog], [class*="Modal"], [class*="modal"], [class*="Dialog"]');
  return {
    clicked: false,
    all: all.filter((x) => x.t).slice(0, 25),
    dlg: dlg ? (dlg.innerText || '').slice(0, 300) : null,
  };
});
console.log('【读回】确认', conf);
await sleep(2000);
await dismiss(page);

// exit edit mode if needed - click 已編輯 / 完成
await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('div,button,span,a')).find((e) => {
    const t = (e.innerText || '').trim();
    return t === '已編輯' || t === '已编辑' || t === '完成' || t === '编辑列表' || t === '編輯列表';
  });
  el?.click();
});
await sleep(800);

await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
await dismiss(page);
const after = await listNames(page);
console.log(
  '【读回】删后',
  after.length,
  after.map((x) => `${x.i}:${x.title.slice(0, 40)}`),
);
const ok = after.length === before.length - 1;
console.log(ok ? `【结果】PASS ${before.length}→${after.length}` : `【结果】FAIL 期望${before.length - 1} 实${after.length}`);
console.log('未点提交审核');
process.exit(ok ? 0 : 2);
