import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const classified = JSON.parse(fs.readFileSync(new URL('../data/viator-options.json', import.meta.url)));
const outPath = new URL('../data/ticket-supply-matches.json', import.meta.url);
const ckPath = new URL('../data/ticket-supply-checkpoint.json', import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tickets = classified.products.filter((p) => p.category === '门票产品');
const checkpoint = fs.existsSync(ckPath) ? JSON.parse(fs.readFileSync(ckPath)) : { searches: {}, details: {}, done: {} };

const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const ctrip = pages.find((p) => (p.url() || '').includes('travelagents.trip.com'));
const klook = pages.find((p) => (p.url() || '').includes('klook.klktech.com'));
if (!ctrip || !klook) {
  console.error('need ctrip + klook tabs');
  process.exit(1);
}

const KEYWORDS = {
  '5514894P9': ['Lotte World ticket', 'Seoul Sky ticket'],
  '5514894P7': ['Hong Kong Disneyland ticket'],
  '5514894P61': ['Beijing Universal Studios ticket', 'Universal Beijing ticket'],
  '5514894P60': ['Shanghai Disneyland ticket'],
  '5514894P58': ['Ba Na Hills ticket'],
  '5514894P57': ['Landmark 81 Skyview ticket'],
  '5514894P55': ['Macau Tower Observation Deck ticket'],
  '5514894P54': ['TeamLab SuperNature Macao ticket'],
  '5514894P53': ['House of Dancing Water ticket'],
  '5514894P52': ['Tokyo Disneyland ticket', 'Tokyo DisneySea ticket'],
  '5514894P51': ['Tokyo Disneyland ticket', 'Tokyo DisneySea ticket'],
  '5514894P502': ['TeamLab Phenomena Abu Dhabi ticket'],
  '5514894P489': ['Tokyo Tower Main Deck ticket'],
  '5514894P483': ['Tokyo Tower Top Deck ticket'],
  '5514894P477': ['Tokyo Disney hopper ticket', 'Tokyo Disneyland ticket'],
  '5514894P475': ['Tokyo Disney hopper ticket', 'Tokyo Disneyland ticket'],
  '5514894P473': ['Ba Na Hills ticket'],
  '5514894P47': ['LEGOLAND Japan ticket'],
  '5514894P468': ['Ba Na Hills ticket'],
  '5514894P463': ['Warner Bros Studio Tour Tokyo ticket', 'Harry Potter Tokyo ticket'],
  '5514894P461': ['Warner Bros Studio Tour Tokyo ticket', 'Harry Potter Tokyo ticket'],
  '5514894P44': ['Tokyo Disneyland ticket', 'Tokyo DisneySea ticket'],
  '5514894P437': ['Yu Garden ticket', 'Yuyuan Garden ticket'],
  '5514894P424': ['Tokyo DisneySea ticket'],
  '5514894P423': ['Shibuya Sky ticket'],
  '5514894P417': ['Shibuya Sky ticket', 'Tokyo Metro'],
  '5514894P404': ['Warner Bros Studio Tour Tokyo ticket', 'Tokyo Metro'],
  '5514894P403': ['Tokyo DisneySea ticket'],
  '5514894P38': ['Pop Land Beijing ticket', 'Labubu Pop Land ticket'],
  '5514894P3': ['Tokyo Disneyland ticket'],
  '5514894P299': ['Tokyo Disneyland ticket'],
  '5514894P283': ['Hong Kong Disneyland ticket'],
  '5514894P282': ['Tokyo Disney hopper ticket', 'Tokyo Disneyland ticket'],
  '5514894P28': ['Arima Onsen Taikounoyu'],
  '5514894P251': ['Shanghai Happy Valley ticket'],
  '5514894P247': ['Jinmao Tower ticket', 'Jin Mao Tower ticket'],
  '5514894P245': ['Shanghai ERA Time Journey ticket'],
  '5514894P244': ['Shanghai Tower ticket'],
  '5514894P24': ['X the SKY Busan ticket', 'Busan Sky Tower ticket'],
  '5514894P228': ['Hong Kong Disneyland Premier Access', 'Hong Kong Disneyland ticket'],
  '5514894P21': ['Seoul Sky Lotte World Tower ticket'],
  '5514894P184': ["Prince Kung's Mansion ticket", 'Gongwangfu ticket'],
  '5514894P183': ['Yuanmingyuan ticket', 'Old Summer Palace ticket'],
  '5514894P18': ['N Seoul Tower ticket'],
  '5514894P177': ['Lao She Teahouse ticket'],
  '5514894P163': ['Umeda Sky Building ticket'],
  '5514894P162': ['Abeno Harukas 300 ticket'],
  '5514894P13': ['Tokyo DisneySea ticket', 'Tokyo Metro'],
  '5514894P115': ['Tokyo Disney hopper ticket', 'Tokyo Disneyland ticket'],
  '5514894P11': ['Tokyo Disneyland ticket', 'Tokyo Metro'],
};

const REJECT_NAME = /(limousine|airport transfer|private transfer|shared transfer|charter|day tour|night tour|photography tour|hotel(?! pick)|hostel|night bus|接送服务|包车|一日游)/i;
const TICKET_NAME = /(ticket|admission|passport|pass\b|observatory|skyview|entry|门票|入場|套票)/i;
const TOUR_NAME = /\b(tour|cruise|experience package|hanfu|kimono rental)\b/i;
const TRANSFER_NAME = /\b(transfer|shuttle|pick-?up|drop-?off|bus to|bus from|limousine)\b/i;

const tokens = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ').split(/\s+/).filter((w) => w.length > 2);

const scoreCtrip = (card, productTitle) => {
  if (card.cardType === 1) return { score: -99, why: 'destination-hub' };
  const name = card.name || '';
  const tag = (card.tagType || '').toLowerCase();
  if (/sim card|wifi|phone card/.test(tag)) return { score: -99, why: 'sim' };
  if (REJECT_NAME.test(name)) return { score: -50, why: 'reject-name' };
  let score = 0;
  const why = [];
  if (/attraction tickets|public transportation|city passes|shows|tickets/.test(tag)) { score += 40; why.push('ticket-type'); }
  if (TICKET_NAME.test(name)) { score += 25; why.push('ticket-word'); }
  if (/one-day tour|day tours|experiences|transfer/.test(tag) && !TICKET_NAME.test(name)) { score -= 30; why.push('tour-type'); }
  if (TOUR_NAME.test(name) && !TICKET_NAME.test(name)) { score -= 25; why.push('tour-name'); }
  if (TRANSFER_NAME.test(name) && !/ticket|admission/.test(name)) { score -= 40; why.push('transfer'); }
  const pt = new Set(tokens(productTitle));
  const overlap = tokens(name).filter((t) => pt.has(t) && !['ticket','admission','tokyo','with','from','and','the'].includes(t)).length;
  score += overlap * 6;
  if (overlap) why.push(`overlap-${overlap}`);
  return { score, why: why.join(',') };
};

const scoreKlook = (item, productTitle) => {
  if (item.vertical_type === 102) return { score: -99, why: 'hotel' };
  const name = item.vertical_name || '';
  if (REJECT_NAME.test(name)) return { score: -50, why: 'reject-name' };
  let score = 0;
  const why = [];
  if (item.template_id === 1) { score += 35; why.push('tpl1'); }
  if (item.template_id === 5) { score -= 35; why.push('tpl5-transport'); }
  if (TICKET_NAME.test(name) || /门票|套票|入場/.test(name)) { score += 25; why.push('ticket-word'); }
  if (TRANSFER_NAME.test(name) || /巴士|接送/.test(name)) { score -= 40; why.push('transfer'); }
  if (TOUR_NAME.test(name) && !TICKET_NAME.test(name)) { score -= 25; why.push('tour'); }
  const pt = new Set(tokens(productTitle));
  const overlap = tokens(name).filter((t) => pt.has(t) && !['ticket','admission','tokyo','with','from','and','the'].includes(t)).length;
  score += overlap * 6;
  if (overlap) why.push(`overlap-${overlap}`);
  return { score, why: why.join(',') };
};

const ctripSearch = async (keyword) => {
  if (checkpoint.searches[`c:${keyword}`]) return checkpoint.searches[`c:${keyword}`];
  const data = await ctrip.evaluate(async (keyword) => {
    const head = {
      cid: '09034171316177435203', ctok: '', cver: '1.0', lang: '01', sid: '8888', syscode: '09',
      auth: '', xsid: '',
      extension: [
        { name: 'aid', value: '5572064' },
        { name: 'sid', value: '126780620' },
        { name: 'amp-product-type', value: 'intlpiaovip' },
        { name: 'amp-account-source', value: 'ttdintldistribution' },
      ],
      Locale: 'en-US',
    };
    const res = await fetch('https://m.trip.com/restapi/soa2/14083/json/mixSortListSearch', {
      method: 'POST', credentials: 'include',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        filterItemList: [],
        sort: 1, pageIndex: 1, needData: 3, keyword, locale: 'en-US',
        clientInfo: { locale: 'en-US' }, pageSize: 15, contentType: 'json', head,
      }),
    });
    const json = await res.json();
    return {
      total: json.totalCount,
      cards: (json.cardList || []).map((c) => ({
        id: c.id, cardType: c.cardType, tagType: c.tagType, name: c.name,
        tags: c.productTags || [], city: c.starCity,
      })),
    };
  }, keyword);
  checkpoint.searches[`c:${keyword}`] = data;
  return data;
};

