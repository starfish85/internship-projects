/**
 * Fill Oriental Pearl introduction page: copy + 3 thumbs + NONE schedule → 保存然后
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IMG_DIR = '/Users/mac/nol/upload-ready-images/shanghai-oriental-pearl';
const IMAGES = ['oriental-pearl-1.jpg', 'oriental-pearl-2.jpg', 'oriental-pearl-3.jpg'].map((f) =>
  path.join(IMG_DIR, f),
);

const HEADLINE = '상하이 시내 호텔 ↔ 동방명주탑 편도 전용 차량으로 여유로운 이동을 즐기세요!';
const HIGHLIGHT = [
  '상하이 시내 호텔에서 동방명주탑까지 단독 차량으로 편안하게 이동',
  '대중교통 환승 없이 빠르고 쾌적한 전용 픽업 서비스',
  '숙련된 기사님의 안전하고 친절한 응대',
].join('\n');
const INTRO = `이 서비스는 상하이 시내 호텔과 동방명주탑(Oriental Pearl Tower) 사이의 편도 전용 차량 이동 서비스입니다.
편안하고 프라이빗한 차량과 숙련된 기사님이 함께하여, 지하철 환승이나 택시 이용 없이 목적지까지 빠르고 쾌적하게 이동하실 수 있습니다.

포함 사항:
- 상하이 시내 호텔 ↔ 동방명주탑 편도 전용 차량 서비스 1회
- 차량 및 기사 요금 포함으로, 별도 추가 요금 없음

예약 시간에 맞춰 고객님 숙소 또는 약속 장소에서 픽업
숙련된 전문 기사님의 안전하고 친절한 서비스 제공

가족, 커플, 소규모 그룹 등 동방명주탑을 방문하시는 분들께 적합합니다.
지금 바로 예약하고, 복잡한 교통 걱정 없이 상하이 야경과 타워 일정을 여유롭게 즐겨보세요!`;

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
console.log('URL', page.url());
await page.bringToFront().catch(() => {});

if (!page.url().includes('/introduction')) {
  console.log('not on intro — abort');
  process.exit(1);
}

// Dump fields
const fields = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('input, textarea').forEach((el, i) => {
    const r = el.getBoundingClientRect();
    out.push({
      i,
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      ph: el.placeholder,
      val: (el.value || '').slice(0, 40),
      y: Math.round(r.y),
      h: Math.round(r.height),
      vis: r.width > 0 && r.y > -2000,
    });
  });
  return out;
});
console.log('fields', JSON.stringify(fields, null, 2));

async function setReact(selector, value) {
  await page.evaluate(
    ({ selector, value }) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    { selector, value },
  );
}

// Fill by name if possible
const nameMap = {
  headline: HEADLINE,
  highlight: HIGHLIGHT,
  description: INTRO,
  // sometimes different names
  oneLine: HEADLINE,
  summary: HIGHLIGHT,
};

for (const [name, val] of Object.entries(nameMap)) {
  const ok = await page.evaluate(
    ({ name, val }) => {
      const el = document.querySelector(`[name="${name}"]`);
      if (!el) return false;
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    { name, val },
  );
  console.log(`name=${name}`, ok);
}

// Fill by placeholder / nearby labels using Playwright fill
async function fillNearLabel(labelRe, value) {
  // Find label text, then nearest input/textarea
  const ok = await page.evaluate(
    ({ labelRe, value }) => {
      const re = new RegExp(labelRe);
      const all = Array.from(document.querySelectorAll('label, h2, h3, h4, p, span, div'));
      let labelEl = null;
      for (const el of all) {
        const t = (el.innerText || '').trim();
        if (t.length > 40) continue;
        if (re.test(t)) {
          labelEl = el;
          break;
        }
      }
      if (!labelEl) return 'no-label';
      // search following inputs
      let root = labelEl.closest('section, [class*="Field"], [class*="field"], form, div') || labelEl.parentElement;
      for (let depth = 0; depth < 6 && root; depth++) {
        const field = root.querySelector('textarea, input[type=text], input:not([type])');
        if (field) {
          const proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(field, value);
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
          return `filled in depth ${depth} name=${field.name} ph=${field.placeholder}`;
        }
        root = root.parentElement;
      }
      return 'no-field';
    },
    { labelRe, value },
  );
  console.log(`label ${labelRe}:`, ok);
  return ok;
}

// headline / 一行宣传文案
await fillNearLabel('一行宣传文案|一行宣傳|한 줄|卖点标题|賣點', HEADLINE);
// if input with placeholder
const hl = page.locator('input[placeholder*="促销"], input[placeholder*="宣傳"], input[placeholder*="한 줄"], input[placeholder*="卖点"], textarea[placeholder*="促销"]').first();
if ((await hl.count()) > 0) {
  await hl.fill(HEADLINE);
  console.log('filled headline via placeholder');
}

// three line summary
await fillNearLabel('三行摘要|3행|三行', HIGHLIGHT);
const sum = page.locator('textarea').filter({ hasText: '' }).first();
// fill textareas by order of visible ones with content checks
const areas = page.locator('textarea:visible');
const ac = await areas.count();
console.log('visible textareas', ac);
if (ac >= 1) {
  // try to identify by placeholder / nearby
  for (let i = 0; i < ac; i++) {
    const a = areas.nth(i);
    const ph = (await a.getAttribute('placeholder')) || '';
    const name = (await a.getAttribute('name')) || '';
    const box = await a.boundingBox();
    console.log(`  ta[${i}] name=${name} ph=${ph.slice(0, 40)} y=${box?.y}`);
  }
}

// Smarter fill: map by placeholder keywords
await page.evaluate(
  ({ headline, highlight, intro }) => {
    const set = (el, val) => {
      if (!el) return;
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    // all text inputs + textareas
    const fields = [...document.querySelectorAll('input[type=text], input:not([type]), textarea')];
    for (const el of fields) {
      const ph = (el.placeholder || '') + (el.name || '') + (el.id || '');
      const near = (el.closest('div')?.innerText || '').slice(0, 80);
      const key = ph + near;
      if (/一行|促销文案|卖点标题|한 줄|headline/i.test(key) && el.tagName === 'INPUT') set(el, headline);
      else if (/三行|摘要|하이라이트|highlight|summary/i.test(key)) set(el, highlight);
      else if (/产品介绍|產品介紹|소개|description|填写产品介绍/i.test(key) && el.tagName === 'TEXTAREA') set(el, intro);
    }
    // fallback: first short input empty -> headline; first textarea -> highlight; second -> intro
    const inputs = fields.filter((f) => f.tagName === 'INPUT' && f.getBoundingClientRect().width > 100);
    const textareas = fields.filter((f) => f.tagName === 'TEXTAREA' && f.getBoundingClientRect().width > 100);
    if (inputs[0] && !inputs[0].value) set(inputs[0], headline);
    // prefer empty textareas
    const emptyTa = textareas.filter((t) => !t.value || t.value.length < 5);
    if (emptyTa[0]) set(emptyTa[0], highlight);
    if (emptyTa[1]) set(emptyTa[1], intro);
    else if (textareas[1]) set(textareas[1], intro);
  },
  { headline: HEADLINE, highlight: HIGHLIGHT, intro: INTRO },
);
console.log('filled copy via evaluate');
await sleep(500);

// Verify values
const vals = await page.evaluate(() => {
  return {
    inputs: Array.from(document.querySelectorAll('input[type=text], input:not([type])')).map((el) => ({
      name: el.name,
      ph: el.placeholder,
      val: (el.value || '').slice(0, 50),
    })),
    textareas: Array.from(document.querySelectorAll('textarea')).map((el) => ({
      name: el.name,
      ph: (el.placeholder || '').slice(0, 40),
      len: (el.value || '').length,
      head: (el.value || '').slice(0, 40),
    })),
  };
});
console.log('vals', JSON.stringify(vals, null, 2));

// Schedule NONE
await page.evaluate(() => {
  const el = Array.from(document.querySelectorAll('label, div, span, button, input')).find((e) => {
    const t = (e.innerText || e.value || '').trim();
    return /没有单独的时间表|沒有單獨的時間表|시간표가 없습니다|NONE/.test(t) && t.length < 40;
  });
  if (el) {
    el.click();
    return el.innerText || el.value;
  }
  // radio value NONE
  const r = document.querySelector('input[value=NONE], input[value="NONE"]');
  if (r) {
    r.click();
    return 'radio NONE';
  }
  return null;
}).then((r) => console.log('schedule', r));
await sleep(400);

// Upload images to first file input (썸네일)
const existing = IMAGES.filter((f) => fs.existsSync(f));
console.log('images', existing);
const fileInputs = page.locator('input[type=file][accept*="image"]');
const fc = await fileInputs.count();
console.log('file inputs', fc);
if (fc > 0 && existing.length) {
  // first input is 썸네일 per skill
  try {
    await fileInputs.first().setInputFiles(existing);
    console.log('uploaded 3 via setInputFiles');
    await sleep(6000);
  } catch (e) {
    console.log('multi fail', e.message);
    for (const img of existing) {
      await fileInputs.first().setInputFiles(img);
      console.log('uploaded', path.basename(img));
      await sleep(3000);
    }
  }
}

// Count thumbs in 缩略图 section
const thumbs = await page.evaluate(() => {
  const imgs = Array.from(document.querySelectorAll('img')).filter((img) => {
    const r = img.getBoundingClientRect();
    return r.width > 40 && r.height > 40 && /blob:|http|data:/.test(img.src);
  });
  return { count: imgs.length, srcs: imgs.slice(0, 6).map((i) => i.src.slice(0, 60)) };
});
console.log('thumbs', thumbs);

// red errors
const red = await page.evaluate(() => {
  const redMsgs = [];
  document.querySelectorAll('p, span, div').forEach((el) => {
    if (el.children.length > 2) return;
    const cs = getComputedStyle(el);
    const m = cs.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const txt = (el.innerText || '').trim();
    if (!txt || txt.length > 80) return;
    if (m && +m[1] > 180 && +m[2] < 100 && +m[3] < 100) redMsgs.push(txt);
  });
  const saveThen = Array.from(document.querySelectorAll('button')).find((b) => /保存然后|保存然後/.test(b.innerText || ''));
  return { redMsgs: [...new Set(redMsgs)], saveThenDisabled: saveThen?.disabled };
});
console.log('state', red);

if (!red.saveThenDisabled) {
  await page.getByRole('button', { name: /保存然后|保存然後/ }).click();
  console.log('clicked 保存然后');
  await sleep(3000);
  console.log('AFTER', page.url());
} else {
  console.log('保存然后 still disabled — dump missing');
  // try fill more aggressively with Playwright type
  const body = await page.locator('body').innerText();
  console.log(body.slice(0, 1500));
}

process.exit(0);
