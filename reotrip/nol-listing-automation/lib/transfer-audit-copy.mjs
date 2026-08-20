/**
 * Post-review hard constants for Japan/private transfer products
 * (§57 · audit 2026-08 + **3.0 覆盖 2026-08-14**)
 */

export const SPEC_CANCEL_KO =
  '예약 확정 후 취소 요청은 협력사 확인 후 처리됩니다. 이용일 기준 영업일 2일 전까지 취소 시 100% 환불 가능하며, 이후에는 취소 및 환불이 불가합니다.';

export const FAQ_MIDSTOP_Q = '중간에 다른 장소에서 승하차할 수 있나요?';
export const FAQ_MIDSTOP_A =
  '본 서비스는 출발지에서 목적지까지 바로 이동하는 지점 간 전용 차량 서비스입니다. 중간 경유지 추가 또는 중간 승하차는 제공되지 않습니다.';

export const FAQ_MIDSTOP = { q: FAQ_MIDSTOP_Q, a: FAQ_MIDSTOP_A };

/** 3.0：完整 5 条 FAQ 样板（读自东京站 09714a30 live 2026-08-14） */
export const FAQ_SET_STATION = [
  {
    q: '차량은 어떻게 선택하나요?',
    a: '탑승 인원과 수하물 수량에 맞춰 선택해 주세요. 7인승 차량은 최대 4명 및 24인치 수하물 5개 기준, 10인승 차량은 최대 9명 및 26인치 수하물 10개 기준입니다.',
  },
  {
    q: '바우처를 제시해야 하나요?',
    a: '별도 티켓, 바우처 또는 교환권 제시는 필요하지 않습니다. 기사님이 보통 이용일 전날 WhatsApp 또는 SMS로 연락드립니다.',
  },
  {
    q: '예약 후 픽업 정보를 변경할 수 있나요?',
    a: '픽업 노선, 픽업 시간, 주소, 열차 정보 등 변경 요청은 최소 이용 2일 전까지 알려 주세요. 기한 이후에는 변경이 어려울 수 있습니다.',
  },
  {
    q: '열차 정보는 왜 필요한가요?',
    a: '역 승하차 또는 픽업 장소와 이용 시간을 정확히 확인하기 위해 필요합니다. 예약 시 열차명, 도착 또는 출발 시간 등 확인 가능한 정보를 입력해 주세요.',
  },
  FAQ_MIDSTOP,
];

export const FAQ_SET_AIRPORT = [
  FAQ_SET_STATION[0],
  FAQ_SET_STATION[1],
  {
    q: '예약 후 픽업 정보를 변경할 수 있나요?',
    a: '픽업 노선, 픽업 시간, 주소, 항공편 정보 등 변경 요청은 최소 이용 2일 전까지 알려 주세요. 기한 이후에는 변경이 어려울 수 있습니다.',
  },
  {
    q: '항공편 정보는 왜 필요한가요?',
    a: '공항 터미널·픽업 장소와 이용 시간을 정확히 확인하기 위해 필요합니다. 예약 시 항공편명, 도착 또는 출발 시간, 터미널 정보를 입력해 주세요.',
  },
  FAQ_MIDSTOP,
];

export const FAQ_SET_PORT = [
  FAQ_SET_STATION[0],
  FAQ_SET_STATION[1],
  {
    q: '예약 후 픽업 정보를 변경할 수 있나요?',
    a: '픽업 노선, 픽업 시간, 주소, 선박 정보 등 변경 요청은 최소 이용 2일 전까지 알려 주세요. 기한 이후에는 변경이 어려울 수 있습니다.',
  },
  {
    q: '선박 정보는 왜 필요한가요?',
    a: '항만 승하차 위치가 상황에 따라 달라질 수 있어 정확한 기사 배정과 픽업 안내를 위해 선박명, 승선 또는 하선 정보가 필요합니다.',
  },
  FAQ_MIDSTOP,
];

export const FAQ_SET_HOTEL_ATTRACTION = [
  FAQ_SET_STATION[0],
  FAQ_SET_STATION[1],
  {
    q: '예약 후 픽업 정보를 변경할 수 있나요?',
    a: '픽업 노선, 픽업 시간, 주소 등 변경 요청은 최소 이용 2일 전까지 알려 주세요. 기한 이후에는 변경이 어려울 수 있습니다.',
  },
  {
    q: '픽업 장소는 어떻게 정해지나요?',
    a: '예약 시 입력한 호텔 주소 또는 지정 픽업/샌딩 장소를 기준으로 합니다. 정확한 위치는 기사님 연락 시 다시 확인해 주세요.',
  },
  FAQ_MIDSTOP,
];

