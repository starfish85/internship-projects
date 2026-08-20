import { chromium } from 'playwright';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
killPeerCdpScripts('dump-faq');
const id = '9dcef924-c7d9-41ea-8fe0-27a31dfe1064';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tour.triple.partners'));
await page.bringToFront();
await page.goto(`https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`, {waitUntil:'domcontentloaded', timeout:60000});
await page.waitForTimeout(2500);
await page.getByText(/^消除$/).first().click({timeout:500}).catch(()=>{});
const info = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
    tag: el.tagName, name: el.name, id: el.id, ph: el.placeholder||'', type: el.type||'',
    v: (el.value||'').slice(0,60),
    y: Math.round(el.getBoundingClientRect().y),
  })).filter(x => x.name || x.id || x.ph);
  // labels with FAQ
  const labels = Array.from(document.querySelectorAll('label,h2,h3,h4,div,span,p,button')).filter(e=>{
    const t=(e.innerText||'').trim();
    return t.length<40 && /FAQ|常见|常見|질문|问题|問答|faq/i.test(t);
  }).slice(0,20).map(e=>({t:(e.innerText||'').trim().slice(0,40), tag:e.tagName}));
  // specific cancel on intro? no
  return { inputs: inputs.slice(0,80), labels, bodyHasFAQ: /FAQ|常见问题|常見問題|자주 묻는/.test(document.body.innerText) };
});
console.log(JSON.stringify(info, null, 2));

// also regs cancel field
await page.goto(`https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`, {waitUntil:'domcontentloaded', timeout:60000});
await page.waitForTimeout(2000);
const regs = await page.evaluate(() => {
  const ta = document.querySelector('textarea[name=specificCancelPolicy]');
  const allTa = Array.from(document.querySelectorAll('textarea')).map(t=>({name:t.name,id:t.id,v:(t.value||'').slice(0,100),ph:t.placeholder||'', label: t.labels?.[0]?.innerText?.slice(0,40)}));
  // nearby labels 特殊
  const labels = Array.from(document.querySelectorAll('label,div,span,p,h3')).filter(e=>{
    const t=(e.innerText||'').trim();
    return t.length<30 && /特殊|取消|취소|취소 정책|특정/.test(t);
  }).slice(0,15).map(e=>(e.innerText||'').trim());
  return { ta: ta?ta.value.slice(0,120):null, allTa, labels };
});
console.log('REGS', JSON.stringify(regs, null, 2));
process.exit(0);
