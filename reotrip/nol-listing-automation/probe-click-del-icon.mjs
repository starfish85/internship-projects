/**
 * Click edit-list icon (sc-hjsuWn) on last card and dump full UI after.
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = '7c220325-8783-4f58-a1dc-5fbfc4137a5e';
const url = `https://tour.triple.partners/product-management/registration/option?id=${ID}&status=UNPUBLISHED&lang=zh-tw`;

const { page } = await connectNolPage({
  selfHint: 'probe-click-del',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

await dismiss(page);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);
await page.getByText(/^编辑列表$|^編輯列表$/).first().click();
await sleep(1500);

// Use Playwright locator for the icon buttons - class sc-hjsuWn
const icons = page.locator('button.sc-hjsuWn');
const n = await icons.count();
console.log('icon count', n);

// dump computed style / background of first icon to understand
const style = await page.evaluate(() => {
  const b = document.querySelector('button.sc-hjsuWn');
  if (!b) return null;
  const cs = getComputedStyle(b);
  return {
    bg: cs.backgroundImage,
    w: cs.width,
    h: cs.height,
    content: cs.content,
    after: getComputedStyle(b, '::after').content,
    before: getComputedStyle(b, '::before').backgroundImage || getComputedStyle(b, '::before').content,
    html: b.outerHTML,
    parentHTML: b.parentElement?.outerHTML?.slice(0, 500),
  };
});
console.log('ICON_STYLE', JSON.stringify(style, null, 2));

// click LAST icon via locator
console.log('【将要】click last sc-hjsuWn icon');
await icons.nth(n - 1).click({ timeout: 5000 });
await sleep(1500);

const after = await page.evaluate(() => {
  const body = (document.body.innerText || '').slice(0, 2500);
  const btns = Array.from(document.querySelectorAll('button, [role=button], a'))
    .map((b) => {
      const r = b.getBoundingClientRect();
      return {
        t: (b.innerText || '').trim().slice(0, 60),
        al: b.getAttribute('aria-label') || '',
        y: Math.round(r.y),
        x: Math.round(r.x),
        w: Math.round(r.width),
        h: Math.round(r.height),
        dis: b.disabled,
        vis: r.width > 0 && r.height > 0 && csVis(b),
      };
    })
    .filter((b) => b.vis && (b.t || b.al));
  function csVis(el) {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }
  // dialogs / portals
  const portals = Array.from(document.querySelectorAll('[role=dialog], [class*="Modal"], [class*="Popup"], [class*="Toast"], [class*="portal"], [class*="Portal"]')).map(
    (el) => ({
      cls: (el.className || '').toString().slice(0, 80),
      t: (el.innerText || '').slice(0, 400),
    }),
  );
  // any fixed/absolute high z-index overlays
  const overlays = Array.from(document.querySelectorAll('div')).filter((d) => {
    const cs = getComputedStyle(d);
    const z = parseInt(cs.zIndex, 10);
    return (cs.position === 'fixed' || cs.position === 'absolute') && z > 10 && d.innerText?.trim();
  }).slice(0, 15).map((d) => ({
    z: getComputedStyle(d).zIndex,
    t: (d.innerText || '').slice(0, 200),
    cls: (d.className || '').toString().slice(0, 60),
  }));
  return { body, btns: btns.slice(0, 50), portals, overlays };
});
console.log('AFTER_CLICK', JSON.stringify(after, null, 2));

// try right-click or hover on icon?
process.exit(0);
