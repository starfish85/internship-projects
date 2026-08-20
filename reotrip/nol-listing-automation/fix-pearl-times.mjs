/**
 * Fix Pearl transfer times for all 4 options: 08:00–21:30 / 30min.
 * Open: 修改选项 → 设置时间 or ⋯编辑 → 重复小时添加 → 生成 → 保存 → 临时保存 → 下一个
 * Never 提交审核.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NAMES = [
  '상하이 시내 호텔 출발 → 동방명주탑 편도 이동 (5인승 차량)',
  '상하이 시내 호텔 출발 → 동방명주탑 편도 이동 (7인승 차량)',
  '동방명주탑 출발 → 상하이 시내 호텔 편도 이동 (5인승 차량)',
  '동방명주탑 출발 → 상하이 시내 호텔 편도 이동 (7인승 차량)',
];

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
let page;
for (const ctx of browser.contexts()) {
  for (const p of ctx.pages()) {
    if (p.url().includes('triple.partners')) page = p;
  }
}
await page.bringToFront().catch(() => {});
console.log('START', page.url());

async function stayIfLeave() {
  const elim = page.getByRole('button', { name: /^消除$/ });
  if ((await elim.count()) > 0) {
    await elim.last().click().catch(() => {});
    await sleep(400);
    return true;
  }
  return false;
}

async function tempThenNext(label) {
  await stayIfLeave();
  const ts = await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        return { i, t: (b.innerText || '').trim(), d: b.disabled, w: Math.round(r.width), vis: r.width > 0 };
      })
      .filter((b) => b.vis && !b.d && b.t === '临时保存')
      .sort((a, b) => a.w - b.w);
    if (!c[0]) return null;
    document.querySelectorAll('button')[c[0].i].click();
    return c[0];
  });
  console.log(`[${label}] 临时保存`, ts);
  await sleep(2000);
  const nx = await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('button'))
      .map((b, i) => {
        const r = b.getBoundingClientRect();
        return { i, t: (b.innerText || '').trim(), d: b.disabled, w: Math.round(r.width), vis: r.width > 0 };
      })
      .filter((b) => b.vis && !b.d && (b.t === '下一个' || b.t === '下个' || b.t === '下個') && b.w > 150)
      .sort((a, b) => b.w - a.w);
    if (!c[0]) return null;
    document.querySelectorAll('button')[c[0].i].click();
    return c[0];
  });
  console.log(`[${label}] 下一个`, nx);
  await sleep(3500);
  await stayIfLeave();
  return !!(ts && nx);
}

async function openEdit(index) {
  // ensure on list without form
  if (page.url().includes('option-form')) {
    await page.keyboard.press('Escape');
    await sleep(500);
    const ok = page.getByRole('button', { name: /^确定$/ });
    if ((await ok.count()) > 0) await ok.last().click();
    await sleep(800);
  }
  await page.evaluate(() => {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  });
  await sleep(400);

  const mods = page.getByRole('button', { name: /修改选项|修改選項|옵션 수정/ });
  const n = await mods.count();
  console.log(`修改选项 buttons: ${n}, open index ${index}`);
  if (index >= n) throw new Error('no 修改选项 at ' + index);
  await mods.nth(index).click({ force: true });
  await sleep(2500);
  const name = await page.locator('#name').inputValue().catch(() => '');
  console.log('opened name', name.slice(0, 50));
  return name;
}

async function openTimeEditor() {
  // Path A: 设置时间
  const a = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return t === '设置时间' || t === '設定時間';
    });
    if (b) {
      b.scrollIntoView({ block: 'center' });
      b.click();
      return true;
    }
    return false;
  });
  if (a) {
    await sleep(1500);
    return '设置时间';
  }

  // Path B: ⋯ 더 보기 → 编辑
  const more = page.locator('button[aria-label="더 보기"]');
  if ((await more.count()) > 0) {
    await more.first().click({ force: true });
    await sleep(500);
    await page.evaluate(() => {
      const leaf = Array.from(document.querySelectorAll('div,button,span')).find((el) => {
        const t = (el.innerText || '').trim();
        const r = el.getBoundingClientRect();
        return t === '编辑' && r.height > 20 && r.height < 60 && r.width > 40;
      });
      leaf?.click();
    });
    await sleep(1500);
    return '더보기-编辑';
  }
  return null;
}

async function setTimes0800to2130() {
  // delete existing rows
  for (let i = 0; i < 50; i++) {
    const del = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => {
        const t = (x.innerText || '').trim();
        const r = x.getBoundingClientRect();
        return (t === '删除' || t === '刪除') && r.y > 100 && r.y < 900 && !x.disabled;
      });
      if (!b) return false;
      b.click();
      return true;
    });
    if (!del) break;
    await sleep(150);
  }

  // 重复 小时 添加 — exact button text match, not parent that includes both labels
  const rep = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').replace(/\s+/g, ' ').trim();
      const r = x.getBoundingClientRect();
      return (
        (t === '重复 小时 添加' || t === '重复小时添加' || t.includes('반복 시간 추가')) &&
        r.width > 50 &&
        r.height > 20 &&
        r.y > 100
      );
    });
    if (!b) return null;
    b.click();
    return (b.innerText || '').trim();
  });
  console.log('  repeat', rep);
  await sleep(1200);

  // After click, should see generate UI with two time fields
  const hasGen = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).some((b) => {
      const t = (b.innerText || '').trim();
      return t === '生成' || t === '一代' || t === '생성';
    }),
  );
  console.log('  hasGen', hasGen);

  async function pick(idx, hour, minute) {
    // find 选择 or HH:MM fields inside time modal (prefer last dialog)
    const fields = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .map((b, i) => {
          const t = (b.innerText || '').trim();
          const r = b.getBoundingClientRect();
          return {
            i,
            t,
            y: Math.round(r.y),
            w: Math.round(r.width),
            vis: r.height > 20 && r.width > 40 && r.y > 80 && r.y < 850,
          };
        })
        .filter((b) => b.vis && (b.t === '选择' || b.t === '選擇' || /^\d{2}:\d{2}$/.test(b.t))),
    );
    console.log('  fields', fields.map((f) => f.t));
    // Prefer fields that are time-related (not calendar days). Calendar days are single digits.
    // Time pickers show 选择 or HH:MM with width ~400+
    const timeFields = fields.filter((f) => f.w > 100);
    const target = timeFields[idx] || fields[idx];
    if (!target) {
      console.log('  no field', idx);
      return false;
    }
    await page.locator('button').nth(target.i).click({ force: true });
    await sleep(500);

    // hour — leftmost
    await page.evaluate((h) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === h,
      );
      if (opts.length) {
        opts.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x);
        opts[0].click();
        return;
      }
      // dropdown list items
      Array.from(document.querySelectorAll('div,li,span'))
        .filter((el) => {
          const t = (el.innerText || '').trim();
          const r = el.getBoundingClientRect();
          return t === h && el.children.length === 0 && r.height > 8 && r.height < 40 && r.y > 50;
        })
        .sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x)[0]
        ?.click();
    }, hour);
    await sleep(250);

    // minute — rightmost
    await page.evaluate((m) => {
      const opts = Array.from(document.querySelectorAll('[role=option]')).filter(
        (el) => (el.innerText || '').trim() === m,
      );
      if (opts.length) {
        opts.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x);
        opts[0].click();
        return;
      }
      Array.from(document.querySelectorAll('div,li,span'))
        .filter((el) => {
          const t = (el.innerText || '').trim();
          const r = el.getBoundingClientRect();
          return t === m && el.children.length === 0 && r.height > 8 && r.height < 40 && r.y > 50;
        })
        .sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x)[0]
        ?.click();
    }, minute);
    await sleep(400);
    return true;
  }

  await pick(0, '08', '00');
  await pick(1, '21', '30');

  // interval 分钟 → 30
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      const r = x.getBoundingClientRect();
      return (t === '分钟' || t === '分鐘' || t.includes('분')) && r.y > 100 && r.y < 800;
    });
    b?.click();
  });
  await sleep(400);
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('[role=option],button,li,div')).find((e) => {
      const t = (e.innerText || '').trim();
      const r = e.getBoundingClientRect();
      return t === '30' && r.width > 20 && r.height < 50 && r.y > 100 && r.y < 900;
    });
    el?.click();
  });
  await sleep(400);

  // MUST 生成
  const gen = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return t === '生成' || t === '一代' || t === '생성';
    });
    if (!b) return null;
    b.click();
    return (b.innerText || '').trim();
  });
  console.log('  generate', gen);
  await sleep(2500);

  // count unique times in last dialog
  const slots = await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role=dialog]'));
    const t = (dialogs[dialogs.length - 1] || document.body).innerText;
    // Prefer compact 时间段 line if present
    const line = t.match(/时间段\s*\n\s*([0-9:·.\s]+)/);
    if (line) {
      const slots = line[1]
        .split(/[·.\s]+/)
        .map((s) => s.trim())
        .filter((x) => /^\d{2}:\d{2}$/.test(x));
      return { count: slots.length, first: slots[0], last: slots[slots.length - 1], via: 'line' };
    }
    const times = [...new Set((t.match(/\b\d{2}:\d{2}\b/g) || []))];
    // filter out noise - keep only between 08 and 21
    const filtered = times.filter((x) => {
      const [h, m] = x.split(':').map(Number);
      return h >= 7 && h <= 22;
    });
    return {
      count: filtered.length,
      first: filtered[0],
      last: filtered[filtered.length - 1],
      via: 'all',
      all: filtered,
    };
  });
  console.log('  slots', slots);

  // modal 保存
  await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role=dialog]'));
    const last = dialogs[dialogs.length - 1] || document;
    const btns = Array.from(last.querySelectorAll('button')).filter((b) => {
      const t = (b.innerText || '').trim();
      return (t === '保存' || t === '节省' || t === '節省') && !b.disabled;
    });
    (btns[btns.length - 1] || btns[0])?.click();
  });
  await sleep(1500);
  return slots;
}

// ——— main loop ———
// Hard gate: form 时间段 compact must be 28/08:00/21:30; never exit 0 on count:0
const EXPECTED = 28;
const results = [];
for (let i = 0; i < 4; i++) {
  console.log(`\n======== OPTION ${i + 1} ========`);
  try {
    await openEdit(i);
    const path = await openTimeEditor();
    console.log('  time open', path);
    if (!path) {
      console.log('  FAIL open time — skip');
      results.push({ i, ok: false, reason: 'no time editor' });
      await page.keyboard.press('Escape');
      await sleep(500);
      await stayIfLeave();
      const ok = page.getByRole('button', { name: /^确定$/ });
      if ((await ok.count()) > 0) await ok.last().click();
      await sleep(800);
      continue;
    }
    const slots = await setTimes0800to2130();
    if (!slots || slots.count < 20) {
      console.log('  WARN slots low, retry once');
      const still = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[role=dialog]')).some((d) =>
          /设置时间|开始时间|重复/.test(d.innerText || ''),
        ),
      );
      if (!still) {
        await openTimeEditor();
      }
      await setTimes0800to2130();
    }

    // verify on form 时间段 line only (not page-wide HH:MM)
    const verify = await page.evaluate(() => {
      const t = document.body.innerText;
      const m = t.match(/时间段\s*\n\s*([0-9:·.\s]+)/);
      if (!m) return { count: 0 };
      const slots = m[1]
        .split(/[·.\s]+/)
        .map((s) => s.trim())
        .filter((x) => /^\d{2}:\d{2}$/.test(x));
      return { count: slots.length, first: slots[0], last: slots[slots.length - 1], raw: m[1].slice(0, 80) };
    });
    console.log('  verify form', verify);
    const ok =
      verify.count === EXPECTED && verify.first === '08:00' && verify.last === '21:30';
    if (!ok) console.log('  FAIL verify — will NOT report success');
    results.push({ i, ok, verify });

    await tempThenNext(`opt${i + 1}`);
  } catch (e) {
    console.log('  ERROR', e.message);
    results.push({ i, ok: false, error: e.message });
    await stayIfLeave();
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(500);
  }
}

// final state
const final = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    url: location.href,
    o1: t.includes('호텔 출발') && t.includes('5인승'),
    o2: t.includes('호텔 출발') && t.includes('7인승'),
    o3: t.includes('동방명주탑 출발') && t.includes('5인승'),
    o4: t.includes('동방명주탑 출발') && t.includes('7인승'),
    sale: (t.match(/可销售|销售中/g) || []).length,
  };
});
console.log('\nRESULTS', JSON.stringify(results, null, 2));
console.log('DONE times', final);
const allOk = results.length === 4 && results.every((r) => r.ok);
console.log(allOk ? 'ALL_OK' : 'NEED_REPAIR');
console.log('NEVER 提交审核');
process.exit(allOk ? 0 : 2);
