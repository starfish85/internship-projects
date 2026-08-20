import { chromium } from 'playwright';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
import { SPEC_CANCEL_KO } from './lib/transfer-audit-copy.mjs';
killPeerCdpScripts('fix-ky-tsh');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tour.triple.partners'));
await page.bringToFront();
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

async function fixOne(name, id) {
  console.log('====', name);
  await page.goto(`https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`, {waitUntil:'domcontentloaded', timeout:60000});
  await sleep(2500);
  await page.getByText(/^消除$/).first().click({timeout:400}).catch(()=>{});

  // dump cancel windows inputs
  const win = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select')).filter(el => /window|cancel|deadline|penalty|취소/i.test(el.name||el.id||''));
    return inputs.map(el => ({name: el.name, id: el.id, v: el.value, type: el.type, invalid: el.getAttribute('aria-invalid')}));
  });
  console.log('windows fields', JSON.stringify(win, null, 2));

  // remove blank cancel rows if any (delete buttons near cancel section)
  // fill windows.0 if empty
  await page.evaluate(() => {
    const d = document.querySelector('input[name="windows.0.deadline"], input[name*="windows.0"][name*="deadline"]');
    const p = document.querySelector('input[name="windows.0.penalty"], input[name*="windows.0"][name*="penalty"]');
    const set = (el, val) => {
      if (!el) return;
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      desc.set.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    if (d && !d.value) set(d, '2');
    if (p && (p.value === '' || p.value === undefined)) set(p, '0');
  });

  // delete windows.1 if present and empty
  await page.evaluate(() => {
    const d1 = document.querySelector('input[name="windows.1.deadline"]');
    if (d1 && !d1.value) {
      // click delete near second window
      const dels = Array.from(document.querySelectorAll('button')).filter(b => /删除|刪除|삭제|移除/.test(b.innerText||'') || b.getAttribute('aria-label')?.includes('delete'));
      // also try icon buttons
    }
  });

  // Fill cancel carefully with fill only (no Meta+A that might break)
  const loc = page.locator('textarea[name=specificCancelPolicy]');
  await loc.scrollIntoViewIfNeeded();
  await loc.click({ clickCount: 3 });
  await loc.fill(SPEC_CANCEL_KO);
  // dispatch input
  await page.evaluate((txt) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy]');
    const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    desc.set.call(ta, txt);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }, SPEC_CANCEL_KO);
  await loc.fill(SPEC_CANCEL_KO);
  await sleep(500);

  // poll enabled
  let en = false;
  for (let i = 0; i < 15; i++) {
    const st = page.locator('button').filter({ hasText: /^保存然后$/ }).first();
    const tmp = page.locator('button').filter({ hasText: /^临时保存$/ }).first();
    const a = await st.isEnabled().catch(() => false);
    const b = await tmp.isEnabled().catch(() => false);
    console.log('poll', i, 'saveThen', a, 'temp', b);
    if (a || b) { en = true; break; }
    // try fix common issues: min book day 3
    if (i === 3) {
      await page.locator('input[name=minimumPurchaseDay], input[name="minBookDay"]').fill('3').catch(()=>{});
    }
    if (i === 5) {
      // click 是（手动取消）
      await page.getByText('是（手动取消）').first().click().catch(()=>{});
    }
    if (i === 7) {
      // fill deadline/penalty via locator
      const d = page.locator('input[name="windows.0.deadline"]');
      if (await d.count()) { await d.fill('2'); }
      const p = page.locator('input[name="windows.0.penalty"]');
      if (await p.count()) { await p.fill('0'); }
    }
    if (i === 9) {
      // remove windows.1 empty - click 删除 on second cancel row
      await page.evaluate(() => {
        // find rows with empty deadline
        const d1 = document.querySelector('input[name="windows.1.deadline"]');
        if (!d1) return;
        let row = d1.closest('div');
        for (let k=0;k<8 && row;k++) {
          const btn = row.querySelector('button');
          if (btn) { btn.click(); return; }
          row = row.parentElement;
        }
      });
    }
    await sleep(600);
  }

  if (!en) {
    // force enable and click? no - dump more
    const body = await page.evaluate(() => document.body.innerText.slice(0, 5000));
    const reds = body.split('\n').filter(l => /请|必須|必须|红|未填|선택|입력/.test(l)).slice(0, 30);
    console.log('still disabled reds', reds);
  }

  const tmp = page.locator('button').filter({ hasText: /^临时保存$/ }).first();
  const st = page.locator('button').filter({ hasText: /^保存然后$/ }).first();
  if (await tmp.isEnabled().catch(()=>false)) {
    await tmp.click();
    await sleep(2500);
    console.log('temp clicked', page.url());
  }
  if (await st.isEnabled().catch(()=>false)) {
    await st.click();
    await sleep(2800);
    console.log('saveThen clicked', page.url());
  }

  await page.goto(`https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`, {waitUntil:'domcontentloaded', timeout:60000});
  await sleep(2200);
  const v = await page.locator('textarea[name=specificCancelPolicy]').inputValue();
  console.log('VERIFY', v.includes('예약 확정 후 취소'), v.slice(0, 60));
  return v.includes('예약 확정 후 취소');
}

const r1 = await fixOne('ky', '1653d003-b7ab-4056-9ec0-88870d305673');
const r2 = await fixOne('tsh', '72d8f629-815d-4d9c-a02f-e3cc1afe5fa7');
console.log({ r1, r2 });
process.exit(0);
