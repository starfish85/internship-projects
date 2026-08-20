import { chromium } from 'playwright';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(CDP);
const pages = browser.contexts().flatMap((c) => c.pages());
const klook = pages.find((p) => (p.url() || '').includes('klook.klktech.com'));
const ctrip = pages.find((p) => (p.url() || '').includes('travelagents.trip.com'));

const kUrls = [
  '/v1/agentwebserv/product/detail?id=695',
  '/v1/agentwebserv/activity/detail?activity_id=695',
  '/v1/agentwebserv/product/695',
  '/v1/experiencesrv/activity/webdetail?activity_id=695',
  '/v1/experiencesrv/activity/packages?activity_id=695',
  '/v1/agentwebserv/product/package?id=695',
];
for (const u of kUrls) {
  const r = await klook.evaluate(async (u) => {
    const res = await fetch(u, { credentials: 'include', headers: { accept: 'application/json' } });
    const t = await res.text();
    return { status: res.status, ct: res.headers.get('content-type'), len: t.length, head: t.slice(0, 180) };
  }, u);
  console.log('K', r.status, r.len, r.ct, u, r.head.replace(/\s+/g, ' ').slice(0, 120));
}

const cUrls = [
  'https://m.trip.com/restapi/soa2/14580/getProductDetail',
];
// try known trip product detail from page by fetching HTML of t96477084
const html = await ctrip.evaluate(async () => {
  const res = await fetch('/ttddist/act/dest/t96477084.html', { credentials: 'include' });
  const t = await res.text();
  return { status: res.status, len: t.length, hasE: /e-voucher|E-voucher|electronic/i.test(t), hasN: /Non-cancellable|不可取消/i.test(t), title: (t.match(/<title>([^<]+)/)||[])[1] };
});
console.log('Ctrip disney ticket page', html);

process.exit(0);