/** Normalize audit aliases (airport_related → hotel_airport) */
export function normalizeRouteType(routeType) {
  const t = String(routeType || '');
  if (/airport/i.test(t)) return 'hotel_airport';
  if (/port/i.test(t) && !/airport/i.test(t)) return 'hotel_port';
  if (/station/i.test(t)) return 'hotel_station';
  if (/hotel_hotel|hotel-hotel/i.test(t)) return 'hotel_hotel';
  if (/attraction|hotel_attraction/i.test(t)) return 'hotel_attraction';
  return t || 'hotel_attraction';
}

/** @param {string} routeType hotel_station|hotel_airport|hotel_port|hotel_attraction|hotel_hotel|airport_related|... */
export function faqSetForRoute(routeType) {
  switch (normalizeRouteType(routeType)) {
    case 'hotel_airport':
    case 'station_airport':
    case 'port_airport':
    case 'airport_hotel':
    case 'airport_attraction':
      return FAQ_SET_AIRPORT;
    case 'hotel_station':
    case 'station_hotel':
      return FAQ_SET_STATION;
    case 'hotel_port':
    case 'port_hotel':
      return FAQ_SET_PORT;
    case 'hotel_hotel':
    case 'hotel_attraction':
    default:
      return FAQ_SET_HOTEL_ATTRACTION;
  }
}

export function howToUseLine3(routeType) {
  switch (normalizeRouteType(routeType)) {
    case 'hotel_airport':
    case 'station_airport':
    case 'port_airport':
    case 'airport_hotel':
    case 'airport_attraction':
      return '3.예약 시 항공편명, 도착 또는 출발 시간, 터미널, 픽업/샌딩 장소, 인원 및 수하물을 정확히 입력해 주세요.';
    case 'hotel_station':
      return '3.예약 시 호텔명·주소, 역 출구/미팅 장소, 픽업/샌딩 시간, 인원 및 수하물을 정확히 입력해 주세요.';
    case 'hotel_port':
    case 'port_hotel':
      return '3.예약 시 호텔명·주소, 항만 승하차 장소, 선박명 및 승하선 정보, 이용 시간, 인원 및 수하물을 정확히 입력해 주세요.';
    case 'hotel_hotel':
    case 'hotel_attraction':
    default:
      return '3.예약 시 호텔명·주소, 픽업/샌딩 장소, 이용 시간, 인원 및 수하물을 정확히 입력해 주세요.';
  }
}

export function buildHowToUse(routeType) {
  return [
    '1.문의사항이 있으실 경우 이메일 agency@reotrip.com 또는 전화 +852 3428 81 82 로 언제든지 연락해 주세요.',
    '2.예약은 접수 후 영업일 기준 3일 이내에 확정되며, 확정이 어려운 경우 별도로 안내해 드립니다. (영업일 기준은 현지 시간에 따릅니다)',
    howToUseLine3(routeType),
  ].join('\n\n');
}

/**
 * 3.0：须知「일정 알아야 할」会和地点行 — 按线路类型，禁止酒店产品写 교토역/机场
 * @returns {{ko:string, ban?:RegExp}} 
 */
export function mustKnowMeetingLine(routeType, poiHint = '') {
  switch (routeType) {
    case 'hotel_station':
      return {
        ko: `미팅 장소: 호텔 주소와 ${poiHint || '역'} 픽업/샌딩 장소·이용 시간을 정확히 입력해 주세요.`,
        ban: /공항|항공편/,
      };
    case 'hotel_airport':
    case 'airport_hotel':
      return {
        ko: '미팅 장소: 호텔 주소와 공항 터미널·픽업/샌딩 장소, 항공편 정보, 이용 시간을 정확히 입력해 주세요.',
      };
    case 'hotel_port':
    case 'port_hotel':
      return {
        ko: '미팅 장소: 호텔 주소와 항만 승하차 장소, 선박명·승하선 정보, 이용 시간을 정확히 입력해 주세요.',
      };
    case 'hotel_hotel':
    case 'hotel_attraction':
    default:
      return {
        ko: '미팅 장소: 호텔 주소와 픽업/샌딩 장소·이용 시간을 정확히 입력해 주세요.',
        ban: /역 출구|교토역|도쿄역|오사카역|항공편|터미널|공항 픽업/,
      };
  }
}

