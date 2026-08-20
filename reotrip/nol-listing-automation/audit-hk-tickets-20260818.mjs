/**
 * CHECK-only audit for this batch of HK ticket drafts.
 * Madame Tussauds HK / Ocean Park HK / Hong Kong Palace Museum
 * Ticket Final Check + Japan-audit output shape. Never save / never submit.
 */
import { writeFileSync } from 'node:fs';
import { connectNolPage } from './lib/cdp-session.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PRODUCTS = [
  {
    key: 'tussauds',
    listName: 'Madame Tussauds Hong Kong Ticket',
    koHint: /마담 투소|투소/,
    guessId: 'ec3982e0-3c90-4a89-9945-f43696602ff3',
    family: 'adult-only-1day',
    wantOpts: 1,
    wantPrices: [294],
    wantOptNames: [/1일 입장권/],
    poiNeed: /tussauds|투소|peak|太平|香港|hong kong/i,
    poiReject: /正佳|grandview|广州|광저우|guangzhou|shanghai|상하이/i,
    themeNeed: /박물관|갤러리|관광지|테마파크|명소/i,
    tasteBan: /기사제공차량|픽업|샌딩|항공편|터미널|공항 픽업|교토역|스즈카|정가광장|정자|환채광영|幻彩|正佳/i,
    childAlone: false,
    adultOnly: true,
    expectPassportCopy: true,
    expectPriceNote: '售价hkd=294（表显示；加价逻辑=206 未用）',
  },
  {
    key: 'ocean',
    listName: 'Ocean Park Hong Kong Ticket',
    koHint: /오션 ?파크/,
    guessId: '2cb55b01-a00c-4860-b0ea-03ae2bf14d94',
    family: 'adult-child-1day',
    wantOpts: 2,
    wantPrices: [691, 346],
    wantOptNames: [/성인|12세/, /아동|3-11/],
    poiNeed: /ocean|오션|aberdeen|香港|hong kong/i,
    poiReject: /disney|디즈니|上海|상하이/i,
    themeNeed: /테마파크/,
    tasteBan: /기사제공차량|픽업|샌딩|항공편|터미널|공항 픽업|교토역|스즈카|상하이 디즈니|여권 인식으로 입장/i,
    childAlone: true,
    adultOnly: false,
    expectPassportCopy: true,
    expectPriceNote: '售价hkd=691/346（表显示；加价逻辑=484/242 未用）',
  },
  {
    key: 'palace',
    listName: 'Hong Kong Palace Museum Ticket',
    koHint: /고궁/,
    guessId: 'fcb0a1ea-1e3e-4f7c-b91f-d2f0a5391b3e',
    family: 'adult-only-2pkg',
    wantOpts: 2,
    wantPrices: [125, 305],
    wantOptNames: [/일반|갤러리 1-7/, /특별전|갤러리 9/],
    poiNeed: /palace|고궁|museum|西九|west kowloon|香港|hong kong/i,
    poiReject: /3d museum|경마|shanghai|상하이/i,
    themeNeed: /박물관|갤러리/,
    tasteBan: /기사제공차량|픽업|샌딩|항공편|터미널|공항 픽업|교토역|스즈카/i,
    childAlone: false,
    adultOnly: true,
    expectPassportCopy: true,
    galleryMust: true,
    expectPriceNote: '售价hkd=125/305（表显示；加价逻辑=87.3/213.4 未用）',
  },
];

const LIST_URL =
  'https://tour.triple.partners/product-management/products?status=UNPUBLISHED&lang=zh-tw';

