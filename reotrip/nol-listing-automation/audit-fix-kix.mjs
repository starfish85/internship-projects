/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Audit + fix Kansai (KIX) draft:
 * - 代表预约（机场航班）
 * - 价格类型韩文
 * Save order: 临时保存 → 下一个
 * Never 提交审核
 * Excel: 7座 99 / 10座 133
 */
import { chromium } from 'playwright';

const PRODUCT_KO = '오사카 시내 호텔 ↔ 간사이공항(KIX) 단독 차량 편도 이동 서비스';
const PRODUCT_CN = '大阪市区-关西机场(KIX)';
let PRODUCT_ID = process.env.KIX_ID || '7c220325-8783-4f58-a1dc-5fbfc4137a5e';
const BASE = 'https://tour.triple.partners/product-management/registration';

const RESV_IDS = [
  'CELLPHONE-required',
  'EMAIL-required',
  'ENGLISH_LAST_NAME-required',
  'ENGLISH_FIRST_NAME-required',
  'DEPARTURE_DATE_TIME-required',
  'ARRIVAL_FLIGHT_NUMBER-required',
  'ARRIVAL_DATE_TIME-required',
  'DEPARTURE_FLIGHT_NUMBER-required',
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

const OPTIONS = [
  {
    match: '오사카 시내 호텔 출발 → 간사이공항(KIX) 편도 이동 (7인승 차량)',
    fullName: '오사카 시내 호텔 출발 → 간사이공항(KIX) 편도 이동 (7인승 차량)',
    ptName: '7인승 가는',
    ptDesc: '7인승 차량',
    price: '99',
  },
  {
    match: '오사카 시내 호텔 출발 → 간사이공항(KIX) 편도 이동 (10인승 차량)',
    fullName: '오사카 시내 호텔 출발 → 간사이공항(KIX) 편도 이동 (10인승 차량)',
    ptName: '10인승 가는',
    ptDesc: '10인승 차량',
    price: '133',
  },
  {
    match: '간사이공항(KIX) 출발 → 오사카 시내 호텔 편도 이동 (7인승 차량)',
    fullName: '간사이공항(KIX) 출발 → 오사카 시내 호텔 편도 이동 (7인승 차량)',
    ptName: '7인승 오는',
    ptDesc: '7인승 차량',
    price: '99',
  },
  {
    match: '간사이공항(KIX) 출발 → 오사카 시내 호텔 편도 이동 (10인승 차량)',
    fullName: '간사이공항(KIX) 출발 → 오사카 시내 호텔 편도 이동 (10인승 차량)',
    ptName: '10인승 오는',
    ptDesc: '10인승 차량',
    price: '133',
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = () => `id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`;

async function stayIfLeaveDialog(page) {
  return page.evaluate(() => {
    const body = document.body?.innerText || '';
    if (!/有變化|有变化|更改將丟失|更改将丢失|確定要離開|确定要离开/.test(body)) return { has: false };
    const stay = Array.from(document.querySelectorAll('button')).find((b) => {
      const t = (b.innerText || '').trim();
      return t === '消除' || t === '取消';
    });
    if (stay) {
      stay.click();
      return { has: true, stayed: true };
    }
    return { has: true, stayed: false };
  });
}

async function clickTempSave(page, label = '') {
  await stayIfLeaveDialog(page);
  const result = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        const t = (b.innerText || '').trim();
        return {
          i,
          t,
          d: b.disabled || b.getAttribute('aria-disabled') === 'true',
          w: Math.round(r.width),
          y: Math.round(r.y),
          vis: r.width > 0 && r.height > 0,
        };
      })
      .filter((b) => b.vis && !b.d && (b.t === '临时保存' || b.t === '臨時存儲' || b.t === '임시저장'));
    if (!candidates.length) return { ok: false };
    candidates.sort((a, b) => a.w - b.w || b.y - a.y);
    document.querySelectorAll('button')[candidates[0].i].click();
    return { ok: true, pick: candidates[0] };
  });
  console.log(`[${label}] 临时保存`, result);
  await sleep(2500);
  return result.ok;
}

