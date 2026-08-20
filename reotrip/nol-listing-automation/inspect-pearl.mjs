import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
console.log('URL:', page.url());

// Close any open modal first by Escape
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

const state = await page.evaluate(() => {
  const t = document.body.innerText;
  // Look for selected chips near sections
  const sections = {};
  const lines = t.split('\n').map((s) => s.trim()).filter(Boolean);

  // Find red/error colored elements
  const redMsgs = [];
  document.querySelectorAll('p, span, div, li').forEach((el) => {
    if (el.children.length > 3) return;
    const cs = getComputedStyle(el);
    const color = cs.color;
    const txt = (el.innerText || '').trim();
    if (!txt || txt.length > 80) return;
    // red-ish
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      const r = +m[1], g = +m[2], b = +m[3];
      if (r > 180 && g < 100 && b < 100) redMsgs.push(txt);
    }
  });

  // buttons
  const buttons = Array.from(document.querySelectorAll('button'))
    .map((b) => ({
      text: (b.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      disabled: b.disabled,
    }))
    .filter((b) => b.text)
    .slice(0, 40);

  // selected theme/lang chips - look for remove buttons or selected tags near labels
  const near = [];
  for (let i = 0; i < lines.length; i++) {
    if (/类别|主题|进度语言|选择语言|地区和地点|私人|司机|韩语|韓語|기사|东方|동방|保存然后|保存然後|临时保存/.test(lines[i])) {
      near.push(`[${i}] ${lines[i]}`);
      if (lines[i + 1]) near.push(`    + ${lines[i + 1]}`);
      if (lines[i + 2]) near.push(`    + ${lines[i + 2]}`);
    }
  }

  // inputs checked
  const checked = Array.from(document.querySelectorAll('input[type=checkbox], input[type=radio]'))
    .filter((i) => i.checked)
    .map((i) => ({
      name: i.name,
      value: i.value,
      label: (i.closest('label')?.innerText || i.parentElement?.innerText || '').replace(/\s+/g, ' ').slice(0, 50),
    }));

  return {
    redMsgs: [...new Set(redMsgs)].slice(0, 20),
    buttons,
    near: near.slice(0, 50),
    checked,
    title: document.querySelector('input[name=title], textarea[name=title]')?.value ||
      document.querySelector('input')?.value,
  };
});

console.log(JSON.stringify(state, null, 2));
process.exit(0);
