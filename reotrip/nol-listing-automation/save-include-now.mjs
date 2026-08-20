/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Focus: get include modal to actually 保存 and close.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TR = '상하이 시내 호텔 ↔ 동방명주탑 편도 전용 차량 이동 및 주차비 포함';
const PU = '픽업/샌딩 서비스 및 주차비 포함';
const EX = '가이드, 팁, 동방명주탑 티켓, 개인 비용, 아동용 카시트, 야간 할증, 추가 경유지 및 기타 명시되지 않은 비용은 포함되어 있지 않습니다.';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
await page.bringToFront().catch(() => {});
console.log('URL', page.url());

const reqs = [];
page.on('request', (r) => {
  if (/api|graphql|inclusion|product/i.test(r.url())) reqs.push(r.method() + ' ' + r.url().slice(0, 120));
});
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log('CON', m.type(), m.text().slice(0, 150));
});

// Ensure dialog open
if (!(await page.locator('[role=dialog]').count())) {
  await page.getByRole('button', { name: /撰写/ }).click({ timeout: 10000 });
  await sleep(1200);
}

// Dump checkbox visual state (right-side checkboxes from screenshot)
const rows = await page.evaluate(() => {
  return ['运输', '接送', '其他'].map((name) => {
    const lab = Array.from(document.querySelectorAll('label,div')).find(
      (e) => (e.innerText || '').trim().startsWith(name) && e.getBoundingClientRect().width > 50,
    );
    const input = document.getElementById(
      name === '运输'
        ? 'inclusions_TRANSPORTATION'
        : name === '接送'
          ? 'inclusions_PICK_UP'
          : 'inclusions_ETC',
    );
    return {
      name,
      checked: input?.checked,
      id: input?.id,
      descId:
        name === '运输'
          ? 'inclusions_TRANSPORTATION_description'
          : name === '接送'
            ? 'inclusions_PICK_UP_description'
            : 'inclusions_ETC_description',
      descVal: document.getElementById(
        name === '运输'
          ? 'inclusions_TRANSPORTATION_description'
          : name === '接送'
            ? 'inclusions_PICK_UP_description'
            : 'inclusions_ETC_description',
      )?.value,
    };
  });
});
console.log('rows', rows);

// Click checkbox by id's sibling role=checkbox or label - force check true
async function ensureChecked(id) {
  const st = await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return 'missing';
    if (el.checked) return 'already';
    // Find clickable purple square: often a div with role=checkbox next to label
    const label = el.closest('label');
    if (label) {
      label.click();
      return el.checked ? 'label-ok' : 'label-fail';
    }
    el.click();
    return el.checked ? 'input-ok' : 'input-fail';
  }, id);
  console.log('ensure', id, st);
  // if still not, mouse click right side of row
  const still = await page.evaluate((id) => document.getElementById(id)?.checked, id);
  if (!still) {
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      const row = el?.closest('label') || el?.parentElement?.parentElement;
      const r = row?.getBoundingClientRect();
      if (r) {
        // checkbox on RIGHT per screenshot
        const x = r.right - 20;
        const y = r.top + r.height / 2;
        const target = document.elementFromPoint(x, y);
        target?.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y, view: window }));
      }
    }, id);
    // also page.mouse
    const box = await page.evaluate((id) => {
      const el = document.getElementById(id);
      const row = el?.closest('label') || el?.parentElement?.parentElement;
      const r = row?.getBoundingClientRect();
      return r ? { x: r.right - 18, y: r.top + r.height / 2 } : null;
    }, id);
    if (box) {
      await page.mouse.click(box.x, box.y);
      console.log('  mouse right checkbox', id, box);
    }
  }
  console.log('  final', id, await page.evaluate((id) => document.getElementById(id)?.checked, id));
}

await ensureChecked('inclusions_TRANSPORTATION');
await ensureChecked('inclusions_PICK_UP');
await sleep(400);

