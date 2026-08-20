/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Fix 东京市区酒店-东京站: 4 options time slots → 07:00–21:30 / 30min / 30 slots
 * Save: 临时保存 → 下一个. Never 提交审核.
 */
import { chromium } from 'playwright';

const PRODUCT_KO = '도쿄 시내 호텔 ↔ 도쿄역 단독 차량 편도 이동 서비스';
const SEARCH = '도쿄역';
const BASE = 'https://tour.triple.partners/product-management/registration';
let PRODUCT_ID = process.env.TS_ID || '09714a30-dc94-4378-a238-ed8a37a5d234';

const OPTION_NAMES = [
  '도쿄 시내 호텔 출발 → 도쿄역 편도 이동 (7인승 차량)',
  '도쿄 시내 호텔 출발 → 도쿄역 편도 이동 (10인승 차량)',
  '도쿄역 출발 → 도쿄 시내 호텔 편도 이동 (7인승 차량)',
  '도쿄역 출발 → 도쿄 시내 호텔 편도 이동 (10인승 차량)',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function stayIfLeave(page) {
  return page.evaluate(() => {
    const body = document.body?.innerText || '';
    if (!/有變化|有变化|更改将丢失|更改將丟失|确定要离开|確定要離開/.test(body)) return { has: false };
    const stay = Array.from(document.querySelectorAll('button')).find((b) =>
      /消除|取消/.test((b.innerText || '').trim()),
    );
    stay?.click();
    return { has: true, stayed: !!stay };
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
      .sort((a, b) => a.w - b.w);
    if (!c[0]) return { ok: false };
    document.querySelectorAll('button')[c[0].i].click();
    return { ok: true, pick: c[0] };
  });
  console.log(`[${label}] 临时保存`, r);
  await sleep(2200);
  return r.ok;
}

async function clickNext(page, label) {
  for (let a = 0; a < 5; a++) {
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
        .filter(
          (b) =>
            b.vis &&
            !b.d &&
            (b.t === '下一个' || b.t === '下個' || b.t === '다음') &&
            b.w > 150,
        )
        .sort((a, b) => b.w - a.w);
      if (!c[0]) return { ok: false };
      document.querySelectorAll('button')[c[0].i].click();
      return { ok: true, pick: c[0] };
    });
    console.log(`[${label}] 下一个 try ${a + 1}`, r);
    if (r.ok) {
      await sleep(3500);
      await stayIfLeave(page);
      return true;
    }
    await sleep(1000);
  }
  return false;
}

async function tempThenNext(page, label) {
  if (!(await clickTempSave(page, label))) throw new Error(label + ' no temp save');
  await sleep(800);
  if (!(await clickNext(page, label))) throw new Error(label + ' no next');
}