const klookSearch = async (keyword) => {
  if (checkpoint.searches[`k:${keyword}`]) return checkpoint.searches[`k:${keyword}`];
  const data = await klook.evaluate(async (keyword) => {
    const u = `/v1/agentwebserv/product/complete_search?_=${Date.now()}&query=${encodeURIComponent(keyword)}&vertical_types=100&page_num=1&page_size=24&sort=most_relevant`;
    const res = await fetch(u, { credentials: 'include', headers: { accept: 'application/json' } });
    const json = await res.json();
    const items = json?.result?.search_result?.activity_info || [];
    return {
      total: json?.result?.search_result?.total,
      items: items.map((a) => ({
        id: a.vertical_id,
        type: a.vertical_type,
        name: a.vertical_name,
        template_id: a.template_id,
        leaf: a.leaf_category_id,
        deep_link: a.deep_link,
      })),
    };
  }, keyword);
  checkpoint.searches[`k:${keyword}`] = data;
  return data;
};

const ctripDetail = async (id) => {
  const key = `cd:${id}`;
  if (checkpoint.details[key]) return checkpoint.details[key];
  const data = await ctrip.evaluate(async (id) => {
    const res = await fetch(`/ttddist/act/dest/t${id}.html`, { credentials: 'include' });
    const t = await res.text();
    const title = (t.match(/<title>([^<]+)/) || [])[1] || '';
    const textSlice = t.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
    return {
      status: res.status,
      title: title.trim(),
      eVoucher: /e-voucher|E-voucher|electronic ticket|QR code/i.test(t),
      pickup: /Pick-up|physical ticket|现场取票/i.test(t),
      nonCancel: /Non-cancellable|All sales final|不可取消/i.test(t),
      condCancel: /Conditional cancellation|条件取消/i.test(t),
      freeCancel: /Free cancellation|免费取消/i.test(t),
    };
  }, id);
  checkpoint.details[key] = data;
  return data;
};

