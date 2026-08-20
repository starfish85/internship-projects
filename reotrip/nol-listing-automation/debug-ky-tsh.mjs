import { chromium } from 'playwright';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
import { SPEC_CANCEL_KO } from './lib/transfer-audit-copy.mjs';
killPeerCdpScripts('dbg-ky');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tour.triple.partners'));
await page.bringToFront();
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

for (const [name,id] of [['ky','1653d003-b7ab-4056-9ec0-88870d305673'],['tsh','72d8f629-815d-4d9c-a02f-e3cc1afe5fa7']]) {
  console.log('\n====', name);
  await page.goto(`https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`, {waitUntil:'domcontentloaded', timeout:60000});
  await sleep(2500);
  await page.getByText(/^消除$/).first().click({timeout:400}).catch(()=>{});
  // dump buttons + invalids + red messages
  const ui = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).map(b=>{
      const r=b.getBoundingClientRect();
      return {t:(b.innerText||'').trim().slice(0,30), d:b.disabled, w:Math.round(r.width), y:Math.round(r.y)};
    }).filter(b=>b.t && (b.t.includes('保存')||b.t.includes('临时')||b.t.includes('提交')||b.t.includes('下')));
    const inv = Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(e=>({name:e.name, tag:e.tagName, v:(e.value||'').slice(0,40)}));
    const msgs = Array.from(document.querySelectorAll('div,span,p,li')).map(e=>(e.innerText||'').trim()).filter(t=>t.length>4&&t.length<100&&/必须|必須|请填|請|错误|红|未|须|invalid|대표|预约|預約/.test(t)).slice(0,20);
    return {btns, inv, msgs};
  });
  console.log(JSON.stringify(ui,null,2));
  // try fill cancel with type
  const loc = page.locator('textarea[name=specificCancelPolicy]');
  await loc.click();
  await page.keyboard.press('Meta+A');
  await page.keyboard.type(SPEC_CANCEL_KO, {delay:1});
  await loc.press('Tab');
  await loc.fill(SPEC_CANCEL_KO);
  console.log('after fill', (await loc.inputValue()).slice(0,40));
  // re-read buttons
  const btns2 = await page.evaluate(() => Array.from(document.querySelectorAll('button')).filter(b=>/保存|临时/.test(b.innerText||'')).map(b=>({t:(b.innerText||'').trim(), d:b.disabled})));
  console.log('btns after', btns2);
  // click any enabled 临时保存 or 保存然后
  for (const text of ['临时保存','保存然后','臨時存儲']) {
    const b = page.locator('button').filter({hasText: new RegExp('^'+text+'$')});
    const c = await b.count();
    for (let i=0;i<c;i++){
      const el = b.nth(i);
      if (await el.isEnabled()) {
        console.log('click', text, i);
        await el.click();
        await sleep(3000);
        console.log('url', page.url());
        break;
      }
    }
  }
  await page.goto(`https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`, {waitUntil:'domcontentloaded', timeout:60000});
  await sleep(2000);
  const v = await page.locator('textarea[name=specificCancelPolicy]').inputValue();
  console.log('VERIFY', v.includes('예약 확정 후 취소'), v.slice(0,50));
}
process.exit(0);
