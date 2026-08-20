/**
 * Seed japan-list-ids.json from .*-draft-id + bootstrap PRODUCT_KO + batch-scan labels.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const out = new Map();

function add(id, name, src) {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
  if (!out.has(id)) out.set(id, { id, name: name || id.slice(0, 8), sources: [src] });
  else {
    const r = out.get(id);
    if (name && name.length > (r.name?.length || 0)) r.name = name;
    if (!r.sources.includes(src)) r.sources.push(src);
  }
}

// draft-id files
const chinaSkip = new Set([
  'cn', 'cnh', 'cnr', 'cot', 'csk', 'csp', 'cty', 'cye', 'cho', 'cgp', 'hsz', 'pr', 'popland', 'huangpu', 'huangpu-cruise',
]);
for (const f of readdirSync(__dir)) {
  if (!f.startsWith('.') || !f.endsWith('-draft-id')) continue;
  const prefix = f.replace(/^\./, '').replace(/-draft-id$/, '');
  if (chinaSkip.has(prefix)) continue;
  const id = readFileSync(join(__dir, f), 'utf8').trim().replace(/\s+/g, '');
  // bootstrap PRODUCT_KO
  let ko = '';
  const boot = join(__dir, `${prefix}-bootstrap.mjs`);
  if (existsSync(boot)) {
    const txt = readFileSync(boot, 'utf8');
    const m = txt.match(/PRODUCT_KO\s*=\s*['`]([^'`]+)['`]/);
    if (m) ko = m[1];
  }
  add(id, ko || prefix, `draft-id:${prefix}`);
}

// batch-scan
try {
  const scan = JSON.parse(readFileSync(join(__dir, 'batch-scan-japan-results.json'), 'utf8'));
  for (const x of scan) add(x.id, x.label, 'batch-scan');
} catch {}

// work queue
try {
  const q = JSON.parse(readFileSync(join(__dir, 'japan-work-queue.json'), 'utf8'));
  for (const x of q) add(x.id, x.cn, 'work-queue');
} catch {}

// excel 8
const excel8 = [
  ['b6e560d4-d4d3-4726-b08c-f5623499895a', 'HND 도쿄-하네다'],
  ['60557c54-6c11-4b0e-9e04-df85c0d3e78b', 'NRT 도쿄-나리타'],
  ['7c220325-8783-4f58-a1dc-5fbfc4137a5e', 'KIX 오사카-간사이'],
  ['88b3861b-e907-487b-bacb-5abcfc1a7988', 'ITM 오사카-이타미'],
  ['09714a30-dc94-4378-a238-ed8a37a5d234', '도쿄역'],
  ['0de15895-41de-48f8-8653-5c47a947c301', '도쿄항'],
  ['c36c1517-89cc-4524-bfdb-fce8df1c2e5c', '오사카역'],
  ['9f7d6122-c413-42be-89a8-d08ec789d32c', '도쿄-요코하마항'],
  ['885023cc-f518-433f-916c-ca2a056df00f', '요코하마시내-요코하마항'],
];
for (const [id, n] of excel8) add(id, n, 'excel8');

const list = [...out.values()];
writeFileSync(join(__dir, 'japan-list-ids.json'), JSON.stringify(list, null, 2));
console.log('seeded', list.length);
list.forEach((x) => console.log(x.id.slice(0, 8), x.name?.slice(0, 50)));
