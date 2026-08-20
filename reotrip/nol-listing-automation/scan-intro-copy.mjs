/**
 * Scan introduction page copy for Osaka Station + Tokyo Port.
 * Checks: 신오사카 ban, route-type keywords, mid-stop FAQ, airport-HOW leakage.
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';
import { FAQ_MIDSTOP_Q, FAQ_MIDSTOP_A, SPEC_CANCEL_KO } from './lib/transfer-audit-copy.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const JOBS = [
  {
    id: 'c36c1517-89cc-4524-bfdb-fce8df1c2e5c',
    label: '大阪站',
    routeType: 'hotel_station',
    requireAny: [/오사카역/, /역/],
    ban: [/신오사카/, /오사카역\/신오사카/, /항공편/, /공항 픽업/, /터미널/],
    allowSoft: [/열차/, /역 출구/],
  },
  {
    id: '0de15895-41de-48f8-8653-5c47a947c301',
    label: '东京港',
    routeType: 'hotel_port',
    requireAny: [/도쿄항|항|선박|승하선|항구|포트|port/i],
    ban: [/항공편명/, /공항 픽업/, /터미널·역/],
    allowSoft: [/선박/, /항만/, /승하선/],
  },
];

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

async function readIntro(page) {
  return page.evaluate(() => {
    const get = (sel) => {
      const el = document.querySelector(sel);
      return el ? (el.value || el.innerText || '').trim() : '';
    };
    // common field names
    const fields = {};
    for (const name of [
      'headline',
      'highlight',
      'description',
      'usage',
      'checkList',
      'productName',
      'title',
    ]) {
      const el =
        document.querySelector(`textarea[name="${name}"]`) ||
        document.querySelector(`input[name="${name}"]`) ||
        document.querySelector(`#${name}`);
      if (el) fields[name] = (el.value || '').trim();
    }
    // all textareas
    const textareas = Array.from(document.querySelectorAll('textarea')).map((t) => ({
      name: t.name || t.id || '',
      ph: t.placeholder || '',
      v: (t.value || '').slice(0, 500),
      len: (t.value || '').length,
    }));
    // FAQ blocks
    const body = (document.body.innerText || '').slice(0, 8000);
    const faqHits = {
      midQ: body.includes('중간에 다른 장소'),
      midA: body.includes('중간 경유지') || body.includes('지점 간 전용'),
    };
    // product title from header
    const header =
      Array.from(document.querySelectorAll('h1,h2,div'))
        .map((e) => (e.innerText || '').trim())
        .find((t) => t.length > 20 && t.length < 120 && /단독 차량|편도/.test(t)) || '';
    return { fields, textareas, faqHits, header, bodySlice: body.slice(0, 2500) };
  });
}

function audit(job, data) {
  const allText = [
    data.header,
    ...Object.values(data.fields),
    ...data.textareas.map((t) => t.v),
    data.bodySlice,
  ].join('\n');

  const issues = [];
  const ok = [];

  // ban checks
  for (const re of job.ban) {
    if (re.test(allText)) issues.push(`禁词命中: ${re}`);
  }
  // require at least one
  if (!job.requireAny.some((re) => re.test(allText))) {
    issues.push(`缺线路关键词: ${job.requireAny.map((r) => r.toString()).join('|')}`);
  } else {
    ok.push('线路关键词有命中');
  }

  // FAQ
  if (!data.faqHits.midQ) issues.push('缺 FAQ mid-stop Q (중간에 다른 장소)');
  else ok.push('FAQ Q 有');
  if (!data.faqHits.midA) issues.push('缺 FAQ mid-stop A (중간 경유지/지점 간)');
  else ok.push('FAQ A 有');

  // 大阪站 special
  if (job.label === '大阪站') {
    if (/신오사카/.test(allText)) issues.push('硬禁 신오사카역 出现在介绍');
    else ok.push('无 신오사카');
    if (!/오사카역/.test(allText)) issues.push('介绍未见 오사카역');
  }
  if (job.label === '东京港') {
    if (/도쿄항|도쿄 항|항/.test(allText)) ok.push('有港相关词');
  }

  // empty critical fields
  const nonEmptyTA = data.textareas.filter((t) => t.len > 20);
  if (nonEmptyTA.length < 2) issues.push(`textarea 非空过少 (${nonEmptyTA.length})`);

  return { issues, ok, nonEmptyTA: nonEmptyTA.map((t) => ({ name: t.name, len: t.len, head: t.v.slice(0, 80) })) };
}

const { page } = await connectNolPage({
  selfHint: 'scan-intro',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

const results = [];
for (const job of JOBS) {
  console.log(`\n======== 扫介绍 ${job.label} ========`);
  await dismiss(page);
  await page.goto(introUrl(job.id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
  await dismiss(page);

  // if redirected or need click stepper
  const url = page.url();
  console.log('【读回】url', url);

  const data = await readIntro(page);
  console.log('【读回】header', data.header.slice(0, 80));
  console.log('【读回】fields', Object.keys(data.fields), data.fields);
  console.log(
    '【读回】textareas',
    data.textareas.map((t) => `${t.name || t.ph || '?'}:${t.len}`),
  );
  console.log('【读回】faq', data.faqHits);

  const a = audit(job, data);
  console.log('【读回】ok', a.ok);
  console.log('【读回】issues', a.issues);
  console.log('【读回】非空字段样例', a.nonEmptyTA);

  // dump more body keywords
  const body = data.bodySlice;
  const kw = {
    신오사카: /신오사카/.test(body),
    오사카역: /오사카역/.test(body),
    도쿄항: /도쿄항|도쿄 항/.test(body),
    항공편: /항공편/.test(body),
    공항: /공항/.test(body),
    역출구: /역\s*출구|역 출구/.test(body),
    선박: /선박|승하선/.test(body),
    midFAQ: data.faqHits.midQ && data.faqHits.midA,
  };
  console.log('【读回】关键词', kw);
  console.log(a.issues.length ? `【结果】NEED_FIX ${job.label}` : `【结果】PASS ${job.label}`);
  results.push({
    label: job.label,
    id: job.id,
    issues: a.issues,
    ok: a.ok,
    kw,
    fields: data.fields,
    textareas: a.nonEmptyTA,
    pass: a.issues.length === 0,
  });
}

console.log('\nSUMMARY', JSON.stringify(results, null, 2));
process.exit(results.some((r) => !r.pass) ? 2 : 0);
