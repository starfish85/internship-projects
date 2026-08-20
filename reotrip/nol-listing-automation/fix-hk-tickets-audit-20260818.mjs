/**
 * 定点修 2026-08-18 HK 门票检查 FAIL（用户当轮点名）
 * phases: ocean-intro | ocean-rep | tussauds-copy | pkg-names | palace-spec | verify
 * 不改售价、不传图、不点提交审核
 */
import { connectNolPage } from './lib/cdp-session.mjs';

const PHASE = process.argv[2] || 'verify';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const IDS = {
  ocean: '2cb55b01-a00c-4860-b0ea-03ae2bf14d94',
  tussauds: 'ec3982e0-3c90-4a89-9945-f43696602ff3',
  palace: 'fcb0a1ea-1e3e-4f7c-b91f-d2f0a5391b3e',
};

const OCEAN = {
  headline: '홍콩 오션파크에서 하루 종일 신나는 어드벤처를 즐겨보세요!',
  highlight: [
    '홍콩 오션파크 1일 입장권 · 성인권(만 12세+) / 아동권(만 3-11세)',
    '아동권은 단독 구매 불가 · 성인권과 함께 구매',
    '이메일 전자티켓/이용 안내 · 예약 시 영문 성명·여권번호 필수',
  ].join('\n'),
  how: `1. 예약 확정 후, 이용일 기준 보통 7일 이내에 이메일로 전자티켓 또는 이용 안내를 수령합니다.

2. 안내에 따라 지정 입구에 맞춰 입장합니다.

3. 문의: agency@reotrip.com / +852 3428 81 82`,
  intro: `홍콩 오션파크(Ocean Park Hong Kong) 1일 입장권입니다.
롤러코스터·해양 생물·판다 등 다양한 어트랙션과 전시를 하루 동안 즐길 수 있습니다.

포함 사항:
- 선택한 1일 입장권 1매 (성인 만 12세 이상 또는 아동 만 3-11세)

이용 안내:
- 티켓/이용 안내는 이용일 기준 보통 7일 이내에 예약 시 입력한 이메일로 발송됩니다. 이메일 주소가 정확하고 첨부파일을 수신할 수 있는지 확인해 주세요.
- 모든 이용자의 영문 성명과 여권번호를 예약 시 정확히 입력해 주세요.
- 만 12세 이상은 성인권, 만 3-11세는 아동권을 구매해야 합니다.
- 아동권은 단독 구매가 불가하며 동일 주문 내 성인권과 함께 구매해야 합니다.

홍콩 대표 테마파크를 즐기고 싶은 분들께 추천합니다.`,
  must: `1. 티켓/이용 안내는 이용일 기준 보통 7일 이내에 예약 이메일로 발송됩니다. 이메일이 실제 수신 가능하고 첨부파일을 받을 수 있는지 확인해 주세요.

2. 모든 이용자의 영문 성명과 여권번호를 예약 시 정확히 입력해 주세요.

3. 만 12세 이상은 성인권, 만 3-11세는 아동권을 구매해야 합니다. 아동권은 동일 주문 내 성인권과 함께 구매해야 하며 단독 구매가 불가합니다.

4. 입장·이용 규정은 이메일 전자티켓/이용 안내 및 현장 공지를 따릅니다.`,
};

