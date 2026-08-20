/** CHECK-only: find Grandview leftover + media URLs + saleStatus. */
import { connectNolPage } from './lib/cdp-session.mjs';

const { page } = await connectNolPage({ selfHint: 'audit-hk-dump3', killPeers: true });

const j = await page.evaluate(async () => {
  const id = 'ec3982e0-3c90-4a89-9945-f43696602ff3';
  const p = await fetch(`/product-management/api/v3/temporary-products/${id}`, { credentials: 'include' }).then((r) => r.json());
  const media = p.media;
  const first = Array.isArray(media) ? media[0] : media;
  // search unpublished
  const searches = [];
  for (const q of ['정가', 'Grandview', '正佳', '幻彩', '마담 투소', '오션파크', '고궁']) {
    const urls = [
      `/product-management/api/v3/temporary-products?query=${encodeURIComponent(q)}&status=UNPUBLISHED`,
      `/product-management/api/v2/temporary-products?keyword=${encodeURIComponent(q)}`,
    ];
    for (const u of urls) {
      try {
        const r = await fetch(u, { credentials: 'include' });
        const t = await r.text();
        searches.push({ q, u, status: r.status, head: t.slice(0, 180) });
      } catch (e) {
        searches.push({ q, u, err: String(e) });
      }
    }
  }
  return {
    tussaudsTitle: p.title,
    tussaudsMgmt: p.managementTitle,
    saleStatus: p.saleStatus,
    status: p.status,
    mediaType: typeof media,
    mediaIsArray: Array.isArray(media),
    mediaLen: Array.isArray(media) ? media.length : null,
    firstKeys: first && typeof first === 'object' ? Object.keys(first) : first,
    firstJson: first,
    searches,
  };
});
console.log(JSON.stringify(j, null, 2));
process.exit(0);
