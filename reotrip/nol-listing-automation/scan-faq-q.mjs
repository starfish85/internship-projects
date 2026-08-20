/**
 * Read FAQ question+answer pairs on intro pages.
 */
import { connectNolPage } from './lib/cdp-session.mjs';
import { dismiss } from './lib/japan-audit-fix.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const JOBS = [
  { id: 'c36c1517-89cc-4524-bfdb-fce8df1c2e5c', label: '大阪站' },
  { id: '0de15895-41de-48f8-8653-5c47a947c301', label: '东京港' },
];

const { page } = await connectNolPage({
  selfHint: 'scan-faq-q',
  killPeers: true,
  forceViewport: true,
  viewport: { width: 1440, height: 900 },
});

for (const j of JOBS) {
  console.log(`\n======== ${j.label} FAQ ========`);
  await page.goto(
    `https://tour.triple.partners/product-management/registration/introduction?id=${j.id}&status=UNPUBLISHED&lang=zh-tw`,
    { waitUntil: 'domcontentloaded', timeout: 60000 },
  );
  await sleep(2500);
  await dismiss(page);

  const faqs = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 12; i++) {
      const q =
        document.querySelector(`input[name="faqs.${i}.question"]`) ||
        document.querySelector(`textarea[name="faqs.${i}.question"]`);
      const a =
        document.querySelector(`textarea[name="faqs.${i}.answer"]`) ||
        document.querySelector(`input[name="faqs.${i}.answer"]`);
      if (!q && !a) continue;
      out.push({
        i,
        q: (q?.value || '').trim(),
        a: (a?.value || '').trim().slice(0, 120),
      });
    }
    // also any name matching faq
    const all = Array.from(document.querySelectorAll('input,textarea'))
      .filter((el) => /faq/i.test(el.name || el.id || ''))
      .map((el) => ({ name: el.name || el.id, v: (el.value || '').slice(0, 80) }));
    return { out, all };
  });
  console.log(JSON.stringify(faqs, null, 2));
  const mid = faqs.out.find(
    (f) =>
      /중간에 다른 장소/.test(f.q) ||
      /중간 경유지|지점 간 전용/.test(f.a),
  );
  console.log(
    mid
      ? `【结果】PASS mid-stop FAQ i=${mid.i} Q=${mid.q.slice(0, 40)}`
      : '【结果】FAIL 无 mid-stop FAQ pair',
  );
}
process.exit(0);