function setReactValue(el, val) {
  if (!el) return false;
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc.set.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

async function ensureFaqRows(page, need) {
  for (let guard = 0; guard < need + 3; guard++) {
    const n = await page.evaluate(() => {
      let c = 0;
      for (let i = 0; i < 12; i++) {
        if (document.querySelector(`input[name="faqs.${i}.question"]`)) c++;
      }
      return c;
    });
    if (n >= need) return n;
    const addBtn = page.getByText(/添加问答|添加問答|추가.*질문/i).first();
    if (await addBtn.count()) {
      await addBtn.scrollIntoViewIfNeeded().catch(() => {});
      await addBtn.click({ timeout: 4000 }).catch(() => {});
    } else {
      await page.evaluate(() => {
        const hit = Array.from(document.querySelectorAll('button,a,div,span')).find((e) => {
          const t = (e.innerText || '').replace(/\s+/g, ' ').trim();
          return /添加问答|添加問答/.test(t) && t.length < 20;
        });
        hit?.click();
      });
    }
    await page.waitForTimeout(500);
  }
  return page.evaluate(() => {
    let c = 0;
    for (let i = 0; i < 12; i++) {
      if (document.querySelector(`input[name="faqs.${i}.question"]`)) c++;
    }
    return c;
  });
}

/**
 * Ensure mid-stop exists (legacy). Prefer fillTransferFaqsFull for 3.0.
 */
export async function fillTransferFaqs(page, extra = []) {
  return fillTransferFaqsFull(page, 'hotel_attraction', { extra, midOnly: true });
}

/**
 * 3.0：按线路类型写入完整 5 条 FAQ。
 * Live 验收（横滨/HND 2026-08-14）：**必须** 文案点「添加问答」逐行扩行 + Playwright `locator.fill` 逐行写入；
 * 禁止 evaluate 批量 setReact 后立刻 tempSave（会灰掉 保存然后/临时保存 且不落盘）。
 * 落盘：优先点 **保存然后**（enabled）；灰则临时保存。
 *
 * @param {import('playwright').Page} page
 * @param {string} routeType
 * @param {{ force?: boolean, extra?: {q:string,a:string}[], midOnly?: boolean, save?: boolean }} [opts]
 */
export async function fillTransferFaqsFull(page, routeType = 'hotel_attraction', opts = {}) {
  const { force = false, extra = [], midOnly = false, save = false } = opts;
  const pairs = midOnly ? [FAQ_MIDSTOP, ...extra] : [...faqSetForRoute(routeType), ...extra];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  if (!force && !midOnly) {
    const n = await page.evaluate(() => {
      let c = 0;
      for (let i = 0; i < 12; i++) {
        const q = document.querySelector(`input[name="faqs.${i}.question"]`);
        const a = document.querySelector(`textarea[name="faqs.${i}.answer"]`);
        if (q && (q.value || '').trim() && a && (a.value || '').trim()) c++;
      }
      return c;
    });
    const hasMid = await page.evaluate((q) => {
      for (let i = 0; i < 12; i++) {
        const el = document.querySelector(`input[name="faqs.${i}.question"]`);
        if (el && (el.value || '').includes(q.slice(0, 10))) return true;
      }
      return false;
    }, FAQ_MIDSTOP_Q);
    if (n >= 5 && hasMid) {
      return { mode: 'already-full', filled: n, n, mid: true, ok: true };
    }
  }

  if (midOnly) {
    const existing = await page.evaluate((q) => {
      const qs = Array.from(document.querySelectorAll('input[name^="faqs."][name$=".question"]'));
      return qs.some((el) => (el.value || '').includes(q.slice(0, 12)));
    }, FAQ_MIDSTOP_Q);
    if (existing && !force) return { mode: 'already-mid', filled: 1, ok: true };
    // mid-only: ensure 1 row and fill mid
    await ensureFaqRows(page, 1);
    const qLoc = page.locator('input[name="faqs.0.question"]');
    const aLoc = page.locator('textarea[name="faqs.0.answer"]');
    if (await qLoc.count()) {
      await qLoc.fill(FAQ_MIDSTOP_Q);
      if (await aLoc.count()) await aLoc.fill(FAQ_MIDSTOP_A);
    }
    return { mode: 'mid', filled: 1, ok: true };
  }

  // one-by-one add rows (Playwright click — Formik-safe)
  for (let guard = 0; guard < pairs.length + 3; guard++) {
    const rows = await page.evaluate(() => {
      let c = 0;
      for (let i = 0; i < 12; i++) {
        if (document.querySelector(`input[name="faqs.${i}.question"]`)) c++;
      }
      return c;
    });
    if (rows >= pairs.length) break;
    const addBtn = page.getByText(/添加问答|添加問答/).first();
    if (await addBtn.count()) {
      await addBtn.scrollIntoViewIfNeeded().catch(() => {});
      await addBtn.click({ timeout: 4000 }).catch(() => {});
    }
    await sleep(600);
  }

  // fill each row with locator.fill (not evaluate bulk)
  for (let i = 0; i < pairs.length; i++) {
    const qLoc = page.locator(`input[name="faqs.${i}.question"]`);
    const aLoc = page.locator(`textarea[name="faqs.${i}.answer"]`);
    if (!(await qLoc.count())) continue;
    await qLoc.scrollIntoViewIfNeeded().catch(() => {});
    await qLoc.click({ timeout: 3000 }).catch(() => {});
    await qLoc.fill(pairs[i].q);
    if (await aLoc.count()) {
      await aLoc.click({ timeout: 2000 }).catch(() => {});
      await aLoc.fill(pairs[i].a);
      await aLoc.press('Tab').catch(() => {});
    }
    await sleep(120);
  }

  const verify = await page.evaluate((need) => {
    let n = 0;
    let mid = false;
    const qs = [];
    for (let i = 0; i < 12; i++) {
      const q = document.querySelector(`input[name="faqs.${i}.question"]`);
      const a = document.querySelector(`textarea[name="faqs.${i}.answer"]`);
      if (q && (q.value || '').trim() && a && (a.value || '').trim()) {
        n++;
        qs.push((q.value || '').slice(0, 24));
      }
      if (q && (q.value || '').includes('중간에')) mid = true;
    }
    return { n, mid, qs, ok: n >= need && mid };
  }, pairs.length);

  let saveMode = 'none';
  if (save && verify.ok) {
    // 3.0 live：多行 FAQ **只信 保存然后**；temp 会丢新增行（横滨/哈利 2026-08-14 踩坑）
    let enabled = false;
    for (let t = 0; t < 16; t++) {
      enabled = await page.evaluate(() => {
        const st = Array.from(document.querySelectorAll('button')).find((b) =>
          /保存然后|保存然後/.test((b.innerText || '').trim()),
        );
        return !!(st && !st.disabled);
      });
      if (enabled) break;
      await sleep(500);
    }
    if (enabled) {
      await page.getByRole('button', { name: /保存然后|保存然後/ }).first().click();
      await sleep(3200);
      saveMode = 'saveThen';
    } else {
      saveMode = 'saveThen-disabled';
      verify.ok = false; // force caller re-check — do not tempSave multi-FAQ
    }
  }

  return {
    mode: 'full5-onebyone',
    filled: verify.n,
    saveMode,
    ...verify,
  };
}

export async function fillSpecCancel(page, text = SPEC_CANCEL_KO) {
  const loc = page.locator('textarea[name=specificCancelPolicy]');
  if (!(await loc.count())) {
    return { ok: false, reason: 'no field' };
  }
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.click({ timeout: 5000 }).catch(() => {});
  await loc.fill('');
  await loc.fill(text);
  await loc.press('Tab').catch(() => {});
  await page.evaluate((txt) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy], #specificCancelPolicy');
    if (!ta) return;
    const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    s.call(ta, txt);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    ta.blur?.();
  }, text);
  await loc.fill(text).catch(() => {});
  const v = await loc.inputValue().catch(() => '');
  return {
    ok: v.includes('예약 확정 후 취소') && v.includes('영업일 2일'),
    len: v.length,
    preview: v.slice(0, 50),
  };
}