// Type into description with keyboard for React
async function typeField(sel, text) {
  const loc = page.locator(sel);
  if ((await loc.count()) === 0) {
    console.log('no field', sel);
    return;
  }
  await loc.scrollIntoViewIfNeeded();
  await loc.click({ force: true });
  await page.keyboard.press('Meta+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(text, { delay: 8 });
  const v = await loc.inputValue();
  console.log('typed', sel, v.length, v.slice(0, 25));
  // blur
  await page.keyboard.press('Tab');
}

await typeField('#inclusions_TRANSPORTATION_description', TR);
await typeField('#inclusions_PICK_UP_description', PU);
await typeField('#exclusions', EX);
await sleep(300);

// Verify form state from React fiber on inputs
const reactState = await page.evaluate(() => {
  const read = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const propsKey = Object.keys(el).find((k) => k.startsWith('__reactProps'));
    const props = propsKey ? el[propsKey] : null;
    return {
      value: el.value,
      propsValue: props?.value,
      hasOnChange: typeof props?.onChange === 'function',
    };
  };
  return {
    tr: read('#inclusions_TRANSPORTATION_description'),
    pu: read('#inclusions_PICK_UP_description'),
    ex: read('#exclusions'),
  };
});
console.log('react state', JSON.stringify(reactState, null, 2));

// If props.value is empty but el.value set, fire onChange with synthetic event
await page.evaluate(
  ({ tr, pu, ex }) => {
    const fire = (sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const propsKey = Object.keys(el).find((k) => k.startsWith('__reactProps'));
      const props = propsKey ? el[propsKey] : null;
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, val);
      if (props?.onChange) {
        props.onChange({
          target: el,
          currentTarget: el,
          preventDefault() {},
          stopPropagation() {},
          persist() {},
          nativeEvent: new Event('input'),
        });
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    fire('#inclusions_TRANSPORTATION_description', tr);
    fire('#inclusions_PICK_UP_description', pu);
    fire('#exclusions', ex);
  },
  { tr: TR, pu: PU, ex: EX },
);
console.log('fired onChange');
await sleep(300);

// Click 保存 — track requests
reqs.length = 0;
const save = page.locator('[role=dialog] button').filter({ hasText: /^保存$/ });
await save.scrollIntoViewIfNeeded();
const box = await save.boundingBox();
console.log('save', box, 'disabled', await save.isDisabled());

// Try double strategy
await save.click({ force: true, timeout: 5000 });
await sleep(1500);
console.log('after click1 dialog', await page.locator('[role=dialog]').count(), 'reqs', reqs);

if ((await page.locator('[role=dialog]').count()) > 0) {
  // Call onClick and log return if promise
  const result = await page.evaluate(async () => {
    const btn = Array.from(document.querySelectorAll('[role=dialog] button')).find(
      (b) => (b.innerText || '').trim() === '保存',
    );
    const propsKey = Object.keys(btn).find((k) => k.startsWith('__reactProps'));
    const onClick = btn[propsKey]?.onClick;
    if (!onClick) return 'no onClick';
    try {
      const ret = onClick({
        preventDefault() {},
        stopPropagation() {},
        persist() {},
        target: btn,
        currentTarget: btn,
        type: 'click',
        nativeEvent: { stopImmediatePropagation() {} },
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false,
      });
      if (ret && typeof ret.then === 'function') {
        try {
          await ret;
          return 'awaited promise ok';
        } catch (e) {
          return 'promise err: ' + e.message;
        }
      }
      return 'sync ret=' + String(ret);
    } catch (e) {
      return 'throw: ' + e.message + '\n' + e.stack?.slice(0, 300);
    }
  });
  console.log('onClick result', result);
  await sleep(1500);
}

console.log('final dialog', await page.locator('[role=dialog]').count());
console.log('url', page.url());
console.log('reqs', reqs);

// If closed, body should have text
const body = await page.evaluate(() => ({
  hasTr: document.body.innerText.includes('주차비'),
  hasPu: document.body.innerText.includes('픽업'),
  dialogTitle: document.querySelector('[role=dialog]')?.innerText?.slice(0, 80),
}));
console.log('body', body);

// screenshot
await page.screenshot({ path: '/Users/mac/nol/nol-listing-automation/pearl-include-debug.png' });
process.exit(0);
