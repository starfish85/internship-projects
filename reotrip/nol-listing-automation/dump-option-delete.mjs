import { connectNolPage } from './lib/cdp-session.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = '7c220325-8783-4f58-a1dc-5fbfc4137a5e';
const { page } = await connectNolPage({
  selfHint: 'dump-del',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});
const url = `https://tour.triple.partners/product-management/registration/option?id=${ID}&status=UNPUBLISHED&lang=zh-tw`;
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2000);
// open last option (duplicate)
await page.getByRole('button', { name: /修改选项/ }).nth(4).click();
await sleep(2500);
const dump = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('button, a, [role=button], span'));
  const texts = all
    .map((e) => ({
      tag: e.tagName,
      t: (e.innerText || '').trim().slice(0, 50),
      al: e.getAttribute('aria-label') || '',
      title: e.getAttribute('title') || '',
    }))
    .filter((x) => x.t || x.al || x.title)
    .filter((x) => /删|刪|삭제|remove|delete|更多|더 보기|⋯|\.\.\.|제거|废弃|停用|关闭/i.test(x.t + x.al + x.title));
  // also footer buttons
  const foot = Array.from(document.querySelectorAll('button'))
    .map((b) => (b.innerText || '').trim())
    .filter((t) => t && t.length < 40);
  return { texts, foot: [...new Set(foot)].slice(0, 40), bodyHasDelete: /删除选项|刪除選項|删除此|삭제/.test(document.body.innerText || '') };
});
console.log(JSON.stringify(dump, null, 2));
// try aria more menu on list without opening - go back
await page.keyboard.press('Escape');
await sleep(500);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2000);
// inspect card DOM structure for icons without text
const icons = await page.evaluate(() => {
  const mods = Array.from(document.querySelectorAll('button')).filter((b) => /修改选项/.test(b.innerText || ''));
  const last = mods[mods.length - 1];
  let root = last;
  for (let i = 0; i < 10 && root; i++) {
    if ((root.querySelectorAll('button').length || 0) >= 2 && (root.innerText || '').length > 40) break;
    root = root.parentElement;
  }
  const html = root ? root.innerHTML.slice(0, 2000) : '';
  const svgBtns = Array.from(root?.querySelectorAll('button, [role=button]') || []).map((b) => ({
    t: (b.innerText || '').trim(),
    al: b.getAttribute('aria-label') || '',
    cls: (b.className || '').toString().slice(0, 80),
    html: b.outerHTML.slice(0, 200),
  }));
  return { svgBtns, htmlSnippet: html.slice(0, 1500) };
});
console.log('icons', JSON.stringify(icons, null, 2));
process.exit(0);
