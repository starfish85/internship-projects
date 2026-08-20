/**
 * Delete last option with network listen + Playwright click (scroll into view).
 * usage: node delete-one-persist.mjs <draftId> <label>
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const id = process.argv[2];
const label = process.argv[3] || id?.slice(0, 8);
if (!id) process.exit(2);

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

const { page } = await connectNolPage({
  selfHint: 'del-persist',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const net = [];
page.on('response', async (res) => {
  const u = res.url();
  if (!/option|product|delete|remove|draft/i.test(u)) return;
  if (!/triple\.|partners/.test(u)) return;
  net.push({ status: res.status(), method: res.request().method(), url: u.slice(0, 180) });
});

await dismiss(page);
await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);

const before = await listTitles(page);
console.log('【读回】删前', before.length, before);

console.log('【将要】编辑列表');
await page.getByText(/^编辑列表$|^編輯列表$/).first().click();
await sleep(1200);

// locate delete icons by style via evaluate → mark data attr, then Playwright click
const marked = await page.evaluate(() => {
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
console.log('【读回】marked icons', marked);

const last = page.locator(`button[data-del-icon="${marked - 1}"]`);
console.log('【将要】scroll + Playwright click 末张删除图标');
await last.scrollIntoViewIfNeeded();
await sleep(400);
await last.click({ timeout: 10000 });
await sleep(2500);

// confirm if any
const confBtn = page.getByRole('button', { name: /^(删除|刪除|삭제|确定|確定|确认|確認)$/ });
if (await confBtn.count()) {
  console.log('【将要】确认对话框');
  await confBtn.last().click();
  await sleep(1500);
}

const mid = await listTitles(page);
console.log('【读回】点后', mid.length, mid);
console.log('【读回】network', net);

// try temp save
const temp = page.getByRole('button', { name: /^临时保存$|^臨時存儲$/ });
const tempDis = (await temp.count()) ? await temp.first().isDisabled() : null;
console.log('【读回】临时保存 disabled=', tempDis);
if (tempDis === false) {
  console.log('【将要】临时保存');
  await temp.first().click();
  await sleep(2500);
  console.log('【读回】network after save', net.slice(-10));
}

// exit edit
const done = page.getByText(/^已編輯$|^已编辑$/);
if (await done.count()) {
  await done.first().click().catch(() => {});
  await sleep(1000);
  // try temp save again outside edit
  if ((await temp.count()) && !(await temp.first().isDisabled())) {
    console.log('【将要】退出后临时保存');
    await temp.first().click();
    await sleep(2500);
  }
}

console.log('【读回】network final', net);

await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
const after = await listTitles(page);
console.log('【读回】刷新后', after.length, after);
console.log(
  after.length === before.length - 1
    ? `【结果】PASS ${before.length}→${after.length}`
    : `【结果】FAIL ${before.length}→${after.length}`,
);
console.log('未点提交审核');
process.exit(after.length === before.length - 1 ? 0 : 2);
