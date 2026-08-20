import { connectNolPage } from './lib/cdp-session.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = process.argv[2] || '7c220325-8783-4f58-a1dc-5fbfc4137a5e'; // KIX
const { page } = await connectNolPage({
  selfHint: 'dump-opts',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});
const url = `https://tour.triple.partners/product-management/registration/option?id=${ID}&status=UNPUBLISHED&lang=zh-tw`;
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
const dump = await page.evaluate(() => {
  const cards = [];
  // try various card containers
  const mods = Array.from(document.querySelectorAll('button')).filter((b) =>
    /修改选项|修改選項/.test((b.innerText || '').trim()),
  );
  // for each mod button, walk up for card text and sibling buttons
  mods.forEach((btn, i) => {
    let n = btn;
    let card = null;
    for (let d = 0; d < 12 && n; d++) {
      if ((n.innerText || '').length > 30 && (n.innerText || '').length < 800) {
        card = n;
        break;
      }
      n = n.parentElement;
    }
    const root = card || btn.parentElement;
    const btns = Array.from(root.querySelectorAll('button')).map((b) => (b.innerText || '').trim()).filter(Boolean);
    const more = Array.from(root.querySelectorAll('[aria-label], button')).map((b) => ({
      t: (b.innerText || '').trim().slice(0, 40),
      al: b.getAttribute('aria-label') || '',
    }));
    cards.push({
      i,
      text: (root.innerText || '').replace(/\s+/g, ' ').slice(0, 120),
      btns,
      more: more.slice(0, 15),
    });
  });
  // all buttons with delete-ish text
  const delish = Array.from(document.querySelectorAll('button, a, span, div[role=button]'))
    .map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim())
    .filter((t) => t && t.length < 30 && /删|刪|삭제|remove|delete|더 보기|更多|⋯|\.\.\./i.test(t));
  return { cardCount: mods.length, cards, delish: [...new Set(delish)].slice(0, 30) };
});
console.log(JSON.stringify(dump, null, 2));
process.exit(0);
