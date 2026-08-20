import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const URLS = [
  'https://tour.triple.partners/product-management/products?status=UNPUBLISHED&lang=zh-tw',
  'https://tour.triple.partners/product-management/products?lang=zh-tw',
  'https://tour.triple.partners/product-management?lang=zh-tw',
];

const { page } = await connectNolPage({
  selfHint: 'dump-list',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

for (const u of URLS) {
  console.log('\nGOTO', u);
  await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => console.log('nav err', e.message));
  await sleep(3000);
  await dismiss(page);
  const info = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    body: (document.body?.innerText || '').slice(0, 800),
    buttons: Array.from(document.querySelectorAll('button'))
      .map((b) => (b.innerText || '').trim())
      .filter((t) => t && t.length < 30)
      .slice(0, 25),
    links: Array.from(document.querySelectorAll('a'))
      .map((a) => ({ t: (a.innerText || '').trim().slice(0, 40), h: a.getAttribute('href') || '' }))
      .filter((x) => x.t || /product/.test(x.h))
      .slice(0, 20),
  }));
  console.log(JSON.stringify(info, null, 2));
}
process.exit(0);
