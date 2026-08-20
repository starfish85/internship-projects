import { chromium } from 'playwright';
import { killPeerCdpScripts } from './lib/cdp-session.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
killPeerCdpScripts('hq-dump');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('tour.triple.partners'));
await page.bringToFront();
console.log('url', page.url());
const d = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input,select,textarea')).map(el => ({
    tag: el.tagName,
    type: el.type,
    name: el.name,
    id: el.id,
    value: (el.value || '').slice(0, 40),
    checked: el.checked,
    disabled: el.disabled,
  })).filter(x => x.name || x.id).slice(0, 80);
  const body = document.body.innerText;
  // sections
  const sections = {};
  for (const key of ['购买数量', '确认', '取消', '包含', '代表预约', '凭证', '保存然后']) {
    const i = body.indexOf(key);
    sections[key] = i >= 0 ? body.slice(i, i + 120).replace(/\s+/g, ' ') : null;
  }
  const saveBtn = Array.from(document.querySelectorAll('button')).find(b => /保存然后/.test(b.innerText||''));
  return { inputs, sections, saveDisabled: saveBtn?.disabled, btnTexts: Array.from(document.querySelectorAll('button')).map(b=>b.innerText.trim()).filter(t=>t&&t.length<30).slice(0,40) };
});
console.log(JSON.stringify(d, null, 2).slice(0, 8000));
process.exit(0);
