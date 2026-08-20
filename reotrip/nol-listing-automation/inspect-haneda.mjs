/**
 * Inspect Haneda page buttons/labels (simplified vs traditional).
 * No saves. If leave dialog: click 消除 to stay.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PRODUCT_ID = 'b6e560d4-d4d3-4726-b08c-f5623499895a';
const Q = `id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`;

async function dismissLeave(page) {
  // stay on page: 消除 / 取消
  const r = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const has = /有變化|更改將丟失|更改将丢失|確定要離開|确定要离开/.test(body);
    if (!has) return { has: false };
    const btns = Array.from(document.querySelectorAll('button')).map((b) => ({
      t: (b.innerText || '').trim(),
      d: b.disabled,
    }));
    // click 消除 first (stay)
    const stay = Array.from(document.querySelectorAll('button')).find((b) =>
      /消除|取消|Cancel/.test((b.innerText || '').trim()),
    );
    if (stay) {
      stay.click();
      return { has: true, clicked: (stay.innerText || '').trim(), btns };
    }
    return { has: true, clicked: null, btns };
  });
  if (r.has) console.log('leave dialog', r);
  await sleep(500);
  return r;
}

async function dumpButtons(page, label) {
  const data = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).map((b, i) => {
      const r = b.getBoundingClientRect();
      return {
        i,
        t: (b.innerText || '').trim().slice(0, 80),
        d: b.disabled || b.getAttribute('aria-disabled') === 'true',
        w: Math.round(r.width),
        y: Math.round(r.y),
        vis: r.width > 0 && r.height > 0,
      };
    });
    const important = buttons.filter(
      (b) =>
        b.vis &&
        /保存|存储|儲存|临时|臨時|下|次|批准|完成|완료|价格|가격|修改|옵션|预约|預約|선택|已选|已選|기타|其他|대표|代表/.test(
          b.t,
        ),
    );
    const resvIds = [
      'CELLPHONE-required',
      'EMAIL-required',
      'ARRIVAL_FLIGHT_NUMBER-required',
      'DEPARTURE_FLIGHT_NUMBER-required',
    ].map((id) => {
      const el = document.getElementById(id);
      return { id, exists: !!el, checked: el?.checked };
    });
    return {
      url: location.href,
      title: document.title,
      important,
      allBtnSample: buttons.filter((b) => b.vis && b.t).slice(0, 40),
      resvIds,
      bodyHasRed: /必须输入代表|必須輸入代表|须填写/.test(document.body.innerText || ''),
      bodySnip: (document.body.innerText || '').slice(0, 500),
    };
  });
  console.log('\n====', label, '====');
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find((p) => (p.url() || '').includes('tour.triple.partners'));
  if (!page) page = context.pages()[0];
  await page.bringToFront().catch(() => {});

  await dismissLeave(page);
  await dumpButtons(page, 'current');

  // try regulations
  await page.goto(
    `https://tour.triple.partners/product-management/registration/regulations?${Q}`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(2500);
  await dismissLeave(page);
  await dumpButtons(page, 'regulations');

  // open resv button texts
  const resvOpen = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button,div,span,a'))
      .map((el) => (el.innerText || '').trim())
      .filter((t) => t && /预约|預約|예약/.test(t) && t.length < 40)
      .slice(0, 30);
  });
  console.log('resv-related texts', resvOpen);

  // click open
  await page.evaluate(() => {
    const hit = Array.from(document.querySelectorAll('button')).find((b) =>
      /代表预约信息|代表預約信息|대표 예약/.test((b.innerText || '').trim()),
    );
    if (hit) hit.click();
  });
  await sleep(2000);
  const modal = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll('[id$="-required"]')).map((el) => ({
      id: el.id,
      checked: el.checked,
      type: el.type,
      tag: el.tagName,
      roleParent: el.closest('[role=checkbox]') ? true : false,
    }));
    const btns = Array.from(document.querySelectorAll('button'))
      .map((b) => (b.innerText || '').trim())
      .filter((t) => t && t.length < 30);
    return { idCount: ids.length, ids: ids.slice(0, 40), btns: [...new Set(btns)].slice(0, 40) };
  });
  console.log('modal', JSON.stringify(modal, null, 2));

  // option page
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(300);
  await page.goto(
    `https://tour.triple.partners/product-management/registration/option?${Q}`,
    { waitUntil: 'domcontentloaded' },
  );
  await sleep(2500);
  await dismissLeave(page);
  await dumpButtons(page, 'option-list');

  // open first edit
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      /修改选项|修改選項|옵션 수정/.test((x.innerText || '').trim()),
    );
    b?.click();
  });
  await sleep(2500);
  await dumpButtons(page, 'option-form');

  // dump placeholders
  const placeholders = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input,textarea')).map((el) => ({
      ph: el.placeholder,
      name: el.name,
      id: el.id,
      type: el.type,
      value: (el.value || '').slice(0, 40),
      vis: el.getBoundingClientRect().height > 0,
    })),
  );
  console.log('inputs', JSON.stringify(placeholders.filter((x) => x.vis || x.id || x.ph), null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
