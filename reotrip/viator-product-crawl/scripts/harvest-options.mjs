import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const ROOT = new URL('..', import.meta.url).pathname;
const classified = JSON.parse(fs.readFileSync(new URL('../data/viator-active-classified.json', import.meta.url)));
const checkpointPath = new URL('../data/options-checkpoint.json', import.meta.url);
const outPath = new URL('../data/viator-options.json', import.meta.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const products = classified.products;
const checkpoint = fs.existsSync(checkpointPath)
  ? JSON.parse(fs.readFileSync(checkpointPath))
  : { done: {}, errors: [] };

const browser = await chromium.connectOverCDP(CDP);
const page = browser.contexts().flatMap((c) => c.pages())
  .find((p) => (p.url() || '').includes('supplier.viator.com'));
if (!page) {
  console.error('no viator tab');
  process.exit(1);
}

const extractOne = (code) => page.evaluate(async (productCode) => {
  const res = await fetch(`/product/${productCode}`, {
    credentials: 'include',
    headers: { accept: 'text/html', 'x-requested-with': 'XMLHttpRequest' },
  });
  const text = await res.text();
  if (res.status !== 200) {
    return { ok: false, status: res.status, head: text.slice(0, 180) };
  }
  if (/403 Forbidden|Access denied|captcha|datadome/i.test(text) && text.length < 2000) {
    return { ok: false, status: res.status, blocked: true, head: text.slice(0, 180) };
  }
  const key = '__PRELOADED_STATE__":';
  const k = text.indexOf(key);
  if (k < 0) return { ok: false, status: res.status, parse: 'no-preload', len: text.length };
  const start = text.indexOf('{', k + key.length - 1);
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end < 0) return { ok: false, status: res.status, parse: 'unclosed', len: text.length };
  let state;
  try { state = JSON.parse(text.slice(start, end)); }
  catch (e) { return { ok: false, status: res.status, parse: String(e), len: text.length }; }

  const prod = state?.entities?.products?.[productCode] || {};
  const optMap = state?.entities?.productOptions || {};
  const refs = prod.productOptions || Object.keys(optMap);
  const options = refs.map((ref) => {
    const o = optMap[ref] || {};
    const starts = (o.startLocations || []).map((s) => s.name || s.label || s.locationName || s.description).filter(Boolean);
    return {
      ref: o.reference || ref,
      title: o.title || '',
      tourGradeCode: o.tourGradeCode || '',
      status: o.status || '',
      isPickupIncluded: o.isPickupIncluded ?? null,
      startLocations: starts.slice(0, 8),
    };
  });
  const cp = prod.cancellationPolicy || {};
  return {
    ok: true,
    status: res.status,
    productCode,
    title: prod.title || '',
    productStatus: prod.status || '',
    options,
    cancellation: {
      type: cp.cancellationPolicyType?.code || null,
      displayText: cp.cancellationPolicyType?.displayText || null,
      description: cp.cancellationPolicyType?.description || null,
    },
    voucherType: prod.voucher?.voucherType || prod.voucher?.type || null,
  };
}, code);

let ok = Object.keys(checkpoint.done).length;
console.log(`resume ${ok}/${products.length}`);

for (let i = 0; i < products.length; i++) {
  const p = products[i];
  const code = p.productCode;
  if (checkpoint.done[code]?.ok) continue;

  process.stdout.write(`[${i + 1}/${products.length}] ${code} ${p.title.slice(0, 50)} ... `);
  let result;
  try {
    result = await extractOne(code);
  } catch (e) {
    result = { ok: false, error: String(e) };
  }

  if (result.blocked || result.status === 403 || result.status === 429) {
    console.log('BLOCKED', result.status, result.head || '');
    checkpoint.errors.push({ code, result, at: new Date().toISOString() });
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
    process.exit(2);
  }

  checkpoint.done[code] = { ...result, at: new Date().toISOString() };
  if (!result.ok) {
    checkpoint.errors.push({ code, result, at: new Date().toISOString() });
    console.log('FAIL', result.status || result.error || result.parse);
  } else {
    ok += 1;
    console.log(`ok options=${result.options.length} cancel=${result.cancellation?.type || '-'}`);
  }

  if ((i + 1) % 5 === 0) {
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
  }

  const delay = 2600 + Math.floor(Math.random() * 1600);
  await sleep(delay);
}

fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));

const rows = products.map((p) => {
  const got = checkpoint.done[p.productCode] || {};
  return {
    ...p,
    options: got.options || [],
    cancellation: got.cancellation || null,
    voucherType: got.voucherType || null,
    harvestOk: !!got.ok,
  };
});
fs.writeFileSync(outPath, JSON.stringify({
  harvestedAt: new Date().toISOString(),
  count: rows.length,
  ok: rows.filter((r) => r.harvestOk).length,
  products: rows,
}, null, 2));

console.log('DONE ok', rows.filter((r) => r.harvestOk).length, '/', rows.length, 'errors', checkpoint.errors.length);
process.exit(checkpoint.errors.length ? 3 : 0);