function introUrl(id) {
  return `https://tour.triple.partners/product-management/registration/introduction?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}
function attrsUrl(id) {
  return `https://tour.triple.partners/product-management/registration/properties?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}
function regsUrl(id) {
  return `https://tour.triple.partners/product-management/registration/regulations?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}
function optionUrl(id) {
  return `https://tour.triple.partners/product-management/registration/option?id=${id}&status=UNPUBLISHED&lang=zh-tw`;
}

function hasCjk(s) {
  return /[\u4e00-\u9fff]/.test(s || '');
}

async function fetchProduct(page, id) {
  return page.evaluate(async (pid) => {
    const r = await fetch(`/product-management/api/v3/temporary-products/${pid}`, {
      credentials: 'include',
    });
    const j = await r.json();
    return { status: r.status, body: j };
  }, id);
}

function flattenText(p) {
  const parts = [];
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(p);
  return parts.join('\n');
}

function pick(p) {
  const d = p.data && p.title == null ? p.data : p;
  const opts = d.options || [];
  const locs = d.locations || d.locationInfos || [];
  const faqs = d.faqs || d.faq || [];
  const media = d.media || d.images || d.thumbnailImages || d.productImages || [];
  const cats = d.categories || d.categoryIds || d.themes || [];
  return {
    id: d.id,
    title: d.title,
    managementTitle: d.managementTitle || d.internalName,
    productType: d.productType,
    version: d.version,
    langs: d.languages || d.progressLanguages,
    headline: d.headline || d.oneLine || d.shortDescription,
    highlight: d.highlight || d.summary,
    description: d.description,
    checkList: d.checkList || d.mustKnow,
    howToUse: d.howToUse || d.usage,
    faqs: faqs.map((f) => ({
      q: f.question || f.q,
      a: f.answer || f.a,
    })),
    locations: locs.map((l) => ({
      name: l.name || l.nameTag || l.locationName,
      type: l.locationType || l.type,
      address: l.address || l.addr,
      city: l.city || l.region,
    })),
    categories: cats,
    mediaCount: Array.isArray(media) ? media.length : 0,
    media: (Array.isArray(media) ? media : []).map((m) => ({
      url: m.url || m.path || m.src,
      w: m.width,
      h: m.height,
    })),
    options: opts.map((o) => ({
      id: o.id,
      name: o.name,
      desc: o.description,
      saleable: o.sale?.saleable ?? o.rule?.saleRule?.saleable,
      prices: (o.prices || []).map((pr) => ({
        type: pr.type || pr.priceType,
        name: pr.name || pr.displayName,
        desc: pr.description,
        representative: pr.representative,
        salePrice: pr.policy?.periods?.[0]?.salePrice ?? pr.salePrice,
        start: pr.policy?.periods?.[0]?.startDate,
        end: pr.policy?.periods?.[0]?.endDate,
      })),
      periods: o.sale?.periods || o.prices?.[0]?.policy?.periods,
      inclusions: o.attribute?.inclusions || [],
      exclusions: o.attribute?.exclusions || [],
    })),
    reservation: d.reservation || d.bookingInfo || d.requiredReservation || null,
    perBooking: d.perBookingReservation || d.representativeReservation || null,
    perPax: d.perPaxReservation || d.quantityReservation || null,
    cancel: d.specificCancelPolicy || d.cancelPolicy,
    shortest: d.rule?.bookingRule?.minimumPurchaseDay,
    rawKeys: Object.keys(d),
  };
}

function scanResv(raw) {
  const s = JSON.stringify(raw);
  const phone = /CELLPHONE|PHONE|전화|电话|電話/.test(s);
  const email = /EMAIL|邮箱|郵箱|이메일/.test(s);
  const last = /ENGLISH_LAST_NAME|영문.?성|英文姓/.test(s);
  const first = /ENGLISH_FIRST_NAME|영문.?이름|英文名/.test(s);
  const passport = /PASSPORT|여권|護照/.test(s);
  const flight = /FLIGHT|항공편|航班/.test(s);
  const hotel = /HOTEL_ADDRESS|호텔 주소|酒店地址/.test(s);
  return { phone, email, last, first, passport, flight, hotel, hit: phone || email || last || first || passport };
}

console.log('【本轮】检查（非上架）；范围=截图 3 个香港门票；口径=门票 Final Check');
console.log('【将要】CDP 连接 + 未发布列表对名');

const { page } = await connectNolPage({
  selfHint: 'audit-hk-tickets',
  killPeers: true,
});

const iw = await page.evaluate(() => window.innerWidth);
console.log('【读回】innerWidth', iw);
if (iw < 1280) {
  console.log('【结果】FAIL 视口过窄');
  process.exit(2);
}

await page.goto(LIST_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(2500);

const listCards = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('div[class*="slot___StyledContainer4"], a, div')).filter(
    (el) => {
      const t = (el.innerText || '').trim();
      return (
        /Madame Tussauds Hong Kong|Ocean Park Hong Kong|Hong Kong Palace Museum|마담 투소|오션 파크|고궁문화박물관/.test(
          t,
        ) && t.length < 400
      );
    },
  );
  const seen = new Set();
  const out = [];
  for (const el of cards) {
    const t = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 180);
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return { url: location.href, bodyHead: (document.body?.innerText || '').slice(0, 400), cards: out.slice(0, 20) };
});
console.log('【读回】列表', JSON.stringify(listCards, null, 2));

