import { chromium } from 'playwright';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
const DRAFT = '4128217a-55af-44c6-bbdc-f028eddd7535';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
killPeerCdpScripts('hq-dump');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('tour.triple.partners')) || browser.contexts()[0].pages()[0];
await page.bringToFront();
page.setDefaultTimeout(20000);
console.log('url', page.url());
const d = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input[name=tourTypes]')).map(i => ({
    value: i.value, checked: i.checked, id: i.id, type: i.type,
    aria: i.getAttribute('aria-checked'),
    rect: (() => { const r = i.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })(),
  }));
  const labels = Array.from(document.querySelectorAll('label')).filter(l => /私人|团体|團體|私人的|단체/.test(l.innerText||'')).map(l => ({
    for: l.getAttribute('for'), t: (l.innerText||'').trim().slice(0,80),
    cls: (l.className||'').toString().slice(0,60),
    rect: (() => { const r = l.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })(),
  }));
  // broader search
  const els = Array.from(document.querySelectorAll('div,span,label,p')).filter(e => {
    const t = (e.innerText||'').trim();
    return /^私人/.test(t) && t.length < 50;
  }).slice(0,10).map(e => ({
    tag: e.tagName, t: e.innerText.trim().slice(0,50),
    role: e.getAttribute('role'),
    rect: (() => { const r = e.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; })(),
  }));
  const bodyIdx = document.body.innerText.indexOf('团体');
  const snip = bodyIdx>=0 ? document.body.innerText.slice(bodyIdx, bodyIdx+200) : document.body.innerText.slice(0,200);
  return { inputs, labels, els, snip: snip.replace(/\s+/g,' ') };
});
console.log(JSON.stringify(d, null, 2));
process.exit(0);
