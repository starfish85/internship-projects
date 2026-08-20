import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('data', { recursive: true });

const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const page = pages.find((p) => (p.url() || '').includes('supplier.viator.com/products'));
if (!page) process.exit(1);

const info = await page.evaluate(() => {
  const resources = performance.getEntriesByType('resource').map((e) => ({
    name: e.name,
    type: e.initiatorType,
    dur: Math.round(e.duration),
    size: e.transferSize,
  }));
  const interesting = resources.filter((r) =>
    /api|graphql|product|supplier|v1|v2|json/i.test(r.name) || r.type === 'xmlhttprequest' || r.type === 'fetch'
  );
  const listRoot = document.querySelector('[class*="ProductList"], ul, [class*="productList"]');
  const htmlTail = listRoot ? listRoot.innerHTML.slice(-2500) : '';
  const footerish = [...document.querySelectorAll('[class*="pagination"], [class*="Pagination"], [class*="LoadMore"], [class*="pageSize"], select')]
    .map((el) => ({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 140), text: (el.innerText || '').trim().slice(0, 120), html: el.outerHTML.slice(0, 300) }));
  const countEls = [...document.querySelectorAll('span, div, p')].filter((el) => /^\d+\s+products?/i.test((el.innerText || '').trim()))
    .map((el) => ({ text: el.innerText.trim(), cls: (el.className || '').toString().slice(0, 140) }));
  return {
    url: location.href,
    interesting: interesting.slice(0, 80),
    resourceCount: resources.length,
    countEls,
    footerish,
    itemCount: document.querySelectorAll('li[class*="ProductListItem__productListItem"]').length,
    htmlTail,
  };
});

console.log(JSON.stringify({
  url: info.url,
  itemCount: info.itemCount,
  countEls: info.countEls,
  footerish: info.footerish,
  interestingCount: info.interesting.length,
}, null, 2));
console.log('\nINTERESTING URLS');
for (const r of info.interesting) console.log(r.type, r.size, r.name.slice(0, 250));
fs.writeFileSync('data/probe-viator-resources.json', JSON.stringify(info, null, 2));
console.log('\nHTML TAIL\n', info.htmlTail.slice(-1500));
process.exit(0);
