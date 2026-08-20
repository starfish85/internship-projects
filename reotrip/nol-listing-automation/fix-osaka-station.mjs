/**
 * @deprecated §43/§54 LIVE-禁用：仍含 page.mouse.click 坐标路径。
 * 勿用于 live 上架；请改用 pkx-*/pek-*/*-el.mjs 或改写为元素定位。
 * 扫查：node scripts/lint-skill-compliance.mjs
 */
/**
 * Fix 大阪市区酒店-大阪站:
 * 1) 文案仅面向 오사카역（去掉 신오사카역）
 * 2) 4 option 时间 07:00–21:30 × 30
 * 临时保存 → 下一个; never 提交审核
 */
import { chromium } from 'playwright';

const BASE = 'https://tour.triple.partners/product-management/registration';
let PRODUCT_ID = process.env.OS_ID || '';

const PRODUCT_KO_OLD = '오사카 시내 호텔 ↔ 오사카역/신오사카역 단독 차량 편도 이동 서비스';
const PRODUCT_KO = '오사카 시내 호텔 ↔ 오사카역 단독 차량 편도 이동 서비스';
const PRODUCT_CN = '大阪市区酒店-大阪站';

const OPTIONS = [
  {
    oldMatch: '오사카역/신오사카역',
    fullName: '오사카 시내 호텔 출발 → 오사카역 편도 이동 (7인승 차량)',
    desc: '오사카 시내 호텔 출발 → 오사카역 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 5개까지 적재 가능\n별도 열차 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
  },
  {
    oldMatch: '오사카역/신오사카역',
    fullName: '오사카 시내 호텔 출발 → 오사카역 편도 이동 (10인승 차량)',
    desc: '오사카 시내 호텔 출발 → 오사카역 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)\n26인치 이하 수하물 기준: 최대 10개까지 적재 가능\n별도 열차 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
  },
  {
    oldMatch: '오사카역/신오사카역',
    fullName: '오사카역 출발 → 오사카 시내 호텔 편도 이동 (7인승 차량)',
    desc: '오사카역 출발 → 오사카 시내 호텔 도착 편도 이동 (7인승 차량, 최대 4인 탑승 가능)\n24인치 이하 수하물 기준: 최대 5개까지 적재 가능\n별도 열차 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
  },
  {
    oldMatch: '오사카역/신오사카역',
    fullName: '오사카역 출발 → 오사카 시내 호텔 편도 이동 (10인승 차량)',
    desc: '오사카역 출발 → 오사카 시내 호텔 도착 편도 이동 (10인승 차량, 최대 9인 탑승 가능)\n26인치 이하 수하물 기준: 최대 10개까지 적재 가능\n별도 열차 티켓, 아동용 카시트, 야간 할증은 포함되어 있지 않습니다.',
  },
];

const HEADLINE = '오사카 시내 호텔과 오사카역을 편안하게 연결하는 단독 차량 이동 서비스입니다.';
const HIGHLIGHT = `오사카 시내 호텔 ↔ 오사카역 편도 전용 차량 이동
오사카역 승하차 시간에 맞춘 프라이빗 픽업 및 샌딩
7인승·10인승 차량 중 인원과 수하물에 맞게 선택 가능`;
const BOOKING =
  '예약 시 오사카 시내 호텔명/주소, 오사카역 내 승하차 또는 픽업 장소, 이용 시간, 연락 가능한 휴대전화 번호, 열차 정보를 정확히 입력해 주세요.';
const INCLUDE_TRANSPORT = '오사카 시내 호텔 ↔ 오사카역 편도 전용 차량 이동 및 주차비 포함';

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
          y: Math.round(box.y),
        };
      })
      .filter((b) => b.vis && !b.d && (b.t === '临时保存' || b.t === '臨時存儲'));
    if (!c.length) return { ok: false };
    // form footer first (narrower) when present
    c.sort((a, b) => a.w - b.w || b.y - a.y);
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
    console.log(`[${label}] 下一个 try${a + 1}`, r);
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
  if (!(await clickTempSave(page, label))) throw new Error(label + ' temp save fail');
  await sleep(800);
  if (!(await clickNext(page, label))) throw new Error(label + ' next fail');
}