const results = [];

for (const spec of PRODUCTS) {
  console.log('\n========', spec.listName, '========');
  console.log('【将要】GET temporary-product', spec.guessId);
  let fetched = await fetchProduct(page, spec.guessId);
  console.log('【读回】API status', fetched.status, 'keys', Object.keys(fetched.body || {}));

  let picked = fetched.status === 200 ? pick(fetched.body) : null;
  if (picked) {
    console.log('【读回】title/mgmt', picked.title, '/', picked.managementTitle, 'type', picked.productType);
  }

  // if guessed id is the wrong product (e.g. Grandview reused), search list + API titles
  const titleOk =
    picked &&
    ((picked.managementTitle || '').includes(spec.listName) ||
      spec.koHint.test(picked.title || '') ||
      spec.koHint.test(picked.managementTitle || ''));

  if (!titleOk) {
    console.log('【结果】guessId 标题不匹配，尝试打开列表卡');
    const clicked = await page.evaluate((name) => {
      const el = Array.from(document.querySelectorAll('div[class*="slot___StyledContainer4"]')).find((n) =>
        (n.innerText || '').includes(name),
      );
      if (!el) return false;
      el.click();
      return true;
    }, spec.listName);
    if (clicked) {
      await sleep(3500);
      const id = (page.url().match(/id=([0-9a-f-]{36})/i) || [])[1];
      console.log('【读回】resume url', page.url(), 'id', id);
      if (id) {
        spec.guessId = id;
        fetched = await fetchProduct(page, id);
        picked = fetched.status === 200 ? pick(fetched.body) : null;
      }
    }
  }

  const fails = [];
  const flags = {};
  if (!picked) {
    fails.push('API: 读不到草稿');
    results.push({ spec, picked: null, fails, flags });
    continue;
  }

  flags.id = picked.id || spec.guessId;
  flags.title = picked.title;
  flags.mgmt = picked.managementTitle;
  flags.type = picked.productType;
  flags.optN = picked.options.length;
  flags.prices = picked.options.flatMap((o) => o.prices.map((p) => p.salePrice));
  flags.optNames = picked.options.map((o) => o.name);
  flags.priceTypes = picked.options.flatMap((o) => o.prices.map((p) => `${p.type}:${p.name}`));
  flags.locs = picked.locations;
  flags.mediaN = picked.mediaCount;
  flags.faqN = picked.faqs.length;
  flags.shortest = picked.shortest;
  flags.keys = picked.rawKeys;

  if (picked.productType !== 'TICKET_PASS') fails.push(`TYPE: ${picked.productType} ≠ TICKET_PASS`);
  if (!spec.koHint.test(picked.title || '') && !String(picked.managementTitle || '').includes(spec.listName)) {
    fails.push(`NAME: title=${picked.title} mgmt=${picked.managementTitle}`);
  }

  const locBlob = JSON.stringify(picked.locations);
  if (!spec.poiNeed.test(locBlob)) fails.push(`POI: 未命中 ${spec.poiNeed} 读回=${locBlob.slice(0, 180)}`);
  if (spec.poiReject.test(locBlob)) fails.push(`POI: 命中拒词 读回=${locBlob.slice(0, 180)}`);
  if (!picked.locations.length) fails.push('POI: 空');

  if (picked.options.length !== spec.wantOpts) {
    fails.push(`OPT: n=${picked.options.length} want=${spec.wantOpts} names=${flags.optNames.join(' | ')}`);
  }
  const gotPrices = flags.prices.map(Number).filter((n) => !Number.isNaN(n));
  for (const want of spec.wantPrices) {
    if (!gotPrices.includes(Number(want))) fails.push(`PRICE: 缺表显示 ${want} 读回=${gotPrices.join(',')}`);
  }
  for (const re of spec.wantOptNames) {
    if (!picked.options.some((o) => re.test(o.name || '') || re.test(o.desc || ''))) {
      fails.push(`OPTNAME: 无 ${re} 读回=${flags.optNames.join(' | ')}`);
    }
  }

  if (spec.adultOnly) {
    const childish = picked.options.some((o) =>
      /아동|어린이|CHILD/i.test(`${o.name} ${o.desc} ${o.prices.map((p) => p.type).join(' ')}`),
    );
    if (childish) fails.push('AGE: 只卖成人却出现儿童价/儿童选项');
  }
  if (spec.childAlone) {
    const blob = `${picked.description}\n${picked.checkList}\n${picked.options.map((o) => o.desc).join('\n')}\n${picked.faqs.map((f) => f.q + f.a).join('\n')}`;
    if (!/단독 구매가 불가|아동권은 동일 주문|儿童.*不可单|성인권과 함께/.test(blob)) {
      fails.push('CHILD: 儿童不可单卖未写入介绍/须知/选项/FAQ');
    }
  }
  if (spec.galleryMust) {
    const blob = `${picked.description}\n${picked.checkList}\n${picked.options.map((o) => `${o.name}\n${o.desc}`).join('\n')}`;
    if (!/갤러리 1/.test(blob) || !/갤러리 9/.test(blob)) fails.push('GALLERY: 未写清 1-7 / 9');
    if (!/갤러리 8/.test(blob)) fails.push('GALLERY: 未写明不含 갤러리 8');
  }

  const allCopy = [
    picked.headline,
    picked.highlight,
    picked.description,
    picked.checkList,
    picked.howToUse,
    ...picked.faqs.map((f) => `${f.q}\n${f.a}`),
    ...picked.options.map((o) => `${o.name}\n${o.desc}\n${(o.inclusions || []).map((x) => x.description).join('\n')}\n${(o.exclusions || []).map((x) => x.description).join('\n')}`),
  ].join('\n');
  flags.copyLen = allCopy.length;
  if (spec.tasteBan.test(allCopy)) {
    const m = allCopy.match(spec.tasteBan);
    fails.push(`TASTE: 串味/接送词 ${m?.[0]}`);
  }
  if (hasCjk(allCopy)) {
    const hits = allCopy.match(/[\u4e00-\u9fff]{2,12}/g) || [];
    fails.push(`CJK: 客户文案残留中文 ${[...new Set(hits)].slice(0, 8).join('、')}`);
  }
  if (spec.expectPassportCopy && !/여권번호|여권 번호/.test(allCopy)) {
    fails.push('COPY: 缺护照号/姓名预订提示');
  }
  if (!/7일/.test(allCopy)) fails.push('COPY: 缺 7일 이메일 발송');

  const resv = scanResv(fetched.body);
  flags.resv = resv;
  if (!resv.hit) {
    // reservation often only on regs UI; mark pending UI
    flags.resvUiNeeded = true;
  } else {
    if (!resv.phone || !resv.email) fails.push(`BOOK-REP: phone=${resv.phone} email=${resv.email}`);
    if (!resv.last || !resv.first || !resv.passport) {
      fails.push(`BOOK-PAX: last=${resv.last} first=${resv.first} passport=${resv.passport}`);
    }
    if (resv.flight || resv.hotel) fails.push(`BOOK: 门票误开接送字段 flight=${resv.flight} hotel=${resv.hotel}`);
  }

  if (picked.mediaCount && picked.mediaCount !== 3) {
    flags.mediaWarn = `mediaN=${picked.mediaCount}（API 计数可能含非缩略图）`;
  }

  console.log('【读回】flags', JSON.stringify(flags, null, 2));
  console.log('【读回】fails so far', fails);

  results.push({ spec, picked, fails, flags, rawStatus: fetched.status });
}

