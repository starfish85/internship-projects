/**
 * Deep dump of option cards in 编辑列表 mode — find real delete UI.
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = '7c220325-8783-4f58-a1dc-5fbfc4137a5e';
const url = `https://tour.triple.partners/product-management/registration/option?id=${ID}&status=UNPUBLISHED&lang=zh-tw`;

const { page } = await connectNolPage({
  selfHint: 'probe-edit2',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

await dismiss(page);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
await page.getByText(/^编辑列表$|^編輯列表$/).first().click();
await sleep(1500);

const dump = await page.evaluate(() => {
  // find card roots containing Korean option names
  const cards = [];
  const all = Array.from(document.querySelectorAll('div')).filter((d) => {
    const t = (d.innerText || '').trim();
    return /7인승|10인승/.test(t) && t.length > 30 && t.length < 400;
  });
  // take medium-size containers
  const seen = new Set();
  for (const d of all) {
    const t = d.innerText.replace(/\s+/g, ' ').trim().slice(0, 100);
    if (seen.has(t)) continue;
    const r = d.getBoundingClientRect();
    if (r.height < 40 || r.height > 200 || r.width < 200) continue;
    seen.add(t);
    const btns = Array.from(d.querySelectorAll('button, [role=button], a, svg')).map((b) => ({
      tag: b.tagName,
      t: (b.innerText || '').trim().slice(0, 40),
      al: b.getAttribute('aria-label') || b.getAttribute('title') || '',
      cls: (b.className || '').toString().slice(0, 50),
      html: b.outerHTML.slice(0, 250),
    }));
    cards.push({
      t,
      y: Math.round(r.y),
      h: Math.round(r.height),
      w: Math.round(r.width),
      btns,
      html: d.outerHTML.slice(0, 800),
    });
    if (cards.length >= 3) break;
  }

  // all buttons with any svg inside
  const svgBtns = Array.from(document.querySelectorAll('button')).filter((b) => b.querySelector('svg'));
  const svgInfo = svgBtns.map((b) => {
    const r = b.getBoundingClientRect();
    return {
      t: (b.innerText || '').trim().slice(0, 30),
      al: b.getAttribute('aria-label') || '',
      y: Math.round(r.y),
      x: Math.round(r.x),
      w: Math.round(r.width),
      h: Math.round(r.height),
      svg: b.querySelector('svg')?.outerHTML?.slice(0, 200),
      html: b.outerHTML.slice(0, 300),
    };
  });

  // search body for 삭제/删除 related after edit
  const bodySnip = (document.body.innerText || '').match(/.{0,20}(删|刪|삭제|제거|废弃).{0,20}/g);

  return { cards, svgInfo: svgInfo.slice(0, 40), bodySnip };
});

console.log(JSON.stringify(dump, null, 2));

// Also try: open option form and look for header menu specifically
await page.getByText(/^已編輯$|^已编辑$/).first().click({ timeout: 2000 }).catch(() => {});
await sleep(800);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2000);

// open first option, dump ALL 더 보기 and any menu with 삭제
await page.getByRole('button', { name: /修改选项/ }).nth(4).click();
await sleep(2500);

const formDump = await page.evaluate(() => {
  // scroll to top of form
  window.scrollTo(0, 0);
  const more = Array.from(document.querySelectorAll('button[aria-label="더 보기"], button')).filter((b) => {
    const al = b.getAttribute('aria-label') || '';
    const t = (b.innerText || '').trim();
    return al === '더 보기' || t === '⋯' || t === '...' || /更多|메뉴/.test(t + al);
  });
  const moreInfo = more.map((b, i) => {
    const r = b.getBoundingClientRect();
    // parent chain text
    let p = b.parentElement;
    let ptxt = '';
    for (let d = 0; d < 4 && p; d++) {
      ptxt += (p.innerText || '').slice(0, 40) + ' | ';
      p = p.parentElement;
    }
    return {
      i,
      al: b.getAttribute('aria-label'),
      y: r.y,
      x: r.x,
      ptxt: ptxt.slice(0, 120),
      html: b.outerHTML.slice(0, 200),
    };
  });

  // look for trash/delete in form header area (y < 300 after scroll)
  const topBtns = Array.from(document.querySelectorAll('button, [role=button]'))
    .map((b) => {
      const r = b.getBoundingClientRect();
      return {
        t: (b.innerText || '').trim().slice(0, 40),
        al: b.getAttribute('aria-label') || '',
        y: Math.round(r.y),
        x: Math.round(r.x),
        w: Math.round(r.width),
        h: Math.round(r.height),
        html: b.outerHTML.slice(0, 180),
      };
    })
    .filter((b) => b.y >= 0 && b.y < 350 && b.w > 0);

  return { moreInfo, topBtns };
});
console.log('FORM', JSON.stringify(formDump, null, 2));
process.exit(0);
