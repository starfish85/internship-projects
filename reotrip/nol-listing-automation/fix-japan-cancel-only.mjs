import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
import { SPEC_CANCEL_KO, fillSpecCancel, FAQ_MIDSTOP_Q, FAQ_MIDSTOP_A, fillTransferFaqs } from './lib/transfer-audit-copy.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ONLY = process.argv.slice(2).filter(a=>!a.startsWith('-'));
const WITH_FAQ = process.argv.includes('--faq');

function loadAll() {
  const out = [];
  for (const f of fs.readdirSync(__dir)) {
    const m = f.match(/^\.([a-z0-9]+)-draft-id$/);
    if (!m) continue;
    const prefix = m[1];
    if (ONLY.length && !ONLY.includes(prefix)) continue;
    // skip china-ish
    if (['sha','pvg','hq','wsk','dwp','pr','popland','huangpu'].includes(prefix)) continue;
    const id = fs.readFileSync(path.join(__dir, f), 'utf8').trim();
    if (id.length > 20) out.push({ prefix, id });
  }
  return out;
}

const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
async function dismiss(page){
  await page.getByText(/^消除$/).first().click({timeout:500}).catch(()=>{});
}
async function saveThen(page){
  const btn = page.locator('button').filter({hasText:/^保存然后$/}).first();
  await btn.scrollIntoViewIfNeeded().catch(()=>{});
  for (let i=0;i<10;i++){
    if (await btn.isEnabled().catch(()=>false)) break;
    await sleep(300);
  }
  if (!(await btn.isEnabled().catch(()=>false))) return {ok:false, reason:'disabled'};
  await btn.click();
  await sleep(2500);
  return {ok:true, url: page.url()};
}

killPeerCdpScripts('fix-cancel');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tour.triple.partners'));
if (!page) { console.error('NO PAGE'); process.exit(2); }
await page.bringToFront();
page.setDefaultTimeout(28000);
page.setDefaultNavigationTimeout(60000);

const list = loadAll();
console.log('【将要】cancel'+(WITH_FAQ?'+faq':'')+' 修复', list.length, '个');
const results=[];

for (const d of list) {
  const row = { prefix: d.prefix, id: d.id };
  console.log('\n---', d.prefix, d.id.slice(0,8));
  try {
    if (WITH_FAQ) {
      await page.goto(`https://tour.triple.partners/product-management/registration/introduction?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`, {waitUntil:'domcontentloaded', timeout:60000});
      await sleep(1800); await dismiss(page);
      const hl = await page.locator('#headline').inputValue().catch(()=>'');
      if (!hl) { row.skip='no headline'; results.push(row); console.log('skip'); continue; }
      const faqExist = await page.evaluate((q)=>{
        const el=document.querySelector('input[name="faqs.0.question"]');
        return el && (el.value||'').includes(q.slice(0,10));
      }, FAQ_MIDSTOP_Q);
      if (!faqExist) {
        console.log('【将要】FAQ');
        let rb = await fillTransferFaqs(page);
        if (!rb.ok) {
          await page.getByText(/添加问答|添加問答/).first().click({timeout:2000}).catch(()=>{});
          await sleep(400);
          await page.locator('input[name="faqs.0.question"]').fill(FAQ_MIDSTOP_Q).catch(()=>{});
          await page.locator('textarea[name="faqs.0.answer"]').fill(FAQ_MIDSTOP_A).catch(()=>{});
        }
        const sav = await saveThen(page);
        console.log('【结果】faq save', sav);
        row.faqSave = sav;
      } else {
        console.log('【结果】FAQ already ok');
        row.faqAlready = true;
      }
    }

    await page.goto(`https://tour.triple.partners/product-management/registration/regulations?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`, {waitUntil:'domcontentloaded', timeout:60000});
    await sleep(2000); await dismiss(page);
    const cur = await page.locator('textarea[name=specificCancelPolicy]').inputValue().catch(()=>'');
    if (cur.includes('예약 확정 후 취소') && cur.includes('환불 가능하며')) {
      console.log('【结果】cancel already ok');
      row.cancelAlready = true;
      row.status = 'PASS';
      results.push(row);
      continue;
    }
    console.log('【将要】写特殊条款');
    const fill = await fillSpecCancel(page);
    console.log('【结果】fill', fill);
    const sav = await saveThen(page);
    console.log('【结果】save', sav);
    // verify reopen
    await page.goto(`https://tour.triple.partners/product-management/registration/regulations?id=${d.id}&status=UNPUBLISHED&lang=zh-tw`, {waitUntil:'domcontentloaded', timeout:60000});
    await sleep(1800);
    const after = await page.locator('textarea[name=specificCancelPolicy]').inputValue().catch(()=>'');
    row.cancelOk = after.includes('예약 확정 후 취소') && after.includes('환불 가능하며');
    row.status = row.cancelOk ? 'PASS' : 'FAIL';
    console.log('【结果】', row.status, after.slice(0,40));
  } catch(e) {
    row.status='ERR'; row.error=String(e.message||e).slice(0,200);
    console.log('ERR', row.error);
  }
  results.push(row);
  fs.writeFileSync(path.join(__dir,'fix-japan-cancel-results.json'), JSON.stringify(results,null,2));
}

const pass = results.filter(r=>r.status==='PASS').length;
console.log('\nPASS', pass, '/', results.length);
for (const r of results) console.log(`[${r.status}] ${r.prefix}`, r.cancelAlready?'already':'', r.error||'');
console.log('未点提交审核');
process.exit(0);