async function clickNext(page, label = '') {
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button')).map((b, i) => {
        const r = b.getBoundingClientRect();
        const t = (b.innerText || '').trim();
        return {
          i,
          t,
          d: b.disabled || b.getAttribute('aria-disabled') === 'true',
          w: Math.round(r.width),
          y: Math.round(r.y),
          vis: r.width > 0 && r.height > 0,
        };
      });
      const candidates = all
        .filter(
          (b) =>
            b.vis &&
            !b.d &&
            (b.t === '下一个' || b.t === '下個' || b.t === '다음' || b.t === '下个') &&
            b.w > 150,
        )
        .sort((a, b) => b.w - a.w || b.y - a.y);
      if (!candidates.length) {
        return {
          ok: false,
          nearby: all.filter((b) => b.vis && /下|次|저장|保存/.test(b.t)).slice(0, 12),
        };
      }
      document.querySelectorAll('button')[candidates[0].i].click();
      return { ok: true, pick: candidates[0] };
    });
    console.log(`[${label}] 下一个 attempt ${attempt + 1}`, result);
    if (result.ok) {
      await sleep(3500);
      await stayIfLeaveDialog(page);
      return true;
    }
    await sleep(1200);
  }
  return false;
}

async function tempSaveThenNext(page, label) {
  console.log(`\n>>> ${label}: 临时保存 → 下一个`);
  if (!(await clickTempSave(page, label))) throw new Error(`${label} 临时保存 failed`);
  await sleep(1500);
  if (!(await clickNext(page, label))) {
    // dump buttons for debug then one more temp+next cycle
    const dump = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .map((b) => {
          const r = b.getBoundingClientRect();
          return {
            t: (b.innerText || '').trim(),
            d: b.disabled,
            w: Math.round(r.width),
            vis: r.width > 0,
          };
        })
        .filter((b) => b.vis && b.t)
        .slice(0, 40),
    );
    console.log(`[${label}] next failed dump`, dump);
    await clickTempSave(page, label + '-retry');
    await sleep(1500);
    if (!(await clickNext(page, label + '-retry'))) {
      throw new Error(`${label} 下一个 failed`);
    }
  }
}

async function setNativeValue(page, selector, value) {
  const loc = page.locator(selector).first();
  if (!(await loc.count())) return false;
  await loc.click({ force: true }).catch(() => {});
  await loc.fill('');
  await loc.fill(String(value));
  await loc.evaluate((node, v) => {
    const proto = Object.getPrototypeOf(node);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc?.set) desc.set.call(node, v);
    else node.value = v;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(value));
  return (await loc.inputValue().catch(() => '')) === String(value);
}

