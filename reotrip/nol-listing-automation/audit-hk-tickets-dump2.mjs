/** CHECK-only: dump content/theme/booking/media for 3 HK tickets + Grandview leftover. */
import { writeFileSync } from 'node:fs';
import { connectNolPage } from './lib/cdp-session.mjs';

const IDS = {
  tussauds: 'ec3982e0-3c90-4a89-9945-f43696602ff3',
  ocean: '2cb55b01-a00c-4860-b0ea-03ae2bf14d94',
  palace: 'fcb0a1ea-1e3e-4f7c-b91f-d2f0a5391b3e',
};

const { page } = await connectNolPage({ selfHint: 'audit-hk-dump2', killPeers: true });

const out = {};
for (const [k, id] of Object.entries(IDS)) {
  const j = await page.evaluate(async (pid) => {
    const r = await fetch(`/product-management/api/v3/temporary-products/${pid}`, { credentials: 'include' });
    return r.json();
  }, id);
  const slim = {
    id: j.id,
    title: j.title,
    managementTitle: j.managementTitle,
    productType: j.productType,
    language: j.language,
    categoryIds: j.categoryIds,
    status: j.status,
    saleStatus: j.saleStatus,
    published: j.published,
    content: j.content,
    attribute: j.attribute,
    bookingForm: j.bookingForm,
    bookingFormRules: j.bookingFormRules,
    cancelPolicy: j.cancelPolicy,
    rule: j.rule,
    media: (j.media || []).map((m) => ({
      id: m.id,
      w: m.width,
      h: m.height,
      mime: m.mimeType || m.contentType,
      url: (m.url || m.path || '').slice(0, 160),
    })),
    representativeMedia: j.representativeMedia,
    locations: j.locations,
    options: (j.options || []).map((o) => ({
      name: o.name,
      desc: o.description,
      prices: o.prices,
      inclusions: o.attribute?.inclusions,
      exclusions: o.attribute?.exclusions,
    })),
  };
  out[k] = slim;
  console.log('\n====', k, j.title, '/', j.managementTitle);
  console.log('lang', JSON.stringify(j.language), 'cats', JSON.stringify(j.categoryIds));
  console.log('content keys', j.content && Object.keys(j.content));
  console.log('content', JSON.stringify(j.content, null, 2)?.slice(0, 2500));
  console.log('attr', JSON.stringify(j.attribute, null, 2)?.slice(0, 800));
  console.log('bookingForm', JSON.stringify(j.bookingForm || j.bookingFormRules, null, 2)?.slice(0, 1500));
  console.log('cancel', JSON.stringify(j.cancelPolicy, null, 2)?.slice(0, 600));
  console.log('media', slim.media);
}

writeFileSync(new URL('./audit-hk-tickets-dump2.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('WROTE dump2');
process.exit(0);