const TUSSAUDS = {
  headline: '홍콩 마담 투소에서 유명인 왁스 피규어를 만나보세요!',
  highlight: [
    '마담 투소 홍콩 1일 입장권 · 성인 전용',
    'General Admission (Spirit House 미포함)',
    '이메일 전자티켓/이용 안내 · 예약 시 영문 성명·여권번호 필수',
  ].join('\n'),
  how: `1. 예약 확정 후, 이용일 기준 보통 7일 이내에 이메일로 전자티켓 또는 이용 안내를 수령합니다.

2. 안내에 따라 지정 입구에 맞춰 입장합니다.

3. 문의: agency@reotrip.com / +852 3428 81 82`,
  intro: `홍콩 마담 투소(Madame Tussauds Hong Kong) 1일 입장권입니다.
유명인·스타 왁스 피규어를 가까이에서 관람할 수 있습니다.

포함 사항:
- General Admission Ticket 1매 (성인) — Spirit House 미포함

이용 안내:
- 티켓/이용 안내는 이용일 기준 보통 7일 이내에 예약 시 입력한 이메일로 발송됩니다. 이메일 주소가 정확하고 첨부파일을 수신할 수 있는지 확인해 주세요.
- 모든 이용자의 영문 성명과 여권번호를 예약 시 정확히 입력해 주세요.
- 본 상품은 성인 전용입니다.

홍콩에서 왁스 뮤지엄을 즐기고 싶은 분들께 추천합니다.`,
  must: `1. 티켓/이용 안내는 이용일 기준 보통 7일 이내에 예약 이메일로 발송됩니다. 이메일이 실제 수신 가능하고 첨부파일을 받을 수 있는지 확인해 주세요.

2. 예약 시 모든 이용자의 영문 성명과 여권번호를 정확히 입력해 주세요. 미입력 시 이용이 제한될 수 있습니다.

3. 본 상품은 성인 전용이며 아동/노인 요금은 판매하지 않습니다.

4. 본 상품은 General Admission이며 Spirit House는 포함되지 않습니다.

5. 입장·이용 규정은 이메일 전자티켓/이용 안내 및 현장 공지를 따릅니다.`,
  optDesc: `홍콩 마담 투소 1일 입장권
General Admission · Spirit House 미포함
성인 전용
이메일 전자티켓/이용 안내 기준 입장
예약 시 영문 성명·여권번호 필수`,
};

