/**
 * Delete duplicate option cards via 编辑列表 mode.
 * Keeps first occurrence of each unique option name; deletes later dups.
 * usage: node delete-dup-options.mjs <draftId> [label]
 *        node delete-dup-options.mjs --all
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PRODUCTS = [
  { id: '7c220325-8783-4f58-a1dc-5fbfc4137a5e', label: 'KIX' },
  { id: '09714a30-dc94-4378-a238-ed8a37a5d234', label: '东京站' },
  { id: '0de15895-41de-48f8-8653-5c47a947c301', label: '东京港' },
  { id: 'c36c1517-89cc-4524-bfdb-fce8df1c2e5c', label: '大阪站' },
];

function optionUrl(id) {
  return `https://tour.triple.partners/product-management/registration/option?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
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
      // extract option title line (usually after 可销售)
      const m = text.match(/(?:可销售|可供出售|판매중)\s*(.+?)(?:\s{2}|$)/);
      // better: first long Korean-ish line
      const lines = text.split(/(?=\s)/).join(' ');
      const title =
        text.match(
          /[\uac00-\ud7af].{10,80}(?:차량|차량\))/,
        )?.[0] ||
        text.slice(0, 80);
      return { i, title: title.trim(), text: text.slice(0, 100) };
    });
  });
}

async function enterEditList(page) {
  // click 더 보기 then 编辑列表
  const more = page.locator('button[aria-label="더 보기"]');
  if (await more.count()) {
    await more.first().click();
    await sleep(600);
  } else {
    // try text
    await page.getByText(/더 보기|更多/).first().click({ timeout: 2000 }).catch(() => {});
    await sleep(500);
  }
  // 编辑列表
  const editList = page.getByText(/^编辑列表$|^編輯列表$|^편집 목록$/);
  if (await editList.count()) {
    await editList.first().click();
  } else {
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('button,div,span,li,a')).find((e) =>
        /编辑列表|編輯列表|편집/.test((e.innerText || '').trim()),
      );
      el?.click();
    });
  }
  await sleep(1200);
  // confirm delete buttons visible
  const n = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll('button,div,span')).filter(
        (e) => (e.innerText || '').trim() === '删除' || (e.innerText || '').trim() === '刪除',
      ).length,
  );
  return n;
}

async function exitEditList(page) {
  // click 完成 / 完成编辑 / 더 보기 again / Escape
  const done = page.getByText(/^完成$|^完成编辑$|^完成編輯$|^완료$/);
  if (await done.count()) {
    await done.first().click().catch(() => {});
    await sleep(800);
  }
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(500);
  // if still in edit mode, click 더 보기 / 编辑列表 toggle
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button,div,span')).find((e) =>
      /完成|완료|结束编辑|結束編輯|退出/.test((e.innerText || '').trim()),
    );
    el?.click();
  });
  await sleep(800);
}

async function deleteNthDeleteButton(page, deleteIndex) {
  // click the Nth 删除 in edit list (0-based among delete buttons)
  const r = await page.evaluate((idx) => {
    const dels = Array.from(document.querySelectorAll('button,div,span,a')).filter((e) => {
      const t = (e.innerText || '').trim();
      return (t === '删除' || t === '刪除' || t === '삭제') && e.getBoundingClientRect().width > 0;
    });
    // prefer clickable leaf that is button-like
    const targets = dels.filter((e) => e.tagName === 'BUTTON' || e.getAttribute('role') === 'button' || e.onclick);
    const list = targets.length ? targets : dels;
    if (!list[idx]) return { ok: false, n: list.length };
    list[idx].click();
    return { ok: true, n: list.length, text: (list[idx].innerText || '').trim() };
  }, deleteIndex);
  await sleep(800);
  // confirm dialog if any
  await page.evaluate(() => {
    const ok = Array.from(document.querySelectorAll('button')).find((b) => {
      const t = (b.innerText || '').trim();
      return /确定|確認|确认|删除|刪除|예|OK|是/.test(t) && !/取消|消除/.test(t);
    });
    ok?.click();
  });
  await sleep(1500);
  // dismiss leave if any
  await page.getByText(/^消除$/).first().click({ timeout: 500 }).catch(() => {});
  return r;
}

async function dedupeProduct(page, { id, label }) {
  console.log(`\n======== 删重复 ${label} ${id.slice(0, 8)} ========`);
  await dismiss(page);
  await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  await dismiss(page);

  let names = await listNames(page);
  console.log(
    '【读回】删前',
    names.length,
    names.map((x) => x.title.slice(0, 50)),
  );

  // find duplicate indices to delete (keep first of each title key)
  const seen = new Map();
  const toDelete = []; // indices from end
  names.forEach((x, i) => {
    // normalize key: strip 可销售, collapse spaces, for osaka strip 신오사카 already
    const key = x.title
      .replace(/可销售|可供出售|판매중/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 70);
    if (seen.has(key)) toDelete.push(i);
    else seen.set(key, i);
  });
  console.log('【将要】删除 index', toDelete, '保留 unique', seen.size);

  if (!toDelete.length) {
    console.log('【结果】无重复');
    return { label, id, before: names.length, after: names.length, deleted: 0 };
  }

  // delete from highest index to lowest so indices stay valid
  const sorted = [...toDelete].sort((a, b) => b - a);
  for (const idx of sorted) {
    // re-enter list page clean
    await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2000);
    await dismiss(page);

    // recompute names and map which delete button corresponds
    names = await listNames(page);
    // if idx out of range after previous deletes, skip
    if (idx >= names.length) {
      console.log('skip stale idx', idx);
      continue;
    }
    const title = names[idx]?.title;
    console.log(`【将要】删除 opt${idx}`, title?.slice(0, 50));

    const delCount = await enterEditList(page);
    console.log('【读回】编辑列表 删除钮数', delCount);
    if (delCount === 0) {
      console.log('【结果】FAIL 无删除钮');
      continue;
    }
    // In edit mode, delete buttons usually align 1:1 with options order
    const r = await deleteNthDeleteButton(page, idx);
    console.log('【结果】click delete', r);
    await exitEditList(page);
    await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2000);
    const after = await listNames(page);
    console.log('【读回】现有', after.length, after.map((x) => x.title.slice(0, 40)));
  }

  await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2000);
  const final = await listNames(page);
  console.log('【结果】删后', final.length, final.map((x) => x.title.slice(0, 50)));
  return { label, id, before: names.length, after: final.length, remaining: final.map((x) => x.title) };
}

const { page } = await connectNolPage({
  selfHint: 'delete-dups',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const args = process.argv.slice(2);
let jobs = PRODUCTS;
if (args[0] && args[0] !== '--all' && !args[0].startsWith('-')) {
  // single id
  jobs = [{ id: args[0], label: args[1] || args[0].slice(0, 8) }];
}

const results = [];
for (const j of jobs) {
  try {
    results.push(await dedupeProduct(page, j));
  } catch (e) {
    console.log('ERR', j.label, e.message);
    results.push({ label: j.label, err: String(e.message).slice(0, 200) });
  }
}
console.log('\nSUMMARY', JSON.stringify(results, null, 2));
console.log('未点提交审核');
process.exit(0);
