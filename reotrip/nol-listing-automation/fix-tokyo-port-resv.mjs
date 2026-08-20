/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Fix 东京市区酒店-东京港: 代表预约信息（港口，无航班）
 * 临时保存 only. Never 提交审核.
 */
import { chromium } from 'playwright';

const PRODUCT_KO = '도쿄 시내 호텔 ↔ 도쿄항 단독 차량 편도 이동 서비스';
const BASE = 'https://tour.triple.partners/product-management/registration';
let PRODUCT_ID = process.env.TP_ID || '';

// Port/station — NO flight ids
const RESV_IDS = [
  'CELLPHONE-required',
  'EMAIL-required',
  'ENGLISH_LAST_NAME-required',
  'ENGLISH_FIRST_NAME-required',
  'DEPARTURE_DATE_TIME-required',
  'HOTEL_NAME-required',
  'HOTEL_ADDRESS-required',
  'PICKUP_AREA-required',
  'PICKUP_TIME-required',
  'SENDING_AREA-required',
  'BOOKED_TIME-required',
  'KAKAO_TALK_ID-required',
  'MESSAGING_APP_ID-required',
  'NUMBER_OF_PEOPLE-required',
  'NUMBER_OF_SUITCASES-required',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function stayIfLeave(page) {
  return page.evaluate(() => {
    const body = document.body?.innerText || '';
    if (!/有變化|有变化|更改将丢失|更改將丟失|确定要离开|確定要離開/.test(body)) return { has: false };
    Array.from(document.querySelectorAll('button'))
      .find((b) => /消除|取消/.test((b.innerText || '').trim()))
      ?.click();
    return { has: true };
  });
}

async function clickTempSave(page, label) {
  await stayIfLeave(page);
  const r = await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const box = b.getBoundingClientRect();
        const t = (b.innerText || '').trim();
        return {
          i,
          t,
          d: b.disabled || b.getAttribute('aria-disabled') === 'true',
          w: Math.round(box.width),
          vis: box.width > 0 && box.height > 0,
        };
      })
      .filter((b) => b.vis && !b.d && (b.t === '临时保存' || b.t === '臨時存儲'))
      .sort((a, b) => a.w - b.w || b.y - a.y);
    // prefer bottom bar on regulations (wider)
    const bar = c.filter((x) => x.w > 200).sort((a, b) => b.w - a.w);
    const pick = bar[0] || c[0];
    if (!pick) return { ok: false };
    document.querySelectorAll('button')[pick.i].click();
    return { ok: true, pick };
  });
  console.log(`[${label}] 临时保存`, r);
  await sleep(2500);
  return r.ok;
}