async function setTimes0700to2130(page) {
  // open 设定时间
  const opened = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      /設定時間|设定时间|시간 설정/.test(x.innerText || ''),
    );
    if (!b) return false;
    b.click();
    return true;
  });
  console.log('open time modal', opened);
  await sleep(1500);

  // 반복 시간 추가 / 重复添加时间
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button,div,span')).find((el) => {
      const t = (el.innerText || '').trim();
      return /반복 시간 추가|重复时间|重复添加|반복/.test(t) && t.length < 40;
    });
    b?.click();
  });
  await sleep(800);

  async function pickField(idx, hour, minute) {
    const fields = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .map((b, i) => {
          const t = (b.innerText || '').trim();
          const r = b.getBoundingClientRect();
          return { i, t, vis: r.height > 0 && r.width > 0 };
        })
        .filter((b) => b.vis && (b.t === '选择' || b.t === '選擇' || /^\d{2}:\d{2}$/.test(b.t))),
    );
    const target = fields[idx] || fields[0];
    if (!target) {
      console.log('no time field', idx, fields);
      return;
    }
    await page.locator('button').nth(target.i).click({ force: true });
    await sleep(500);
    // hour — leftmost column
    await page.evaluate((h) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === h,
      );
      if (opts.length) {
        opts.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
        opts[0].click();
        return;
      }
      const els = Array.from(document.querySelectorAll('div,li,span')).filter(
        (el) =>
          (el.innerText || '').trim() === h &&
          el.children.length === 0 &&
          el.getBoundingClientRect().height > 8,
      );
      els.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
      els[0]?.click();
    }, hour);
    await sleep(250);
    // minute — rightmost
    await page.evaluate((m) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === m,
      );
      if (opts.length) {
        opts.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
        opts[0].click();
        return;
      }
      const els = Array.from(document.querySelectorAll('div,li,span')).filter(
        (el) =>
          (el.innerText || '').trim() === m &&
          el.children.length === 0 &&
          el.getBoundingClientRect().height > 8,
      );
      els.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
      els[0]?.click();
    }, minute);
    await sleep(400);
  }

  await pickField(0, '07', '00');
  await pickField(1, '21', '30');

  // interval 30 min
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return t === '分鐘' || t === '分钟' || t === '분';
    });
    b?.click();
  });
  await sleep(400);
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[role=option],button,li,div')).filter((el) => {
      const t = (el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      return t === '30' && r.width > 0 && r.height > 0 && (el.children?.length || 0) <= 1;
    });
    els.at(-1)?.click();
  });
  await sleep(400);

  // 生成 / 생성
  const gen = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return t === '생성' || t === '生成';
    });
    if (!b) return null;
    b.click();
    return (b.innerText || '').trim();
  });
  console.log('generate', gen);
  await sleep(2800);

  // verify unique slots in modal
  const slots = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const all = [...body.matchAll(/\b([01]\d|2[0-3]):[0-5]\d\b/g)].map((m) => m[0]);
    const unique = [...new Set(all)].filter((t) => {
      const [h, mi] = t.split(':').map(Number);
      return h >= 7 && h <= 21 && (mi === 0 || mi === 30) && !(h === 21 && mi > 30);
    });
    unique.sort();
    return { count: unique.length, first: unique[0], last: unique[unique.length - 1], unique };
  });
  console.log('slots', slots.count, slots.first, '→', slots.last);

  // save modal 节省 / 節省 / 완료
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return t === '節省' || t === '节省' || t === '완료' || t === '完成' || t === '저장';
    });
    b?.click();
  });
  await sleep(1500);

  return {
    ok: slots.count >= 28 && slots.first === '07:00' && (slots.last === '21:30' || slots.last === '21:00'),
    ...slots,
  };
}

async function resolveProduct(page) {
  if (PRODUCT_ID) {
    await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(2500);
    const t = await page.locator('body').innerText();
    if (t.includes('도쿄역')) {
      console.log('id ok', PRODUCT_ID);
      return true;
    }
  }

  await page.goto(`${BASE}?lang=zh-tw`, { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  const search = page
    .locator('input[type=search], input[placeholder*="搜索"], input[placeholder*="搜尋"], input[placeholder*="검색"]')
    .first();
  if (await search.count()) {
    await search.fill(SEARCH);
    await search.press('Enter').catch(() => {});
    await sleep(2500);
  }

  // Must mouse-click full card (slot___StyledContainer4); title-only div does not navigate
  const box = await page.evaluate((ko) => {
    const cards = Array.from(
      document.querySelectorAll('div[class*="slot___StyledContainer4"]'),
    ).filter((el) => (el.innerText || '').includes(ko) || (el.innerText || '').includes('도쿄역'));
    if (!cards[0]) return null;
    const r = cards[0].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + Math.min(50, r.height / 2) };
  }, PRODUCT_KO);
  console.log('card box', box);
  if (box) {
    await page.mouse.click(box.x, box.y);
    await sleep(4000);
  }
  let url = page.url();
  let m = url.match(/id=([0-9a-f-]{30,})/i);
  if (!m) {
    // fallback known id
    PRODUCT_ID = PRODUCT_ID || '09714a30-dc94-4378-a238-ed8a37a5d234';
    await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(2500);
    url = page.url();
    m = url.match(/id=([0-9a-f-]{30,})/i);
  }
  if (m) {
    PRODUCT_ID = m[1];
    console.log('PRODUCT_ID', PRODUCT_ID);
    if (!url.includes('/option')) {
      await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
        waitUntil: 'domcontentloaded',
      });
      await sleep(2500);
    }
    const t = await page.locator('body').innerText();
    return t.includes('도쿄역');
  }
  return false;
}