export async function fillHowToUse(page, routeType) {
  const text = buildHowToUse(routeType);
  const loc = page.locator('#usage, textarea[name=usage]').first();
  if (!(await loc.count())) return { ok: false };
  await loc.fill(text);
  const v = await loc.inputValue();
  return { ok: v.length > 20, preview: v.slice(-80) };
}

/**
 * Scan checklist textareas for banned route-mismatch phrases (3.0 须知串站).
 * Does not auto-rewrite whole block — returns hits for agent to定点 fix.
 */
export async function scanMustKnowBan(page, routeType) {
  const { ban } = mustKnowMeetingLine(routeType);
  if (!ban) return { ok: true, hits: [] };
  return page.evaluate((reSrc) => {
    const re = new RegExp(reSrc, 'i');
    const hits = [];
    for (const el of document.querySelectorAll('textarea, input')) {
      const name = el.name || el.id || '';
      const v = el.value || '';
      if (!v) continue;
      if (/checkList|checklist|usage|description|highlight|must|know|注意|알아야/i.test(name + (el.placeholder || ''))) {
        if (re.test(v)) hits.push({ name, preview: v.slice(0, 80) });
      }
    }
    // also body 一定要知道 section
    const body = document.body.innerText || '';
    if (re.test(body) && /일정 알아야|一定要知道|须知/.test(body)) {
      hits.push({ name: 'body-mustknow', preview: 'body contains banned POI' });
    }
    return { ok: hits.length === 0, hits };
  }, ban.source);
}