async function mouseClickCheckbox(page, rid) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const box = await page.evaluate((rid) => {
      const el = document.getElementById(rid);
      if (!el) {
        const scrollers = Array.from(document.querySelectorAll('*')).filter((e) => {
          const s = getComputedStyle(e);
          return (
            (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
            e.scrollHeight > e.clientHeight + 40 &&
            e.clientHeight > 60
          );
        });
        scrollers.sort((a, b) => b.clientHeight - a.clientHeight);
        if (scrollers[0]) scrollers[0].scrollTop += 160;
        return null;
      }
      el.scrollIntoView({ block: 'center' });
      if (el.checked) return { already: true };
      let target = document.querySelector(`label[for="${rid}"]`);
      if (!target) {
        let n = el;
        for (let i = 0; i < 8 && n; i++) {
          if (n.tagName === 'LABEL' || n.getAttribute('role') === 'checkbox') {
            target = n;
            break;
          }
          n = n.parentElement;
        }
      }
      if (!target) target = el;
      const r = target.getBoundingClientRect();
      if (r.width < 2) {
        const p = target.parentElement?.getBoundingClientRect();
        if (p && p.width > 2) return { x: p.x + 14, y: p.y + p.height / 2 };
        return null;
      }
      return { x: r.x + Math.min(14, r.width / 2), y: r.y + r.height / 2 };
    }, rid);
    if (box?.already) return true;
    if (box && typeof box.x === 'number') {
      await page.mouse.click(box.x, box.y);
      await sleep(80);
      if (await page.evaluate((rid) => !!document.getElementById(rid)?.checked, rid)) return true;
      await page.evaluate((rid) => {
        const el = document.getElementById(rid);
        if (!el || el.checked) return;
        el.click();
        if (!el.checked) {
          el.checked = true;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, rid);
      if (await page.evaluate((rid) => !!document.getElementById(rid)?.checked, rid)) return true;
    }
    await sleep(50);
  }
  return page.evaluate((rid) => !!document.getElementById(rid)?.checked, rid);
}

async function resolveProduct(page) {
  if (PRODUCT_ID) {
    await page.goto(`${BASE}/regulations?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(2500);
    const t = await page.locator('body').innerText();
    if (t.includes('도쿄항') || t.includes('东京港')) {
      console.log('id ok', PRODUCT_ID);
      return true;
    }
  }

  await page.goto(`${BASE}?lang=zh-tw`, { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  const search = page.locator('input[placeholder*="产品名称"], input[placeholder*="搜索"], input[type=search]').first();
  if (await search.count()) {
    await search.fill('도쿄항');
    await search.press('Enter').catch(() => {});
    await sleep(2500);
  }

  const box = await page.evaluate((ko) => {
    const cards = Array.from(
      document.querySelectorAll('div[class*="slot___StyledContainer4"]'),
    ).filter(
      (el) =>
        (el.innerText || '').includes(ko) ||
        ((el.innerText || '').includes('도쿄항') && (el.innerText || '').includes('단독')),
    );
    if (!cards[0]) return null;
    const r = cards[0].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + Math.min(50, r.height / 2), t: (cards[0].innerText || '').slice(0, 80) };
  }, PRODUCT_KO);
  console.log('card', box);
  if (box) {
    await page.mouse.click(box.x, box.y);
    await sleep(4000);
  }
  let url = page.url();
  let m = url.match(/id=([0-9a-f-]{30,})/i);
  if (!m) {
    console.log('no id after click, fail');
    return false;
  }
  PRODUCT_ID = m[1];
  console.log('PRODUCT_ID', PRODUCT_ID);
  await page.goto(`${BASE}/regulations?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2500);
  return true;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const ctx = browser.contexts()[0];
  let page =
    ctx.pages().find((p) => (p.url() || '').includes('tour.triple.partners')) || ctx.pages()[0];
  await page.bringToFront().catch(() => {});
  await stayIfLeave(page);
  console.log('start', page.url());
  console.log('TASK: 东京港 代表预约（港口无航班）; 临时保存; never 提交审核');

  if (!(await resolveProduct(page))) throw new Error('cannot find 东京港');

  // BEFORE
  let body = await page.locator('body').innerText();
  const beforeRed = /须填写「代表预约|必須輸入代表|您必須輸入代表/.test(body);
  const beforeSnip = (body.match(/代表预约信息[\s\S]{0,280}/) || body.match(/代表預約信息[\s\S]{0,280}/) || ['n/a'])[0];
  console.log('BEFORE red?', beforeRed);
  console.log('BEFORE snippet', beforeSnip);

  // open modal
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((x) => {
        const t = (x.innerText || '').trim();
        return t === '代表预约信息' || t === '代表預約信息';
      })
      ?.click();
  });
  await sleep(2000);

  // uncheck flight-related if on (port product)
  for (const rid of [
    'ARRIVAL_FLIGHT_NUMBER-required',
    'ARRIVAL_DATE_TIME-required',
    'DEPARTURE_FLIGHT_NUMBER-required',
    'AIRLINE_CODE-required',
    'PNR-required',
  ]) {
    const was = await page.evaluate((rid) => {
      const el = document.getElementById(rid);
      if (!el) return null;
      if (el.checked) {
        el.click();
        return 'unchecked';
      }
      return 'off';
    }, rid);
    if (was) console.log('flight', rid, was);
  }

  const results = {};
  for (const rid of RESV_IDS) {
    results[rid] = await mouseClickCheckbox(page, rid);
    console.log(rid, results[rid] ? 'OK' : 'FAIL');
  }

  // 已选
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((x) => {
        const t = (x.innerText || '').trim();
        return t === '已选' || t === '已選' || t.startsWith('已选') || t.startsWith('已選');
      })
      ?.click();
  });
  await sleep(2500);

  body = await page.locator('body').innerText();
  let red = /须填写「代表预约|必須輸入代表|您必須輸入代表/.test(body);
  console.log('after confirm red?', red);
  console.log((body.match(/代表预约信息[\s\S]{0,320}/) || ['n/a'])[0]);

  // 临时保存
  await clickTempSave(page, 'regs');

  // 保存然后 if enabled
  const bottoms = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter((b) => /保存然后|保存然後|临时保存|提交审核/.test((b.innerText || '').trim()))
      .map((b) => ({ t: (b.innerText || '').trim(), d: b.disabled })),
  );
  console.log('bottoms', bottoms);
  if (bottoms.some((x) => (x.t === '保存然后' || x.t === '保存然後') && !x.d)) {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((x) => {
          const t = (x.innerText || '').trim();
          return (t === '保存然后' || t === '保存然後') && !x.disabled;
        })
        ?.click();
    });
    await sleep(3000);
    console.log('保存然后 clicked');
  }

  // re-verify
  await page.goto(`${BASE}/regulations?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2500);
  body = await page.locator('body').innerText();
  red = /须填写「代表预约|必須輸入代表|您必須輸入代表/.test(body);
  const snip = (body.match(/代表预约信息[\s\S]{0,350}/) || ['n/a'])[0];
  console.log('\n========== DONE 东京港 ==========');
  console.log(
    JSON.stringify(
      {
        PRODUCT_ID,
        beforeRed,
        afterRed: red,
        okCount: Object.values(results).filter(Boolean).length,
        total: RESV_IDS.length,
        results,
        snip,
      },
      null,
      2,
    ),
  );
  console.log('提交审核 NOT clicked');
  console.log('STOP — wait user check before next');
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