async function auditTimes(page) {
  const results = [];
  for (let idx = 0; idx < 4; idx++) {
    await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(1500);
    await page.evaluate((index) => {
      const edits = Array.from(document.querySelectorAll('button')).filter((b) =>
        /修改选项|修改選項/.test((b.innerText || '').trim()),
      );
      edits[index]?.click();
    }, idx);
    await sleep(2200);
    const body = await page.locator('body').innerText();
    const line = (body.match(/07:00[^\n]{0,180}21:30/) || body.match(/时间段[^\n]{0,200}/) || body.match(/時間段[^\n]{0,200}/) || [''])[0];
    const times = [...body.matchAll(/\b([01]\d|2[0-3]):[0-5]\d\b/g)].map((m) => m[0]);
    const unique = [...new Set(times)].filter((t) => {
      const [h, mi] = t.split(':').map(Number);
      return h >= 7 && h <= 21 && (mi === 0 || mi === 30);
    });
    console.log(`AUDIT opt${idx + 1}`, unique.length, unique[0], unique.at(-1), line?.slice(0, 60));
    results.push({
      idx,
      name: OPTION_NAMES[idx],
      count: unique.length,
      first: unique[0],
      last: unique.at(-1),
      ok: unique.length >= 28 && unique[0] === '07:00' && unique.includes('21:30'),
    });
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(300);
    if (await page.locator('#name').count()) {
      await tempThenNext(page, `audit-exit-${idx}`);
    }
  }
  return results;
}

async function fixOneOption(page, idx) {
  console.log(`\n===== FIX OPT ${idx + 1}/4 =====`);
  await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);
  await stayIfLeave(page);

  await page.evaluate((index) => {
    const edits = Array.from(document.querySelectorAll('button')).filter((b) => {
      const t = (b.innerText || '').trim();
      return t === '修改选项' || t === '修改選項';
    });
    edits[index]?.scrollIntoView({ block: 'center' });
    edits[index]?.click();
  }, idx);
  await sleep(2500);

  if (!(await page.locator('#name').count())) {
    return { idx, error: 'form-not-open' };
  }

  // re-fill name if needed
  const name = OPTION_NAMES[idx];
  if (await page.locator('#name').count()) {
    await page.locator('#name').fill(name).catch(() => {});
  }

  const times = await setTimes0700to2130(page);
  console.log('setTimes result', times);

  await tempThenNext(page, `opt${idx + 1}`);
  return { idx, name, times, saved: true };
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const ctx = browser.contexts()[0];
  let page =
    ctx.pages().find((p) => (p.url() || '').includes('tour.triple.partners')) || ctx.pages()[0];
  await page.bringToFront().catch(() => {});
  await stayIfLeave(page);
  console.log('start', page.url());
  console.log('TASK: 东京站 4 options times 07:00-21:30; 临时保存→下一个; no 提交审核');

  if (!(await resolveProduct(page))) throw new Error('cannot find 东京站 product');

  const before = await auditTimes(page);
  console.log('BEFORE', JSON.stringify(before, null, 2));

  const need = before.filter((b) => !b.ok).map((b) => b.idx);
  console.log('need fix indices', need.length ? need : 'all look ok — still force-set all 4 for table note');

  // force fix all 4 as table says 4 options need time fix
  const fixes = [];
  for (let i = 0; i < 4; i++) {
    fixes.push(await fixOneOption(page, i));
  }

  const after = await auditTimes(page);
  await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(1500);
  await clickTempSave(page, 'final-list');

  console.log('\n========== DONE 东京站 ==========');
  console.log(JSON.stringify({ PRODUCT_ID, before, fixes, after }, null, 2));
  console.log('提交审核 NOT clicked');
  console.log('STOP — wait user check before next product');
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