async function mouseClickCheckbox(page, rid) {
  for (let attempt = 0; attempt < 35; attempt++) {
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
      if (r.width < 2 || r.height < 2) {
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

async function resolveProductId(page) {
  // try known id first
  await page.goto(`${BASE}/option?${q()}`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  await stayIfLeaveDialog(page);
  let body = await page.locator('body').innerText();
  if (body.includes('간사이') || body.includes(PRODUCT_KO) || body.includes('关西') || body.includes('KIX')) {
    console.log('resolved via known id', PRODUCT_ID);
    return true;
  }
  console.log('known id mismatch, search list…');
  await page.goto(`${BASE}?lang=zh-tw`, { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  const search = page.locator('input[type=search], input[placeholder*="搜索"], input[placeholder*="搜尋"], input[placeholder*="검색"]').first();
  if (await search.count()) {
    await search.fill('간사이');
    await search.press('Enter').catch(() => {});
    await sleep(2000);
  }
  const clicked = await page.evaluate((names) => {
    const cards = Array.from(document.querySelectorAll('div')).filter((el) => {
      const t = el.innerText || '';
      return (
        names.some((n) => t.includes(n)) &&
        t.length < 800 &&
        (t.includes('UNPUBLISHED') || t.includes('未发布') || t.includes('修复') || t.includes('修復') || t.includes('판매'))
      );
    });
    cards.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
    if (cards[0]) {
      cards[0].click();
      return (cards[0].innerText || '').slice(0, 120);
    }
    const any = Array.from(document.querySelectorAll('div')).find((el) => {
      const t = (el.innerText || '').trim();
      return t.includes(names[0]) && t.length < 400;
    });
    if (any) {
      any.click();
      return (any.innerText || '').slice(0, 120);
    }
    return null;
  }, [PRODUCT_KO, '간사이공항(KIX)', PRODUCT_CN, '关西']);
  console.log('list click', clicked);
  await sleep(3000);
  const url = page.url();
  const m = url.match(/id=([0-9a-f-]{30,})/i);
  if (m) {
    PRODUCT_ID = m[1];
    console.log('PRODUCT_ID', PRODUCT_ID);
    return true;
  }
  return false;
}

async function audit(page) {
  console.log('\n========== AUDIT KIX ==========');
  const report = { id: PRODUCT_ID, resvRed: null, resvSnippet: null, options: [], times: [], pt: [] };

  // regulations
  await page.goto(`${BASE}/regulations?${q()}`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  await stayIfLeaveDialog(page);
  let body = await page.locator('body').innerText();
  report.resvRed = /须填写「代表预约|必須輸入代表|您必須輸入代表/.test(body);
  report.resvSnippet = (body.match(/代表预约信息[\s\S]{0,280}/) || body.match(/代表預約信息[\s\S]{0,280}/) || ['n/a'])[0];
  report.hasFlightSummary = /航班|航班号|出国航班|返程航班|航空/.test(body);
  report.titleOk = body.includes('간사이') || body.includes('关西') || body.includes('KIX');
  console.log('regs red', report.resvRed, 'flight', report.hasFlightSummary, 'title', report.titleOk);
  console.log('snippet', report.resvSnippet?.slice(0, 200));

  // options list
  await page.goto(`${BASE}/option?${q()}`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  body = await page.locator('body').innerText();
  for (const o of OPTIONS) {
    report.options.push({ name: o.match, present: body.includes(o.match) });
  }
  report.selling = (body.match(/销售中|판매중/g) || []).length;
  report.englishPtList = {
    '7seat go': body.includes('7seat go'),
    '10seat go': body.includes('10seat go'),
    '7seat rtn': body.includes('7seat rtn'),
    '10seat rtn': body.includes('10seat rtn'),
  };
  console.log('options present', report.options);
  console.log('selling', report.selling, 'en on list', report.englishPtList);

  // deep PT + times sample
  for (let idx = 0; idx < OPTIONS.length; idx++) {
    const opt = OPTIONS[idx];
    await page.goto(`${BASE}/option?${q()}`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    await page.evaluate((index) => {
      const edits = Array.from(document.querySelectorAll('button')).filter((b) =>
        /修改选项|修改選項/.test((b.innerText || '').trim()),
      );
      edits[index]?.click();
    }, idx);
    await sleep(2200);
    if (!(await page.locator('#name').count())) {
      report.pt.push({ expected: opt.ptName, error: 'no form' });
      continue;
    }
    const formText = await page.locator('body').innerText();
    const timesLine = (formText.match(/07:00[^\n]{0,200}21:30/) || formText.match(/时间段[^\n]{0,300}/) || [''])[0];
    const timeCount = new Set((formText.match(/\b([01]\d|2[0-3]):[0-5]\d\b/g) || [])).size;
    // open price type
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /选择价格类型|選擇價格類型|가격 타입/.test((b.innerText || '').trim()))
        ?.click();
    });
    await sleep(800);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button,div,span'))
        .find((el) => {
          const t = (el.innerText || '').trim();
          return /其他价格类型|其他價格類型|기타 가격/.test(t) && t.length < 50;
        })
        ?.click();
    });
    await sleep(1000);
    const stored = await page.evaluate(() => {
      const ph =
        document.querySelector('input[placeholder*="销售渠道"]') ||
        document.querySelector('input[placeholder*="銷售渠道"]') ||
        document.querySelector('input[placeholder="輸入的名稱將顯示在銷售渠道上。"]') ||
        document.querySelector('input[placeholder="输入的名称将显示在销售渠道上。"]');
      if (ph) return ph.value;
      const inputs = Array.from(document.querySelectorAll('input')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 80 && r.height > 0 && el.type !== 'tel' && el.type !== 'number';
      });
      return inputs.find((i) => i.placeholder && /名称|名稱|渠道/.test(i.placeholder))?.value || inputs[0]?.value || null;
    });
    console.log(`AUDIT PT ${idx + 1}`, stored, 'times~', timeCount, timesLine?.slice(0, 80));
    report.pt.push({
      expected: opt.ptName,
      stored,
      ok: stored === opt.ptName,
      timeCount,
      timesHint: timesLine?.slice(0, 100),
    });
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(300);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((x) => {
          const t = (x.innerText || '').trim();
          return t === '完成' || t === '완료';
        })
        ?.click();
    });
    await sleep(400);
    // leave without dirty if possible: temp+next only if we changed nothing - use 下一个 after temp if form still open
    // Actually audit only - if dirty dialog, stay and temp save then next
    if (await page.locator('#name').count()) {
      await tempSaveThenNext(page, `audit-exit-${idx}`);
    }
  }

  console.log('\nAUDIT JSON', JSON.stringify(report, null, 2));
  return report;
}

async function fixReservation(page) {
  console.log('\n========== FIX RESV ==========');
  await page.goto(`${BASE}/regulations?${q()}`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  await stayIfLeaveDialog(page);

  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((x) => {
        const t = (x.innerText || '').trim();
        return t === '代表预约信息' || t === '代表預約信息';
      })
      ?.click();
  });
  await sleep(2000);

  const results = {};
  for (const rid of RESV_IDS) {
    results[rid] = await mouseClickCheckbox(page, rid);
    console.log(rid, results[rid] ? 'OK' : 'FAIL');
  }

  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((x) => {
        const t = (x.innerText || '').trim();
        return t === '已选' || t === '已選' || t.startsWith('已选') || t.startsWith('已選');
      })
      ?.click();
  });
  await sleep(2500);

  let body = await page.locator('body').innerText();
  let red = /须填写「代表预约|必須輸入代表|您必須輸入代表/.test(body);
  console.log('red after?', red);

  await clickTempSave(page, 'regs');
  const bottoms = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter((b) => /保存然后|保存然後|临时保存|提交审核/.test((b.innerText || '').trim()))
      .map((b) => ({ t: (b.innerText || '').trim(), d: b.disabled })),
  );
  console.log('bottoms', bottoms);
  const saveThen = bottoms.find((x) => (x.t === '保存然后' || x.t === '保存然後') && !x.d);
  if (saveThen) {
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

  await page.goto(`${BASE}/regulations?${q()}`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  body = await page.locator('body').innerText();
  red = /须填写「代表预约|必須輸入代表|您必須輸入代表/.test(body);
  console.log('FINAL resv red?', red);
  console.log((body.match(/代表预约信息[\s\S]{0,300}/) || ['n/a'])[0]);
  return { results, red };
}

async function fixPriceTypes(page, onlyIfNeeded = true, startIdx = 0) {
  console.log('\n========== FIX PT ========== startIdx', startIdx);
  const out = [];
  for (let idx = startIdx; idx < OPTIONS.length; idx++) {
    const opt = OPTIONS[idx];
    console.log(`\n----- OPT ${idx + 1} ${opt.ptName} -----`);
    await page.goto(`${BASE}/option?${q()}`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await stayIfLeaveDialog(page);

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
      out.push({ pt: opt.ptName, error: 'form-not-open' });
      continue;
    }

    // open PT dialog and check current
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /选择价格类型|選擇價格類型|가격 타입 선택/.test((b.innerText || '').trim()))
        ?.click();
    });
    await sleep(900);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button,div,span'))
        .find((el) => {
          const t = (el.innerText || '').trim();
          return /其他价格类型|其他價格類型|기타 가격 타입/.test(t) && t.length < 50;
        })
        ?.click();
    });
    await sleep(1200);

    const current = await page.evaluate(() => {
      const ph =
        document.querySelector('input[placeholder*="销售渠道"]') ||
        document.querySelector('input[placeholder*="銷售渠道"]') ||
        document.querySelector('input[placeholder*="名稱將"]') ||
        document.querySelector('input[placeholder*="名称将"]') ||
        document.querySelector('input[placeholder*="名称將"]');
      return ph ? ph.value : null;
    });
    console.log('current PT', current);

    if (onlyIfNeeded && current === opt.ptName) {
      console.log('already Korean, exit with temp+next');
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(300);
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('button'))
          .find((x) => {
            const t = (x.innerText || '').trim();
            return t === '完成' || t === '완료';
          })
          ?.click();
      });
      await sleep(400);
      await tempSaveThenNext(page, `skip-${opt.ptName}`);
      out.push({ pt: opt.ptName, skipped: true, current });
      continue;
    }

    // fill
    const nameSelectors = [
      'input[placeholder*="销售渠道"]',
      'input[placeholder*="銷售渠道"]',
      'input[placeholder="輸入的名稱將顯示在銷售渠道上。"]',
      'input[placeholder="输入的名称将显示在销售渠道上。"]',
      'input[placeholder*="名称將"]',
      'input[placeholder*="名称将"]',
    ];
    const descSelectors = [
      'input[placeholder="例) 滿 19 歲以上"]',
      'input[placeholder="例) 满 19 岁以上"]',
      'input[placeholder*="滿 19"]',
      'input[placeholder*="满 19"]',
    ];
    let nameOk = false;
    for (const s of nameSelectors) {
      if (await page.locator(s).count()) {
        nameOk = await setNativeValue(page, s, opt.ptName);
        if (nameOk) break;
      }
    }
    let descOk = false;
    for (const s of descSelectors) {
      if (await page.locator(s).count()) {
        descOk = await setNativeValue(page, s, opt.ptDesc);
        if (descOk) break;
      }
    }
    if (!nameOk || !descOk) {
      await page.evaluate(
        ({ ptName, ptDesc }) => {
          const inputs = Array.from(document.querySelectorAll('input[type=text], input:not([type])')).filter(
            (el) => {
              const r = el.getBoundingClientRect();
              return r.width > 50 && r.height > 0 && !el.disabled;
            },
          );
          const setVal = (el, v) => {
            const proto = Object.getPrototypeOf(el);
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            if (desc?.set) desc.set.call(el, v);
            else el.value = v;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          };
          if (inputs[0]) setVal(inputs[0], ptName);
          if (inputs[1]) setVal(inputs[1], ptDesc);
        },
        { ptName: opt.ptName, ptDesc: opt.ptDesc },
      );
    }
    const readName = await page.evaluate(() => {
      const ph =
        document.querySelector('input[placeholder*="销售渠道"]') ||
        document.querySelector('input[placeholder*="銷售渠道"]') ||
        document.querySelector('input[placeholder*="名称"]');
      return ph?.value;
    });
    console.log('filled', { nameOk, descOk, readName });

    await page.locator('[aria-labelledby="ETC-required-label"]').click({ force: true }).catch(() => {});
    await page
      .locator('[aria-labelledby="ETC-representative-label"]')
      .click({ force: true })
      .catch(() => {});

    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((x) => {
          const t = (x.innerText || '').trim();
          return t === '完成' || t === '완료';
        })
        ?.click();
    });
    await sleep(1500);

    if (await page.locator('#name').count()) {
      await page.locator('#name').fill(opt.fullName);
    }

    await tempSaveThenNext(page, opt.ptName);
    out.push({ pt: opt.ptName, nameOk, readName, saved: true });
  }
  return out;
}

