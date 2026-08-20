/**
 * Find Yokohama-related drafts + quick option/price/times audit.
 * Excel 东京市区-横滨港 expected HKD 112/134.
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss, optionUrl, regsUrl } from './lib/japan-audit-fix.mjs';
import { SPEC_CANCEL_KO, FAQ_MIDSTOP_Q } from './lib/transfer-audit-copy.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LIST =
  'https://tour.triple.partners/product-management/products?status=UNPUBLISHED&lang=zh-tw';
function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

const KNOWN = [
  { id: '885023cc-f518-433f-916c-ca2a056df00f', label: '横滨市区-横滨港(yhp)', expect: [112, 134, 112, 134] },
];

async function listTitles(page) {
  return page.evaluate(() => {
    function isTitle(t) {
      return (
        t.length > 15 &&
        t.length < 90 &&
        /편도 이동 \(\d+인승 차량\)$/.test(t) &&
        !/도착|최대|수하물/.test(t)
      );
    }
    const titles = Array.from(document.querySelectorAll('div'))
      .filter((d) => d.children.length === 0)
      .map((d) => (d.innerText || '').trim())
      .filter(isTitle);
    const out = [];
    for (const t of titles) if (out[out.length - 1] !== t) out.push(t);
    return out;
  });
}

async function auditProduct(page, { id, label, expect }) {
  console.log(`\n======== ${label} ${id.slice(0, 8)} ========`);
  await dismiss(page);
  await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  await dismiss(page);

  const titles = await listTitles(page);
  const modN = await page.locator('button').filter({ hasText: /修改选项|修改選項/ }).count();
  console.log('【读回】选项 titles=', titles.length, 'mods=', modN, titles);

  // open each option: price from calendar + times compact
  const opts = [];
  for (let i = 0; i < Math.min(modN, 8); i++) {
    await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(1800);
    await dismiss(page);
    await page.getByRole('button', { name: /修改选项|修改選項/ }).nth(i).click();
    await sleep(2200);
    for (let w = 0; w < 25; w++) {
      if (await page.locator('#name').inputValue().catch(() => '')) break;
      await sleep(200);
    }
    const name = await page.locator('#name').inputValue().catch(() => '');
    const body = await page.evaluate(() => {
      const text = document.body.innerText || '';
      // times compact after 时间段
      let times = { count: 0, first: '', last: '' };
      const m = text.match(/时间段[^\n]*\n([^\n]+)/) || text.match(/時間段[^\n]*\n([^\n]+)/);
      if (m) {
        const parts = m[1]
          .split(/[·•|]/)
          .map((s) => s.trim())
          .filter((s) => /^\d{2}:\d{2}$/.test(s));
        times = { count: parts.length, first: parts[0] || '', last: parts[parts.length - 1] || '', raw: m[1].slice(0, 80) };
      }
      // calendar prices day\nprice
      const prices = [];
      const re = /(?:^|\n)(\d{1,2})\n([\d,]+)(?=\n|$)/g;
      let mm;
      while ((mm = re.exec(text)) && prices.length < 40) {
        prices.push(mm[2].replace(/,/g, ''));
      }
      const uniq = [...new Set(prices)];
      return { times, uniq, sample: prices.slice(0, 5) };
    });
    const exp = expect?.[i];
    const priceOk = exp != null && body.uniq.some((p) => String(p) === String(exp));
    const timesOk = body.times.count === 30 && body.times.first === '07:00' && body.times.last === '21:30';
    console.log(
      `【读回】opt${i}`,
      name.slice(0, 45),
      'price uniq=',
      body.uniq.slice(0, 4),
      'exp=',
      exp,
      'priceOk=',
      priceOk,
      'times=',
      body.times,
      'timesOk=',
      timesOk,
    );
    opts.push({ i, name: name.slice(0, 60), uniq: body.uniq, exp, priceOk, times: body.times, timesOk });
    // leave without save
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(300);
    await page.getByText(/^消除$/).first().click({ timeout: 500 }).catch(() => {});
  }

  // intro FAQ + regs cancel
  await page.goto(introUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  const faq = await page.evaluate((q) => {
    const qs = Array.from(document.querySelectorAll('input[name^="faqs."],textarea[name^="faqs."]'));
    const pairs = [];
    for (let i = 0; i < 10; i++) {
      const qi = document.querySelector(`input[name="faqs.${i}.question"],textarea[name="faqs.${i}.question"]`);
      const ai = document.querySelector(`textarea[name="faqs.${i}.answer"],input[name="faqs.${i}.answer"]`);
      if (!qi && !ai) continue;
      pairs.push({ i, q: (qi?.value || '').trim(), a: (ai?.value || '').trim().slice(0, 80) });
    }
    return {
      pairs,
      mid: pairs.some((p) => p.q.includes('중간에 다른 장소') && /중간 경유지|지점 간/.test(p.a)),
    };
  }, FAQ_MIDSTOP_Q);
  console.log('【读回】FAQ mid=', faq.mid, 'count=', faq.pairs.length);

  await page.goto(regsUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  const cancel = await page.evaluate((exact) => {
    const ta = document.querySelector('textarea[name=specificCancelPolicy]');
    const v = (ta?.value || '').trim();
    return { exact: v === exact, preview: v.slice(0, 60), len: v.length };
  }, SPEC_CANCEL_KO);
  console.log('【读回】SPEC_CANCEL exact=', cancel.exact, cancel.preview);

  // resv summary
  const resv = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const empty = /您必須輸入代表|须填写「代表|请选择代表/.test(body);
    const slice = (body.match(/代表预约信息[\s\S]{0,200}/) || [''])[0].replace(/\s+/g, ' ').slice(0, 160);
    return {
      empty,
      hasPhone: /电话|手機|휴대폰|Phone/i.test(slice + body),
      hasFlight: /航班|항공|flight/i.test(slice),
      slice,
    };
  });
  console.log('【读回】预约', resv);

  const unique = new Set(titles).size;
  const pass =
    titles.length === 4 &&
    unique === 4 &&
    opts.length === 4 &&
    opts.every((o) => o.timesOk) &&
    (expect ? opts.every((o) => o.priceOk) : true) &&
    faq.mid &&
    cancel.exact &&
    !resv.empty;

  console.log(pass ? `【结果】PASS ${label}` : `【结果】NEED_FIX ${label}`);
  return { label, id, titles, modN, opts, faq: faq.mid, cancel, resv, pass };
}

async function searchList(page) {
  console.log('【将要】产品列表搜 요코하마/横滨');
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  await dismiss(page);

  const hits = [];
  for (const kw of ['요코하마', '横滨', '요코하마항']) {
    // try search box
    const box =
      page.getByPlaceholder(/搜索|搜尋|검색/).first() ||
      page.locator('input[type=search]').first();
    if (await page.locator('input[type=search], input[placeholder*="搜"], input[placeholder*="검"]').count()) {
      const inp = page.locator('input[type=search], input[placeholder*="搜"], input[placeholder*="검"]').first();
      await inp.fill('');
      await inp.fill(kw);
      await inp.press('Enter').catch(() => {});
      await sleep(2000);
    }
    const cards = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div[class*="slot___StyledContainer"], div[class*="StyledContainer"]'));
      const list = nodes.length
        ? nodes
        : Array.from(document.querySelectorAll('div')).filter((d) => {
            const t = (d.innerText || '').trim();
            return t.length > 30 && t.length < 400 && /단독 차량|接送|편도/.test(t);
          });
      return list
        .map((d) => (d.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120))
        .filter((t) => /요코하마|横滨|横浜/.test(t))
        .slice(0, 15);
    });
    // also body scan
    const bodyHits = await page.evaluate(() => {
      const t = document.body.innerText || '';
      const lines = t.split('\n').map((s) => s.trim()).filter((s) => /요코하마|横滨/.test(s) && s.length < 100);
      return [...new Set(lines)].slice(0, 20);
    });
    hits.push({ kw, cards: cards.slice(0, 10), bodyHits });
    console.log('【读回】search', kw, 'cards', cards.length, cards.slice(0, 5));
    console.log('【读回】body lines', bodyHits.slice(0, 8));
  }
  return hits;
}

const { page } = await connectNolPage({
  selfHint: 'find-yoko',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const listHits = await searchList(page);
const results = [];
for (const p of KNOWN) {
  try {
    results.push(await auditProduct(page, p));
  } catch (e) {
    console.log('ERR', p.label, e.message);
    results.push({ label: p.label, err: String(e.message).slice(0, 200) });
  }
}

// if list found 东京市区-横滨港 style, try extract id from URL after click
console.log('\nLIST_HITS', JSON.stringify(listHits, null, 2).slice(0, 2000));
console.log('\nSUMMARY', JSON.stringify(results, null, 2));
console.log('未点提交审核');
process.exit(results.some((r) => r.err || r.pass === false) ? 2 : 0);