async function setNative(page, sel, val) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) return false;
  await loc.click({ force: true }).catch(() => {});
  await loc.fill('');
  await loc.fill(String(val));
  await loc.evaluate((node, v) => {
    const proto = Object.getPrototypeOf(node);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc?.set) desc.set.call(node, v);
    else node.value = v;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(val));
  return true;
}

async function resolveProduct(page) {
  if (PRODUCT_ID) {
    await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(2500);
    const t = await page.locator('body').innerText();
    if (t.includes('오사카역') || t.includes('大阪站')) {
      console.log('id ok', PRODUCT_ID);
      return true;
    }
  }
  await page.goto(`${BASE}?lang=zh-tw`, { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  const search = page.locator('input[placeholder*="产品名称"], input[placeholder*="搜索"], input[type=search]').first();
  if (await search.count()) {
    await search.fill('오사카역');
    await search.press('Enter').catch(() => {});
    await sleep(2500);
  }
  const box = await page.evaluate(() => {
    const cards = Array.from(
      document.querySelectorAll('div[class*="slot___StyledContainer4"]'),
    ).filter((el) => {
      const t = el.innerText || '';
      return t.includes('오사카역') && t.includes('단독') && !t.includes('오사카항');
    });
    // prefer 신오사카 combined or pure 오사카역
    cards.sort((a, b) => {
      const at = a.innerText || '';
      const bt = b.innerText || '';
      const as = at.includes('신오사카') ? 0 : 1;
      const bs = bt.includes('신오사카') ? 0 : 1;
      return as - bs || at.length - bt.length;
    });
    if (!cards[0]) return null;
    const r = cards[0].getBoundingClientRect();
    return {
      x: r.x + r.width / 2,
      y: r.y + Math.min(50, r.height / 2),
      t: (cards[0].innerText || '').slice(0, 100),
    };
  });
  console.log('card', box);
  if (!box) return false;
  await page.mouse.click(box.x, box.y);
  await sleep(4000);
  const m = page.url().match(/id=([0-9a-f-]{30,})/i);
  if (!m) return false;
  PRODUCT_ID = m[1];
  console.log('PRODUCT_ID', PRODUCT_ID);
  return true;
}

async function fixProductNameAndIntro(page) {
  console.log('\n=== attributes product name ===');
  await page.goto(`${BASE}/properties?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2500);
  // title field
  const titleSel = '#title, input[name=title], textarea[name=title]';
  if (await page.locator(titleSel).count()) {
    await setNative(page, titleSel, PRODUCT_KO);
  } else {
    // first long text input
    await page.evaluate((name) => {
      const inputs = Array.from(document.querySelectorAll('input,textarea')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 200 && r.height > 0 && !el.disabled;
      });
      const setVal = (el, v) => {
        const proto = Object.getPrototypeOf(el);
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc?.set) desc.set.call(el, v);
        else el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      // product name often first
      if (inputs[0]) setVal(inputs[0], name);
    }, PRODUCT_KO);
  }
  // management title if present
  await page.evaluate((cn) => {
    const labels = Array.from(document.querySelectorAll('label,div,span'));
    // fill partner name if 신오사카 in any input
    for (const el of document.querySelectorAll('input,textarea')) {
      if ((el.value || '').includes('신오사카') || (el.value || '').includes('新大阪')) {
        const proto = Object.getPrototypeOf(el);
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        let v = el.value.replace(/\/신오사카역/g, '').replace(/신오사카역/g, '오사카역').replace(/新大阪站/g, '大阪站');
        if (desc?.set) desc.set.call(el, v);
        else el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, PRODUCT_CN);
  await clickTempSave(page, 'attrs');
  const bSave = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(
      (x) =>
        ((x.innerText || '').trim() === '保存然后' || (x.innerText || '').trim() === '保存然後') &&
        !x.disabled,
    );
    if (b) {
      b.click();
      return true;
    }
    return false;
  });
  console.log('attrs 保存然后', bSave);
  await sleep(3000);

  console.log('\n=== introduction copy ===');
  await page.goto(`${BASE}/introduction?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2500);
  // replace 신오사카 in all text fields
  const replaced = await page.evaluate(
    ({ headline, highlight, booking }) => {
      const setVal = (el, v) => {
        const proto = Object.getPrototypeOf(el);
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc?.set) desc.set.call(el, v);
        else el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      let n = 0;
      for (const el of document.querySelectorAll('input,textarea')) {
        const v = el.value || '';
        if (!v) continue;
        if (v.includes('신오사카') || v.includes('新大阪') || /오사카역\s*\/\s*신/.test(v)) {
          let nv = v
            .replace(/오사카역\s*\/\s*신오사카역/g, '오사카역')
            .replace(/\/신오사카역/g, '')
            .replace(/신오사카역/g, '오사카역')
            .replace(/新大阪站/g, '大阪站')
            .replace(/오사카역 또는 신오사카역/g, '오사카역');
          setVal(el, nv);
          n++;
        }
      }
      // try known ids
      const byId = (id, val) => {
        const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
        if (el) {
          setVal(el, val);
          return true;
        }
        return false;
      };
      byId('headline', headline);
      byId('highlight', highlight);
      // description / checklist often contain booking
      for (const el of document.querySelectorAll('textarea')) {
        const v = el.value || '';
        if (v.includes('예약 시') || v.includes('신오사카') || v.length > 80) {
          let nv = v
            .replace(/오사카역\s*\/\s*신오사카역/g, '오사카역')
            .replace(/오사카역 또는 신오사카역/g, '오사카역')
            .replace(/\/신오사카역/g, '')
            .replace(/신오사카역/g, '오사카역');
          if (nv.includes('예약 시') && nv.includes('신오사카')) {
            nv = nv.replace(/예약 시[^\n]*/g, booking);
          }
          if (nv !== v) {
            setVal(el, nv);
            n++;
          }
        }
      }
      return n;
    },
    { headline: HEADLINE, highlight: HIGHLIGHT, booking: BOOKING },
  );
  console.log('intro fields touched', replaced);
  await clickTempSave(page, 'intro');
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find(
        (x) =>
          ((x.innerText || '').trim() === '保存然后' || (x.innerText || '').trim() === '保存然後') &&
          !x.disabled,
      )
      ?.click();
  });
  await sleep(3000);

  // regulations include text if has 신오사카
  await page.goto(`${BASE}/regulations?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2500);
  const body = await page.locator('body').innerText();
  if (body.includes('신오사카')) {
    console.log('regs still has 신오사카 — try edit include');
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').trim() === '编辑' || (b.innerText || '').trim() === '編輯')
        ?.click();
    });
    await sleep(1500);
    await page.evaluate((includeText) => {
      const setVal = (el, v) => {
        const proto = Object.getPrototypeOf(el);
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc?.set) desc.set.call(el, v);
        else el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      for (const el of document.querySelectorAll('textarea,input')) {
        const v = el.value || '';
        if (v.includes('신오사카') || v.includes('오사카역/')) {
          setVal(
            el,
            v
              .replace(/오사카역\s*\/\s*신오사카역/g, '오사카역')
              .replace(/\/신오사카역/g, '')
              .replace(/신오사카역/g, '오사카역'),
          );
        }
      }
      const t = document.querySelector('#inclusions_TRANSPORTATION_description');
      if (t) setVal(t, includeText);
      Array.from(document.querySelectorAll('button'))
        .find((b) => /節省|节省|完成|완료/.test((b.innerText || '').trim()))
        ?.click();
    }, INCLUDE_TRANSPORT);
    await sleep(1500);
  }
  await clickTempSave(page, 'regs');
}

function parseTimeLine(body) {
  const m = body.match(/时间段\s*\n?\s*((?:\d{2}:\d{2}\s*[·.]\s*)*\d{2}:\d{2})/);
  if (!m) return { count: 0, first: null, last: null, line: '' };
  const slots = m[1].split(/[·.\s]+/).filter((x) => /^\d{2}:\d{2}$/.test(x));
  return { count: slots.length, first: slots[0] || null, last: slots.at(-1) || null, line: m[1].slice(0, 120) };
}

async function setTimes0700(page) {
  // Try multiple openers
  let opened = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('button,a,div[role=button]')).filter(
      (el) => {
        const t = (el.innerText || '').trim();
        const r = el.getBoundingClientRect();
        return (
          r.width > 0 &&
          r.height > 0 &&
          (/設定時間|设定时间|设置时间|시간 설정|时间设置/.test(t) ||
            (t.includes('时间') && t.length < 20 && /设|設|添加|설정/.test(t)))
        );
      },
    );
    if (candidates[0]) {
      candidates[0].click();
      return (candidates[0].innerText || '').trim();
    }
    return null;
  });
  console.log('open time via', opened);

  if (!opened) {
    // click the 时间段 line area (edit existing)
    const box = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('div,span,button')).filter((el) => {
        const t = (el.innerText || '').trim();
        return (
          (t.includes('时间段') || (/^\d{2}:\d{2}/.test(t) && t.includes('·'))) &&
          t.length < 400
        );
      });
      els.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
      const el = els[0];
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.x + Math.min(40, r.width / 2), y: r.y + r.height / 2 };
    });
    if (box) {
      await page.mouse.click(box.x, box.y);
      await sleep(1000);
      opened = 'timeline-click';
    }
  }
  await sleep(1200);

  // 반복 시간 추가
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button,div,span')).find((el) => {
      const t = (el.innerText || '').trim();
      return /반복 시간 추가|重复时间|添加重复|반복/.test(t) && t.length < 40;
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
      console.log('no field', idx, fields.length);
      return false;
    }
    await page.locator('button').nth(target.i).click({ force: true });
    await sleep(400);
    await page.evaluate((h) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === h,
      );
      if (opts.length) {
        opts.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
        opts[0].click();
        return;
      }
      Array.from(document.querySelectorAll('div,li,span'))
        .filter(
          (el) =>
            (el.innerText || '').trim() === h &&
            el.children.length === 0 &&
            el.getBoundingClientRect().height > 8,
        )
        .sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x)[0]
        ?.click();
    }, hour);
    await sleep(200);
    await page.evaluate((m) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === m,
      );
      if (opts.length) {
        opts.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
        opts[0].click();
        return;
      }
      Array.from(document.querySelectorAll('div,li,span'))
        .filter(
          (el) =>
            (el.innerText || '').trim() === m &&
            el.children.length === 0 &&
            el.getBoundingClientRect().height > 8,
        )
        .sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x)[0]
        ?.click();
    }, minute);
    await sleep(400);
    return true;
  }

  await pickField(0, '07', '00');
  await pickField(1, '21', '30');

  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((x) => {
        const t = (x.innerText || '').trim();
        return t === '分鐘' || t === '分钟' || t === '분';
      })
      ?.click();
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

  // save modal
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return t === '節省' || t === '节省' || t === '保存' || t === '완료' || t === '完成';
    });
    b?.click();
  });
  await sleep(1500);

  const body = await page.locator('body').innerText();
  return parseTimeLine(body);
}

async function fixOptions(page) {
  console.log('\n=== options rename + times ===');
  const out = [];
  for (let idx = 0; idx < 4; idx++) {
    const opt = OPTIONS[idx];
    console.log(`\n----- OPT ${idx + 1} ${opt.fullName.slice(0, 40)} -----`);
    await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(2000);
    await stayIfLeave(page);

    await page.evaluate((index) => {
      const edits = Array.from(document.querySelectorAll('button')).filter((b) =>
        /修改选项|修改選項/.test((b.innerText || '').trim()),
      );
      edits[index]?.scrollIntoView({ block: 'center' });
      edits[index]?.click();
    }, idx);
    await sleep(2500);

    if (!(await page.locator('#name').count())) {
      out.push({ idx, error: 'no form' });
      continue;
    }

    const beforeBody = await page.locator('body').innerText();
    const beforeTimes = parseTimeLine(beforeBody);
    console.log('before times', beforeTimes);

    await page.locator('#name').fill(opt.fullName);
    if (await page.locator('#description').count()) {
      await page.locator('#description').fill(opt.desc);
    }

    let times = beforeTimes;
    const needTimes =
      beforeTimes.count < 28 || beforeTimes.first !== '07:00' || beforeTimes.last !== '21:30';
    if (needTimes) {
      times = await setTimes0700(page);
      console.log('after set times', times);
      // re-fill name
      await page.locator('#name').fill(opt.fullName);
    } else {
      console.log('times already OK, skip set');
    }

    await tempThenNext(page, `opt${idx + 1}`);
    out.push({ idx, name: opt.fullName, beforeTimes, times, needTimes });
  }
  return out;
}

async function verify(page) {
  console.log('\n=== VERIFY ===');
  await page.goto(`${BASE}/properties?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);
  let body = await page.locator('body').innerText();
  const titleHasShin = body.includes('신오사카');
  const titleHasOsaka = body.includes('오사카역');
  console.log('attrs 신오사카?', titleHasShin, '오사카역?', titleHasOsaka);

  await page.goto(`${BASE}/introduction?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);
  body = await page.locator('body').innerText();
  console.log('intro 신오사카?', body.includes('신오사카'));

  const opts = [];
  for (let idx = 0; idx < 4; idx++) {
    await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
      waitUntil: 'domcontentloaded',
    });
    await sleep(1500);
    await page.evaluate((i) => {
      Array.from(document.querySelectorAll('button'))
        .filter((b) => /修改选项/.test((b.innerText || '').trim()))
        [i]?.click();
    }, idx);
    await sleep(2200);
    const name = (await page.locator('#name').inputValue().catch(() => '')) || '';
    body = await page.locator('body').innerText();
    const times = parseTimeLine(body);
    console.log(`V${idx + 1}`, name.slice(0, 45), times.first, '->', times.last, times.count, 'shin?', name.includes('신'));
    opts.push({ name, times, hasShin: name.includes('신오사카') || (await page.locator('#description').inputValue().catch(() => '')).includes('신오사카') });
    await tempThenNext(page, `verify-${idx}`);
  }
  return { titleHasShin, titleHasOsaka, opts };
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const ctx = browser.contexts()[0];
  let page =
    ctx.pages().find((p) => (p.url() || '').includes('tour.triple.partners')) || ctx.pages()[0];
  await page.bringToFront().catch(() => {});
  await stayIfLeave(page);
  console.log('start', page.url());
  console.log('TASK: 大阪站 文案仅大阪站 + 时间07-21:30; no 提交审核');

  if (!(await resolveProduct(page))) throw new Error('cannot find 大阪站 draft');

  await fixProductNameAndIntro(page);
  const fixes = await fixOptions(page);
  const v = await verify(page);

  await page.goto(`${BASE}/option?id=${PRODUCT_ID}&status=UNPUBLISHED&lang=zh-tw`, {
    waitUntil: 'domcontentloaded',
  });
  await sleep(1500);
  await clickTempSave(page, 'final-list');

  console.log('\n========== DONE 大阪站 ==========');
  console.log(JSON.stringify({ PRODUCT_ID, fixes, verify: v }, null, 2));
  console.log('提交审核 NOT clicked');
  console.log('STOP for user check');
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