const klookDetail = async (id) => {
  const key = `kd:${id}`;
  if (checkpoint.details[key]) return checkpoint.details[key];
  const data = await klook.evaluate(async (id) => {
    const res = await fetch(`/activity/${id}`, { credentials: 'include' });
    const t = await res.text();
    return {
      status: res.status,
      len: t.length,
      eVoucher: /Show e-voucher|e-voucher|电子凭证|电子票/i.test(t),
      nonCancel: /Non-refundable|Non-cancellable|不可取消|不可退/i.test(t),
      condCancel: /Conditional cancellation|条件取消/i.test(t),
      freeCancel: /Free cancellation|免费取消/i.test(t),
      title: (t.match(/<title>([^<]+)/) || [])[1] || '',
    };
  }, id);
  checkpoint.details[key] = data;
  return data;
};

const pickBest = (scored, min = 20) => {
  const ok = scored.filter((x) => x.score >= min).sort((a, b) => b.score - a.score);
  return ok[0] || null;
};

const usageFrom = (detail, fallbackTags = []) => {
  const tags = (fallbackTags || []).join(' ');
  if (detail?.eVoucher || /e-voucher/i.test(tags)) return '电子票入场';
  if (detail?.pickup && !detail?.eVoucher) return '现场取票';
  return detail ? '电子票入场' : '';
};