async function verifyPt(page) {
  console.log('\n========== VERIFY PT ==========');
  const deep = [];
  for (let idx = 0; idx < OPTIONS.length; idx++) {
    const opt = OPTIONS[idx];
    await page.goto(`${BASE}/option?${q()}`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    await page.evaluate((index) => {
      const edits = Array.from(document.querySelectorAll('button')).filter(
        (b) => (b.innerText || '').trim() === '修改选项' || (b.innerText || '').trim() === '修改選項',
      );
      edits[index]?.click();
    }, idx);
    await sleep(2000);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => /选择价格类型|選擇價格類型/.test((b.innerText || '').trim()))
        ?.click();
    });
    await sleep(800);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button,div,span'))
        .find((el) => {
          const t = (el.innerText || '').trim();
          return /其他价格类型|其他價格類型|기타/.test(t) && t.length < 50;
        })
        ?.click();
    });
    await sleep(1000);
    const stored = await page.evaluate(() => {
      const ph =
        document.querySelector('input[placeholder*="销售渠道"]') ||
        document.querySelector('input[placeholder*="銷售渠道"]');
      return ph ? ph.value : null;
    });
    const ok = stored === opt.ptName;
    console.log('VERIFY', opt.ptName, '=>', stored, ok ? 'PASS' : 'FAIL');
    deep.push({ expected: opt.ptName, stored, ok });
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(300);
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((x) => {
          const t = (x.innerText || '').trim();
          return t === '完成' || t === '완료';
        })
        ?.click();
    });
    await sleep(400);
    if (await page.locator('#name').count()) {
      await tempSaveThenNext(page, `verify-exit-${opt.ptName}`);
    }
  }
  return deep;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  let page =
    context.pages().find((p) => (p.url() || '').includes('tour.triple.partners')) ||
    context.pages()[0];
  await page.bringToFront().catch(() => {});
  await stayIfLeaveDialog(page);
  console.log('start', page.url());
  console.log('NEVER 提交审核; 临时保存→下一个');

  const okId = await resolveProductId(page);
  if (!okId) throw new Error('Cannot resolve KIX product id');
  console.log('using PRODUCT_ID', PRODUCT_ID);

  // FIX_ONLY=pt START_IDX=n for resume; SKIP_AUDIT=1 to jump to fix
  const skipAudit = process.env.SKIP_AUDIT === '1';
  const startIdx = Number(process.env.START_IDX || '0');
  let auditReport = null;
  let needResv = true;
  let needPt = true;
  if (!skipAudit) {
    auditReport = await audit(page);
    needResv = auditReport.resvRed || !auditReport.hasFlightSummary;
    needPt = auditReport.pt.some((p) => !p.ok);
  } else {
    needResv = process.env.FIX_RESV === '1';
    needPt = true;
  }

  console.log('\nNEED', { needResv, needPt, startIdx, skipAudit });

  let resv = null;
  if (needResv) {
    resv = await fixReservation(page);
  } else {
    console.log('resv OK skip fix');
  }

  let pts = null;
  if (needPt) {
    pts = await fixPriceTypes(page, false, startIdx);
  } else {
    console.log('all PT already Korean — skip rename (still verify)');
  }

  const deep = await verifyPt(page);

  await page.goto(`${BASE}/option?${q()}`, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await clickTempSave(page, 'final-list');

  await page.goto(`${BASE}/regulations?${q()}`, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  const finalBody = await page.locator('body').innerText();
  const finalRed = /须填写「代表预约|必須輸入代表|您必須輸入代表/.test(finalBody);

  console.log('\n========== DONE KIX ==========');
  console.log(
    JSON.stringify(
      {
        PRODUCT_ID,
        auditResvRed: auditReport?.resvRed ?? null,
        finalRed,
        needResv,
        needPt,
        resv,
        pts,
        deep,
        options: auditReport?.options ?? null,
      },
      null,
      2,
    ),
  );
  console.log('提交审核 NOT clicked');
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
