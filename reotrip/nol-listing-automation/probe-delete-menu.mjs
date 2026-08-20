import { connectNolPage } from './lib/cdp-session.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = '7c220325-8783-4f58-a1dc-5fbfc4137a5e';
const { page } = await connectNolPage({
  selfHint: 'probe-del',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});
const url = `https://tour.triple.partners/product-management/registration/option?id=${ID}&status=UNPUBLISHED&lang=zh-tw`;
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2000);
await page.getByRole('button', { name: /修改选项/ }).nth(4).click();
await sleep(2500);
// click 더 보기
const more = page.locator('button[aria-label="더 보기"]');
console.log('more count', await more.count());
if (await more.count()) {
  await more.first().click();
  await sleep(800);
  const menu = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role=menuitem], li, button, div, span'))
      .map((e) => (e.innerText || '').trim())
      .filter((t) => t && t.length < 40)
      .filter((t) => /删|刪|삭제|remove|delete|제거|复制|複製|编辑|編輯/.test(t));
  });
  console.log('menu candidates', menu);
  // full menu text near
  const near = await page.evaluate(() => {
    const m = document.querySelector('[role=menu], [class*="menu"], [class*="Menu"], [class*="popover"], [class*="Popover"]');
    return m ? m.innerText.slice(0, 500) : document.body.innerText.slice(0, 300);
  });
  console.log('near', near);
}
// also search whole page for 删除 after more
const all = await page.evaluate(() =>
  Array.from(document.querySelectorAll('*'))
    .filter((e) => {
      const t = (e.innerText || '').trim();
      return e.children.length === 0 && t.length > 0 && t.length < 30 && /删除|刪除|삭제|제거/.test(t);
    })
    .map((e) => ({ t: e.innerText.trim(), tag: e.tagName })),
);
console.log('delete leaves', all);
process.exit(0);
