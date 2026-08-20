/**
 * Delete all duplicate option cards via 编辑列表 + icon-delete (Playwright click + wait API).
 * usage: node delete-all-dups.mjs <draftId> <label>
 *        node delete-all-dups.mjs --all
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

function optionUrl(draftId) {
  return `https://tour.triple.partners/product-management/registration/option?id=${draftId}&status=UNPUBLISHED&lang=zh-tw`;
}

async function listTitles(page) {
  return page.evaluate(() => {
    function isTitle(t) {
      return (
        t.length > 15 &&
        t.length < 90 &&
        /편도 이동 \(\d+인승 차량\)$/.test(t) &&
        !/도착|최대|수하물/.test(t)
      );
    }
    const titles = Array.from(document.querySelectorAll('div'))
      .filter((d) => d.children.length === 0)
      .map((d) => (d.innerText || '').trim())
      .filter(isTitle);
    const out = [];
    for (const t of titles) if (out[out.length - 1] !== t) out.push(t);
    return out;
  });
}

function findDups(titles) {
  const seen = new Map();
  const dups = [];
  titles.forEach((t, i) => {
    const key = t.replace(/\s+/g, ' ').trim();
    if (seen.has(key)) dups.push(i);
    else seen.set(key, i);
  });
  return { dups, unique: seen.size };
}

async function enterEditList(page) {
  if (await page.getByText(/^已編輯$|^已编辑$/).count()) return true;
  const editBtn = page.getByText(/^编辑列表$|^編輯列表$/);
  if (!(await editBtn.count())) return false;
  await editBtn.first().click();
  await sleep(1200);
  return true;
}

async function markDeleteIcons(page) {
  return page.evaluate(() => {
    // clear old
    document.querySelectorAll('button[data-del-icon]').forEach((b) => b.removeAttribute('data-del-icon'));
    const icons = Array.from(document.querySelectorAll('button'))
      .map((b) => {
        const cs = getComputedStyle(b);
        const r = b.getBoundingClientRect();
        return { b, bg: cs.backgroundImage || '', y: r.y, w: r.width };
      })
      .filter((x) => /icon-delete|delete\.svg/i.test(x.bg) && x.w > 0)
      .sort((a, b) => a.y - b.y);
    icons.forEach((x, i) => x.b.setAttribute('data-del-icon', String(i)));
    return icons.length;
  });
}

async function deleteLastIcon(page, productId) {
  const n = await markDeleteIcons(page);
  if (!n) return { ok: false, reason: 'no icons' };
  const idx = n - 1;
  const loc = page.locator(`button[data-del-icon="${idx}"]`);

  // wait for delete API
  const delWait = page
    .waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        /\/options\/delete/.test(res.url()) &&
        res.status() < 400,
      { timeout: 15000 },
    )
    .catch(() => null);

  await loc.scrollIntoViewIfNeeded();
  await sleep(300);
  await loc.click({ timeout: 10000 });

  // confirm if present
  await sleep(500);
  const conf = page.getByRole('button', { name: /^(删除|刪除|삭제|确定|確定|确认|確認)$/ });
  if (await conf.count()) {
    await conf.last().click().catch(() => {});
  }

  const res = await delWait;
  await sleep(800);
  return {
    ok: !!res || true, // UI may still update; verify by count
    api: res ? `${res.status()} ${res.url().slice(-60)}` : 'no-api-within-15s',
    iconN: n,
    idx,
  };
}

async function dedupeProduct(page, { id, label }) {
  console.log(`\n======== ${label} ${id.slice(0, 8)} ========`);
  await dismiss(page);
  await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  await dismiss(page);

  let titles = await listTitles(page);
  const start = titles.length;
  console.log('【读回】删前', start, titles);

  let deleted = 0;
  for (let round = 0; round < 12; round++) {
    titles = await listTitles(page);
    const { dups, unique } = findDups(titles);
    console.log(`【读回】r${round} n=${titles.length} unique=${unique} dups=${JSON.stringify(dups)}`);
    if (!dups.length) {
      console.log('【结果】无更多重复');
      break;
    }

    console.log('【将要】编辑列表 + 删末张', titles[titles.length - 1]);
    if (!(await enterEditList(page))) {
      console.log('【结果】FAIL 无编辑列表');
      break;
    }

    const r = await deleteLastIcon(page, id);
    console.log('【读回】delete', r);

    const mid = await listTitles(page);
    console.log('【读回】点后', mid.length, mid.map((t) => t.slice(0, 40)));

    if (mid.length >= titles.length) {
      // retry once with longer wait
      console.log('【结果】count 未降，等 API 再读');
      await sleep(2000);
      const mid2 = await listTitles(page);
      console.log('【读回】再读', mid2.length);
      if (mid2.length >= titles.length) {
        console.log('【结果】FAIL 删除未生效，停');
        break;
      }
    }
    deleted++;

    // exit edit then reload to confirm persist
    const done = page.getByText(/^已編輯$|^已编辑$/);
    if (await done.count()) {
      await done.first().click().catch(() => {});
      await sleep(800);
    }
    await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2200);
    await dismiss(page);

    const afterReload = await listTitles(page);
    console.log('【读回】刷新后', afterReload.length, afterReload.map((t) => t.slice(0, 40)));
    if (afterReload.length !== mid.length && afterReload.length > mid.length) {
      console.log('【结果】WARN 刷新回弹 mid=', mid.length, 'reload=', afterReload.length);
    }
  }

  const final = await listTitles(page);
  const { unique } = findDups(final);
  const pass = final.length === unique;
  console.log(
    pass ? `【结果】PASS ${label} ${start}→${final.length}` : `【结果】FAIL ${label} ${start}→${final.length} unique=${unique}`,
    final,
  );
  return { label, id, before: start, after: final.length, unique, deleted, titles: final, pass };
}

const { page } = await connectNolPage({
  selfHint: 'delete-all-dups',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const args = process.argv.slice(2);
let jobs = PRODUCTS;
if (args[0] && args[0] !== '--all') {
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
process.exit(results.some((r) => r.err || r.pass === false) ? 2 : 0);