// UI pass: reservation summaries + thumbs + option cards
for (const row of results) {
  if (!row.picked) continue;
  const id = row.flags.id;
  console.log('\n【将要】UI 法规+介绍+选项', row.spec.listName, id);

  await page.goto(regsUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  const regsUi = await page.evaluate(() => {
    const body = document.body?.innerText || '';
    const grab = (label) => {
      const i = body.indexOf(label);
      if (i < 0) return '';
      return body.slice(i, i + 180).replace(/\s+/g, ' ');
    };
    return {
      url: location.href,
      rep: grab('代表预约信息') || grab('代表預約信息') || grab('대표 예약'),
      pax: grab('按数量的预订信息') || grab('按數量的預訂信息') || grab('수량별'),
      hasPhone: /电话|電話|휴대폰|핸드폰/.test(body),
      hasEmail: /邮箱|郵箱|이메일|电子邮箱|電子郵箱/.test(body),
      hasLast: /英文姓|영문 성|ENGLISH_LAST|姓氏/.test(body),
      hasFirst: /英文名|영문 이름|ENGLISH_FIRST|名字/.test(body),
      hasPass: /护照|護照|여권/.test(body),
      reds: Array.from(document.querySelectorAll('*'))
        .filter((el) => el.children.length <= 1)
        .map((el) => (el.innerText || '').trim())
        .filter((t) => t && t.length < 40 && /请|請|必须|必須/.test(t))
        .slice(0, 8),
    };
  });
  row.flags.regsUi = regsUi;
  console.log('【读回】法规UI', JSON.stringify(regsUi));

  const paxBlank = /按数量的预订信息|按數量的預訂信息/.test(regsUi.pax) && !/英文姓|英文名|护照|護照|영문/.test(regsUi.pax);
  const repBlank = /代表预约信息|代表預約信息/.test(regsUi.rep) && !/电话|電話|邮箱|郵箱|이메일/.test(regsUi.rep);
  if (!regsUi.hasPhone || !regsUi.hasEmail || repBlank) {
    row.fails.push(`BOOK-UI-REP: 代表摘要不足 ${regsUi.rep.slice(0, 80)}`);
  }
  if (!regsUi.hasLast || !regsUi.hasFirst || !regsUi.hasPass || paxBlank) {
    row.fails.push(`BOOK-UI-PAX: 按数量摘要不足 ${regsUi.pax.slice(0, 80)}`);
  }

  await page.goto(introUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  const introUi = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'))
      .map((img) => ({
        alt: img.alt,
        w: img.naturalWidth,
        h: img.naturalHeight,
        src: (img.src || '').slice(0, 80),
      }))
      .filter((x) => x.w > 80 && x.h > 80);
    const body = document.body?.innerText || '';
    return {
      thumbHint: /썸네일|商品图片|商品圖片|缩略图|縮略圖/.test(body),
      imgN: imgs.length,
      imgs: imgs.slice(0, 8),
      faqN: (body.match(/\?/g) || []).length,
    };
  });
  row.flags.introUi = introUi;
  console.log('【读回】介绍UI imgN', introUi.imgN);

  await page.goto(optionUrl(id), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2200);
  const optUi = await page.evaluate(() => {
    const body = document.body?.innerText || '';
    const mods = (body.match(/修改选项|修改選項/g) || []).length;
    const selling = (body.match(/销售中|銷售中|판매중|可销售|可供出售/g) || []).length;
    return { mods, selling, head: body.slice(0, 500).replace(/\s+/g, ' ') };
  });
  row.flags.optUi = optUi;
  console.log('【读回】选项UI', optUi);
  if (optUi.mods < row.spec.wantOpts) {
    row.fails.push(`OPT-UI: 修改选项=${optUi.mods} want=${row.spec.wantOpts}`);
  }
}

const outPath = new URL('./audit-hk-tickets-20260818-results.json', import.meta.url);
writeFileSync(
  outPath,
  JSON.stringify(
    results.map((r) => ({
      product: r.spec.listName,
      id: r.flags?.id,
      family: r.spec.family,
      title: r.picked?.title,
      mgmt: r.picked?.managementTitle,
      type: r.picked?.productType,
      opts: r.picked?.options,
      locs: r.picked?.locations,
      headline: r.picked?.headline,
      highlight: r.picked?.highlight,
      description: r.picked?.description,
      checkList: r.picked?.checkList,
      howToUse: r.picked?.howToUse,
      faqs: r.picked?.faqs,
      flags: r.flags,
      fails: r.fails,
    })),
    null,
    2,
  ),
);
console.log('\nWROTE', outPath.pathname);
for (const r of results) {
  console.log(JSON.stringify({ product: r.spec.listName, id: r.flags?.id, nfail: r.fails.length, fails: r.fails }));
}
console.log('未点提交审核 · 本轮仅检查，未改库');
process.exit(0);