const cancelFrom = (detail, fallbackTags = [], viatorType = '') => {
  const tags = (fallbackTags || []).join(' ');
  if (detail?.nonCancel || /Non-cancellable/i.test(tags)) return '不可取消';
  if (detail?.freeCancel) return '可免费取消';
  if (detail?.condCancel || /Conditional cancellation/i.test(tags)) return '条件取消';
  if (viatorType === 'ALL_SALES_FINAL') return ''; // supply unknown
  return '';
};

const results = [];
for (let i = 0; i < tickets.length; i++) {
  const p = tickets[i];
  const kws = KEYWORDS[p.productCode] || [p.title];
  console.log(`\n[${i + 1}/${tickets.length}] ${p.productCode} ${p.title}`);
  const cCandidates = [];
  const kCandidates = [];
  for (const kw of kws) {
    const c = await ctripSearch(kw);
    await sleep(1800 + Math.floor(Math.random() * 700));
    const k = await klookSearch(kw);
    await sleep(1800 + Math.floor(Math.random() * 700));
    for (const card of c.cards || []) {
      const sc = scoreCtrip(card, p.title + ' ' + kw);
      cCandidates.push({ ...card, ...sc, kw, supplier: '携程', url: `https://travelagents.trip.com/ttddist/act/dest/t${card.id}.html` });
    }
    for (const item of k.items || []) {
      const sc = scoreKlook(item, p.title + ' ' + kw);
      kCandidates.push({ ...item, ...sc, kw, supplier: 'klook', url: `https://klook.klktech.com/activity/${item.id}` });
    }
    console.log(`  kw="${kw}" ctrip=${(c.cards || []).length} klook=${(k.items || []).length}`);
  }
  const cBest = pickBest(cCandidates);
  const kBest = pickBest(kCandidates);
  // subway special: if any option mentions subway, pick metro separately
  const needSubway = (p.options || []).some((o) => /subway|metro/i.test(o.title || '') || /subway/i.test(p.title));
  let metro = null;
  if (needSubway) {
    const metroPool = cCandidates.filter((x) => /metro|subway|transport/i.test((x.name || '') + (x.tagType || '')));
    metro = pickBest(metroPool, 15);
    if (!metro) {
      const extra = await ctripSearch('Tokyo Metro');
      await sleep(1600);
      metro = pickBest(extra.cards.map((card) => {
        const sc = scoreCtrip(card, 'Tokyo Metro subway pass');
        return { ...card, ...sc, supplier: '携程', url: `https://travelagents.trip.com/ttddist/act/dest/t${card.id}.html` };
      }), 15);
    }
  }

  const uniqDetails = [];
  for (const hit of [cBest, kBest, metro]) {
    if (!hit) continue;
    if (hit.supplier === '携程') uniqDetails.push(['ctrip', hit.id]);
    if (hit.supplier === 'klook') uniqDetails.push(['klook', hit.id]);
  }
  const details = {};
  for (const [kind, id] of uniqDetails) {
    try {
      details[`${kind}:${id}`] = kind === 'ctrip' ? await ctripDetail(id) : await klookDetail(id);
      await sleep(1400 + Math.floor(Math.random() * 600));
    } catch (e) {
      details[`${kind}:${id}`] = { error: String(e) };
    }
  }

  const rec = {
    productCode: p.productCode,
    title: p.title,
    options: p.options,
    viatorCancel: p.cancellation,
    ctrip: cBest,
    klook: kBest,
    metro,
    details,
    cTop: cCandidates.filter((x) => x.score >= 10).sort((a, b) => b.score - a.score).slice(0, 4),
    kTop: kCandidates.filter((x) => x.score >= 10).sort((a, b) => b.score - a.score).slice(0, 4),
  };
  results.push(rec);
  checkpoint.done[p.productCode] = rec;
  if ((i + 1) % 3 === 0) fs.writeFileSync(ckPath, JSON.stringify(checkpoint));
  console.log('  pick ctrip', cBest ? `${cBest.score} ${cBest.name?.slice(0, 70)}` : '-');
  console.log('  pick klook', kBest ? `${kBest.score} ${kBest.name?.slice(0, 70)}` : '-');
  if (metro) console.log('  metro', metro.score, metro.name?.slice(0, 70));
}

fs.writeFileSync(ckPath, JSON.stringify(checkpoint));
fs.writeFileSync(outPath, JSON.stringify({ harvestedAt: new Date().toISOString(), count: results.length, results }, null, 2));
console.log('\nDONE', results.length);
process.exit(0);
