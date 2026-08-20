import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const pages = browser.contexts().flatMap((context) => context.pages());
const page = pages.find((candidate) => candidate.url().includes('tour.triple.partners/product-management/registration')) ?? pages[2];
await page.bringToFront();
await page.waitForLoadState('domcontentloaded');
const target = process.argv[2];
if (target === 'media') {
  const media = await page.evaluate(() => Array.from(document.querySelectorAll('img')).map((img, i) => {
    const r = img.getBoundingClientRect();
    return {
      i,
      alt: img.alt,
      src: img.currentSrc || img.src,
      w: Math.round(r.width),
      h: Math.round(r.height),
      x: Math.round(r.x),
      y: Math.round(r.y),
      visible: r.width > 0 && r.height > 0 && getComputedStyle(img).display !== 'none',
    };
  }).filter((img) => img.visible).slice(0, 120));
  console.log(JSON.stringify(media, null, 2));
  await browser.close();
  process.exit(0);
}
if (target === 'confirm-ok') {
  const ok = page.getByText('確定', { exact: true });
  const n = await ok.count();
  console.log('ok count', n);
  if (n) await ok.nth(n - 1).click();
  await page.waitForTimeout(1500);
  console.log((await page.locator('body').innerText()).slice(0, 8000));
  await browser.close();
  process.exit(0);
}
if (target === 'inspect-narita-card') {
  const data = await page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const text = '도쿄 시내 호텔 ↔ 나리타공항(NRT) 단독 차량 편도 이동 서비스';
    window.scrollTo(0, 0);
    const hits = Array.from(document.querySelectorAll('body *')).filter((el) => visible(el) && (el.innerText || '').includes(text));
    return hits.slice(0, 20).map((el) => {
      const r = el.getBoundingClientRect();
      const buttons = Array.from(el.querySelectorAll('button')).filter(visible).map((b) => {
        const br = b.getBoundingClientRect();
        return {
          text: (b.innerText || '').trim(),
          aria: b.getAttribute('aria-label'),
          x: Math.round(br.x),
          y: Math.round(br.y),
          w: Math.round(br.width),
          h: Math.round(br.height),
        };
      });
      const links = Array.from(el.querySelectorAll('a')).filter(visible).map((a) => {
        const ar = a.getBoundingClientRect();
        return {
          text: (a.innerText || '').trim(),
          href: a.href,
          x: Math.round(ar.x),
          y: Math.round(ar.y),
          w: Math.round(ar.width),
          h: Math.round(ar.height),
        };
      });
      const clickables = Array.from(el.querySelectorAll('a,button,[role="button"]')).filter(visible).map((c) => {
        const cr = c.getBoundingClientRect();
        return {
          tag: c.tagName,
          role: c.getAttribute('role'),
          text: (c.innerText || '').trim(),
          aria: c.getAttribute('aria-label'),
          href: c.href || null,
          x: Math.round(cr.x),
          y: Math.round(cr.y),
          w: Math.round(cr.width),
          h: Math.round(cr.height),
        };
      });
      return {
        tag: el.tagName,
        className: String(el.className),
        text: (el.innerText || '').slice(0, 1000),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        buttons,
        links,
        clickables,
      };
    });
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
  process.exit(0);
}
if (target === 'goto-old-narita') {
  await page.goto('https://tour.triple.partners/product-management/registration/properties?id=60557c54-6c11-4b0e-9e04-df85c0d3e78b&status=UNPUBLISHED&lang=zh-tw');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1800);
  const data = await page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const field = (el, i) => ({
      i,
      tag: el.tagName,
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      placeholder: el.getAttribute('placeholder'),
      aria: el.getAttribute('aria-label'),
      value: el.value,
      checked: el.checked,
      text: el.innerText?.slice(0, 120),
      rect: (() => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      })(),
    });
    return {
      title: document.title,
      url: location.href,
      text: document.body.innerText.slice(0, 20000),
      inputs: Array.from(document.querySelectorAll('input, textarea, select')).filter(visible).slice(0, 160).map(field),
      buttons: Array.from(document.querySelectorAll('button')).filter(visible).slice(0, 160).map(field),
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
  process.exit(0);
}
if (target) {
  await page.getByText(target, { exact: true }).click();
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(1500);
}
if (process.argv[3] === 'media') {
  const media = await page.evaluate(() => Array.from(document.querySelectorAll('img')).map((img, i) => {
    const r = img.getBoundingClientRect();
    return {
      i,
      alt: img.alt,
      src: img.currentSrc || img.src,
      w: Math.round(r.width),
      h: Math.round(r.height),
      x: Math.round(r.x),
      y: Math.round(r.y),
      visible: r.width > 0 && r.height > 0 && getComputedStyle(img).display !== 'none',
    };
  }).filter((img) => img.visible).slice(0, 80));
  console.log(JSON.stringify(media, null, 2));
  await browser.close();
  process.exit(0);
}
const data = await page.evaluate(() => {
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const field = (el, i) => ({
    i,
    tag: el.tagName,
    type: el.getAttribute('type'),
    name: el.getAttribute('name'),
    placeholder: el.getAttribute('placeholder'),
    aria: el.getAttribute('aria-label'),
    value: el.value,
    checked: el.checked,
    text: el.innerText?.slice(0, 120),
    rect: (() => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    })(),
  });
  return {
    title: document.title,
    url: location.href,
    text: document.body.innerText.slice(0, 24000),
    inputs: Array.from(document.querySelectorAll('input, textarea, select')).filter(visible).slice(0, 120).map(field),
    buttons: Array.from(document.querySelectorAll('button')).filter(visible).slice(0, 120).map(field),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