// 对齐故宫已有 windows.0 deadline=2 / penalty=0，不另造窗口
const PALACE_SPEC =
  '이용일 기준 2일 전까지 취소 시 100% 환불 가능하며, 이후에는 취소 및 환불이 불가합니다.';

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}
function regsUrl(id) {
  return `https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

async function dismiss(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => /^(消除|关闭|關閉|取消)$/.test((b.innerText || '').trim()))
      ?.click();
  });
  await sleep(250);
}

async function getProduct(page, id) {
  return page.evaluate(async (pid) => {
    const r = await fetch(`/product-management/api/v3/temporary-products/${pid}`, { credentials: 'include' });
    return { status: r.status, body: await r.json() };
  }, id);
}

async function saveThen(page, label) {
  const dump = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map((x) => {
        const t = (x.innerText || '').trim();
        const r = x.getBoundingClientRect();
        return { t, d: x.disabled, w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((b) => /保存|臨時|临时/.test(b.t)),
  );
  console.log(`[${label}] save buttons`, dump);
  const btn = page
    .locator('button')
    .filter({ hasText: /^(保存然后|保存然後)$/ })
    .filter({ hasNotText: /提交|批准/ });
  const n = await btn.count();
  for (let i = 0; i < n; i++) {
    const el = btn.nth(i);
    const disabled = await el.isDisabled().catch(() => true);
    const box = await el.boundingBox().catch(() => null);
    if (!disabled && box && box.width > 80 && box.height > 20) {
      await el.scrollIntoViewIfNeeded();
      await el.click({ timeout: 8000 });
      console.log(`[${label}] 保存然后 clicked nth=${i}`);
      await sleep(4000);
      return true;
    }
  }
  console.log(`[${label}] 保存然后 NOT clicked n=${n}`);
  return false;
}

async function fillIntro(page, id, copy) {
  await page.goto(introUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  await dismiss(page);
  const pairs = [
    ['#headline', copy.headline],
    ['#highlight', copy.highlight],
    ['#description', copy.intro],
    ['#checkList', copy.must],
    ['#usage', copy.how],
  ];
  for (const [sel, val] of pairs) {
    if (!val) continue;
    const loc = page.locator(sel).first();
    const n = await loc.count();
    if (n === 0) {
      console.log('【读回】缺字段', sel);
      continue;
    }
    await loc.click({ timeout: 8000 }).catch(() => {});
    await loc.fill(val, { timeout: 8000 });
    await loc.press('End').catch(() => {});
    await loc.press('Tab').catch(() => {});
    const got = await loc.inputValue();
    console.log('【读回】fill', sel, 'len', got.length, 'head', got.slice(0, 40).replace(/\n/g, ' '));
  }
  await sleep(800);
  const saved = await saveThen(page, 'intro');
  if (!saved) {
    const reds = await page.evaluate(() =>
      Array.from(document.querySelectorAll('*'))
        .filter((el) => el.children.length <= 1)
        .map((el) => (el.innerText || '').trim())
        .filter((t) => t && t.length < 40 && /请|請/.test(t))
        .slice(0, 8),
    );
    console.log('【结果】FAIL 保存然后灰', reds);
    process.exit(2);
  }
}

async function putOption(page, productId, option, version) {
  const body = {
    ...option,
    productType: 'TICKET_PASS',
    temporaryProductVersion: version,
  };
  return page.evaluate(
    async ({ productId, oid, body }) => {
      const urls = [
        { m: 'PUT', u: `/product-management/api/v3/temporary-products/${productId}/options/${oid}` },
        { m: 'PATCH', u: `/product-management/api/v3/temporary-products/${productId}/options/${oid}` },
      ];
      const tries = [];
      for (const x of urls) {
        const r = await fetch(x.u, {
          method: x.m,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });
        const text = await r.text();
        tries.push({ method: x.m, status: r.status, text: text.slice(0, 240) });
        if (r.status >= 200 && r.status < 300) return { ok: true, tries };
      }
      return { ok: false, tries };
    },
    { productId, oid: option.id, body },
  );
}

function slimOpts(p) {
  return (p.options || []).map((o) => ({
    id: o.id,
    name: o.name,
    desc: o.description,
    prices: (o.prices || []).map((pr) => ({
      type: pr.type,
      name: pr.name,
      representative: pr.representative,
      salePrice: pr.policy?.periods?.[0]?.salePrice,
    })),
  }));
}

function copyBlob(p) {
  const c = p.content || {};
  return [
    c.point?.headline,
    c.point?.highlight,
    c.introduction?.description,
    c.additionalExplanation?.checkList,
    ...(p.options || []).map((o) => o.description),
  ].join('\n');
}

const { page } = await connectNolPage({ selfHint: 'fix-hk-tickets-audit', killPeers: true });
const iw = await page.evaluate(() => window.innerWidth);
console.log('【读回】innerWidth', iw);
if (iw < 1280) {
  console.log('【结果】FAIL 视口过窄');
  process.exit(2);
}

if (PHASE === 'ocean-intro') {
  console.log('【将要】海洋公园 介绍/要点/须知 去성인전용、补儿童不可单卖');
  console.log('【定位】introduction textarea highlight/description/checkList');
  await fillIntro(page, IDS.ocean, OCEAN);
  const { body } = await getProduct(page, IDS.ocean);
  const blob = copyBlob(body);
  const bad = /성인 전용|판매하지 않습니다|여권번호 불필요/.test(blob);
  const good = /아동권/.test(blob) && /단독 구매/.test(blob) && !/아동\/노인 요금은 판매하지/.test(blob);
  console.log('【读回】highlight=', body.content?.point?.highlight);
  console.log('【读回】introHasAdultOnly=', /성인 전용/.test(blob), 'hasChild=', /아동권/.test(blob));
  console.log('【结果】', good && !bad ? 'PASS' : 'FAIL', { bad, good });
  if (!(good && !bad)) process.exit(2);
}

if (PHASE === 'ocean-rep') {
  console.log('【将要】海洋公园 儿童选项 representative=false（成人保持 true）');
  console.log('【定位】PUT options/{id} prices[].representative');
  const { body } = await getProduct(page, IDS.ocean);
  const child = (body.options || []).find((o) => /아동|CHILDREN/i.test(`${o.name} ${o.prices?.[0]?.type}`));
  const adult = (body.options || []).find((o) => /성인|ADULT/i.test(`${o.name} ${o.prices?.[0]?.type}`) && !/아동/.test(o.name));
  console.log('【读回】点前', slimOpts(body));
  if (!child) {
    console.log('【结果】FAIL 无儿童选项');
    process.exit(2);
  }
  const next = JSON.parse(JSON.stringify(child));
  for (const pr of next.prices || []) pr.representative = false;
  const put = await putOption(page, IDS.ocean, next, body.version);
  console.log('【读回】PUT', JSON.stringify(put));
  if (!put.ok) {
    console.log('【结果】FAIL PUT option');
    process.exit(2);
  }
  const after = await getProduct(page, IDS.ocean);
  const sl = slimOpts(after.body);
  const childAfter = sl.find((o) => /아동/.test(o.name));
  const adultAfter = sl.find((o) => /성인/.test(o.name));
  const pass = childAfter?.prices?.[0]?.representative === false && adultAfter?.prices?.[0]?.representative === true;
  console.log('【读回】点后', sl);
  console.log('【结果】', pass ? 'PASS' : 'FAIL');
  if (!pass) process.exit(2);
}

if (PHASE === 'tussauds-copy') {
  console.log('【将要】杜莎 介绍/要点/须知/选项说明 改为预约须护照+英文姓名');
  console.log('【定位】introduction 文案 + PUT option.description');
  await fillIntro(page, IDS.tussauds, TUSSAUDS);
  const { body } = await getProduct(page, IDS.tussauds);
  const opt = (body.options || [])[0];
  if (opt) {
    const next = JSON.parse(JSON.stringify(opt));
    next.description = TUSSAUDS.optDesc;
    const put = await putOption(page, IDS.tussauds, next, body.version);
    console.log('【读回】PUT opt desc', JSON.stringify(put));
    if (!put.ok) process.exit(2);
  }
  const after = await getProduct(page, IDS.tussauds);
  const blob = copyBlob(after.body);
  const bad = /여권번호 불필요|입력이 필요하지 않습니다/.test(blob);
  const good = /여권번호/.test(blob) && /영문 성명/.test(blob);
  console.log('【读回】highlight=', after.body.content?.point?.highlight);
  console.log('【读回】optDesc=', after.body.options?.[0]?.description);
  console.log('【结果】', good && !bad ? 'PASS' : 'FAIL', { bad, good });
  if (!(good && !bad)) process.exit(2);
}

if (PHASE === 'pkg-names') {
  console.log('【将要】杜莎+故宫 价格类型名 成人→성인（价不变）');
  console.log('【定位】PUT options prices[0].name');
  for (const key of ['tussauds', 'palace']) {
    const id = IDS[key];
    const { body } = await getProduct(page, id);
    console.log('【读回】', key, '点前', slimOpts(body));
    let ver = body.version;
    for (const opt of body.options || []) {
      const next = JSON.parse(JSON.stringify(opt));
      let changed = false;
      for (const pr of next.prices || []) {
        if (pr.type === 'ADULT' && pr.name !== '성인') {
          pr.name = '성인';
          changed = true;
        }
      }
      if (!changed) continue;
      const put = await putOption(page, id, next, ver);
      console.log('【读回】PUT', key, opt.name, JSON.stringify(put));
      if (!put.ok) process.exit(2);
      const again = await getProduct(page, id);
      ver = again.body.version;
    }
    const after = await getProduct(page, id);
    const names = slimOpts(after.body).flatMap((o) => o.prices.map((p) => p.name));
    const prices = slimOpts(after.body).flatMap((o) => o.prices.map((p) => p.salePrice));
    const pass = names.every((n) => n !== '成人') && names.includes('성인');
    console.log('【读回】', key, '点后 names=', names, 'prices=', prices);
    console.log('【结果】', key, pass ? 'PASS' : 'FAIL');
    if (!pass) process.exit(2);
  }
}

if (PHASE === 'palace-spec') {
  console.log('【将要】故宫 特殊条款填已有 2 日窗口对应韩文句');
  console.log('【定位】textarea[name=specificCancelPolicy]');
  await page.goto(regsUrl(IDS.palace), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  await dismiss(page);
  const before = await page.evaluate(() => document.querySelector('textarea[name=specificCancelPolicy]')?.value || '');
  console.log('【读回】点前 spec=', JSON.stringify(before));
  const filled = await page.evaluate((txt) => {
    const el = document.querySelector('textarea[name=specificCancelPolicy]');
    if (!el) return { ok: false, reason: 'no textarea' };
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, txt);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, value: el.value };
  }, PALACE_SPEC);
  console.log('【读回】fill', filled);
  if (!filled.ok) {
    const tas = await page.evaluate(() =>
      Array.from(document.querySelectorAll('textarea')).map((t) => ({
        name: t.name,
        ph: t.placeholder,
        v: (t.value || '').slice(0, 40),
      })),
    );
    console.log('【结果】FAIL 无 special textarea', tas);
    process.exit(2);
  }
  const loc = page.locator('textarea[name=specificCancelPolicy]');
  if ((await loc.count()) > 0) await loc.fill(PALACE_SPEC).catch(() => {});
  const saved = await saveThen(page, 'regs');
  if (!saved) process.exit(2);
  const after = await getProduct(page, IDS.palace);
  const spec = after.body.cancelPolicy?.specificCancelPolicy || '';
  const pass = spec.includes('2일') && spec.includes('100%') && spec.trim().length > 10;
  console.log('【读回】API spec=', spec);
  console.log('【读回】cancelType=', after.body.cancelPolicy?.cancelType, 'special=', after.body.cancelPolicy?.specialCancel);
  console.log('【结果】', pass ? 'PASS' : 'FAIL');
  if (!pass) process.exit(2);
}

if (PHASE === 'verify') {
  console.log('【将要】三单复验点名 5 项');
  const out = {};
  for (const [k, id] of Object.entries(IDS)) {
    const { body } = await getProduct(page, id);
    const blob = copyBlob(body);
    out[k] = {
      title: body.title,
      highlight: body.content?.point?.highlight,
      introHit: {
        adultOnlySellNoChild: /아동\/노인 요금은 판매하지/.test(blob),
        childTicket: /아동권/.test(blob),
        noPassportCopy: /여권번호 불필요|입력이 필요하지 않습니다/.test(blob),
        needPassport: /여권번호/.test(blob) && /영문 성명/.test(blob),
      },
      opts: slimOpts(body),
      spec: body.cancelPolicy?.specificCancelPolicy || '',
      cancelType: body.cancelPolicy?.cancelType,
    };
  }
  const fails = [];
  if (out.ocean.introHit.adultOnlySellNoChild || !out.ocean.introHit.childTicket) fails.push('ocean COPY');
  const oChild = out.ocean.opts.find((o) => /아동/.test(o.name));
  const oAdult = out.ocean.opts.find((o) => /성인/.test(o.name));
  if (oChild?.prices?.[0]?.representative !== false) fails.push('ocean REP child');
  if (oAdult?.prices?.[0]?.representative !== true) fails.push('ocean REP adult');
  if (out.tussauds.introHit.noPassportCopy || !out.tussauds.introHit.needPassport) fails.push('tussauds COPY×BOOK');
  const tNames = out.tussauds.opts.flatMap((o) => o.prices.map((p) => p.name));
  const pNames = out.palace.opts.flatMap((o) => o.prices.map((p) => p.name));
  if (tNames.includes('成人') || !tNames.includes('성인')) fails.push('tussauds PKG');
  if (pNames.includes('成人') || !pNames.includes('성인')) fails.push('palace PKG');
  if (!out.palace.spec.includes('2일')) fails.push('palace SPEC');
  console.log(JSON.stringify(out, null, 2));
  console.log('【结果】', fails.length ? 'FAIL' : 'PASS', fails);
  if (fails.length) process.exit(2);
}

console.log('未点提交审核');
process.exit(0);
