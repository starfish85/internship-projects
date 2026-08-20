/* Tripster ru→zh engine: dictionary first, then regex, then leftover body MT. */
(function (global) {
  const CYR = /[А-Яа-яЁё]/;
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "KBD", "SVG", "MATH",
  ]);

  const WEEKDAY_SHORT = {
    вс: "周日", вск: "周日", пн: "周一", пнд: "周一",
    вт: "周二", втр: "周二", ср: "周三", срд: "周三",
    чт: "周四", чтв: "周四", пт: "周五", птн: "周五",
    сб: "周六", суб: "周六",
  };
  const MONTH_SHORT = {
    янв: "1月", фев: "2月", мар: "3月", апр: "4月",
    мая: "5月", май: "5月", июн: "6月", июл: "7月",
    авг: "8月", сен: "9月", сент: "9月", окт: "10月",
    ноя: "11月", нояб: "11月", дек: "12月",
  };
  const MONTH_FULL = {
    января: "1月", февраля: "2月", марта: "3月", апреля: "4月", мая: "5月",
    июня: "6月", июля: "7月", августа: "8月", сентября: "9月", октября: "10月",
    ноября: "11月", декабря: "12月",
    январь: "1月", февраль: "2月", март: "3月", апрель: "4月", май: "5月",
    июнь: "6月", июль: "7月", август: "8月", сентябрь: "9月", октябрь: "10月",
    ноябрь: "11月", декабрь: "12月",
  };

  const MT_FIX = [
    [/这个游览将被进行在/g, "行程在"],
    [/游览将被进行在/g, "行程在"],
    [/将被进行在/g, "在"],
    [/您可以做选择的日期/g, "可选日期"],
    [/可以进行选择/g, "可选择"],
    [/进行选择/g, "选择"],
    [/被包含在/g, "包含"],
    [/被包含/g, "包含"],
    [/实现预订/g, "预订"],
    [/做出预订/g, "预订"],
    [/进行预订/g, "预订"],
    [/不带有包含/g, "不含"],
    [/没有被包含/g, "不含"],
    [/在城市的中心/g, "在市中心"],
    [/城市的中心/g, "市中心"],
    [/旅游者/g, "旅客"],
    [/旅行者/g, "旅客"],
    [/导游员/g, "向导"],
    [/预付款项/g, "预付"],
    [/退还资金不规定/g, "不可退款"],
    [/资金返还不予以规定/g, "不可退款"],
    [/不寻常的游览/g, "小众行程"],
    [/不寻常的观光/g, "小众行程"],
    [/不寻常的旅行/g, "小众行程"],
    [/不寻常的路线/g, "小众路线"],
    [/不寻常的房子/g, "小众建筑"],
    [/不寻常的步行/g, "小众步行"],
    [/不寻常且原始的步行/g, "向导自制步行"],
    [/不寻常的/g, "小众"],
    [/原始的步行/g, "向导自制步行"],
    [/短途旅行/g, "行程"],
    [/设有站点/g, "中途停靠"],
    [/主要内容/g, "主要景点"],
    [/您就熟悉/g, "就能了解"],
    [/拼团 行程/g, "拼团行程"],
    [/评价а/g, "评价"],
    [/评价a/g, "评价"],
    [/([\u4e00-\u9fff])а/g, "$1"],
    [/作者游览/g, "向导自制行程"],
    [/作者的游览/g, "向导自制行程"],
    [/作者团/g, "向导自制行程"],
    [/个体游览/g, "包团"],
    [/个人游览/g, "包团"],
    [/集体游览/g, "拼团"],
    [/小组游览/g, "小团"],
    [/游览/g, "行程"],
    [/向导员/g, "向导"],
    [/组织者/g, "组织方"],
    [/请预订/g, "预订"],
    [/做出选择/g, "选择"],
    [/进行沟通/g, "沟通"],
    [/进行支付/g, "支付"],
    [/被取消/g, "已取消"],
    [/将被取消/g, "将取消"],
    [/(\d+)\s*小时内的\s*/g, "$1小时逛"],
    [/(\d+)\s*小时之内的\s*/g, "$1小时逛"],
  ];

  function yo(s) {
    return String(s).replace(/ё/g, "е").replace(/Ё/g, "Е");
  }

  function normalize(s) {
    return yo(String(s)).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function hasCyrillic(s) {
    return CYR.test(s);
  }

  function looksTranslatable(s) {
    if (!s) return false;
    const t = normalize(s);
    if (!t) return false;
    if (/^[\d\s.,:%+/−–—\-₽$€£¥★]+$/.test(t)) return false;
    if (/^https?:\/\//i.test(t) || /^[\w.+-]+@[\w.-]+\.\w+$/.test(t)) return false;
    if (/^\+?\d[\d\s()-]{5,}$/.test(t)) return false;
    return hasCyrillic(t) || /[A-Za-z]{3,}/.test(t);
  }

  function compile(dictionary, phrases, glossary) {
    const exact = new Map();
    const phraseList = [];
    for (const e of dictionary.entries || []) {
      const key = normalize(e.src).toLowerCase();
      if (!key) continue;
      const rec = { ...e, key };
      if (e.match === "phrase") phraseList.push(rec);
      else {
        if (!exact.has(key) || (exact.get(key).src.length < e.src.length)) {
          exact.set(key, rec);
        }
      }
    }
    phraseList.sort((a, b) => b.src.length - a.src.length);

    const regexRules = (phrases.regex || []).map((r) => ({
      ...r,
      rx: new RegExp(r.re, r.flags || ""),
    }));

    const gloss = (glossary.terms || [])
      .slice()
      .sort((a, b) => b.src.length - a.src.length);

    return { exact, phraseList, regexRules, gloss };
  }

  function applySpecialRegex(rule, text) {
    const m = text.match(rule.rx);
    if (!m) return null;
    if (rule.kind === "weekday_short_date") {
      const wd = WEEKDAY_SHORT[yo(m[1]).toLowerCase()] || m[1];
      const mon = MONTH_SHORT[yo(m[3]).toLowerCase()] || m[3];
      return m[4] ? `${wd} ${m[2]} ${mon} ${m[4]}` : `${wd} ${m[2]} ${mon}`;
    }
    if (rule.kind === "day_month") {
      const mon = MONTH_FULL[yo(m[2]).toLowerCase()] || m[2];
      return `${m[1]} ${mon}`;
    }
    if (rule.kind === "day_month_year") {
      const mon = MONTH_FULL[yo(m[2]).toLowerCase()] || m[2];
      return `${m[3]}年${mon}${m[1]}日`;
    }
    if (rule.kind === "weekend_range") {
      const mon = MONTH_SHORT[yo(m[3]).toLowerCase()] || m[3];
      return `周末 ${m[1]}–${m[2]} ${mon}`;
    }
    if (rule.kind === "month_year") {
      const raw = yo(m[1]).toLowerCase();
      let mon = MONTH_FULL[raw];
      if (!mon) {
        for (const [k, v] of Object.entries(MONTH_FULL)) {
          if (raw.startsWith(k.slice(0, 4))) { mon = v; break; }
        }
      }
      return `${m[2]}年${mon || m[1]}`;
    }
    return null;
  }

  function applyRegex(text, compiled) {
    const n = normalize(text);
    for (const rule of compiled.regexRules) {
      if (rule.kind) {
        const special = applySpecialRegex(rule, n);
        if (special) return { text: special, hit: "regex" };
        continue;
      }
      if (rule.rx.test(n)) {
        rule.rx.lastIndex = 0;
        return { text: n.replace(rule.rx, rule.zh), hit: "regex" };
      }
    }
    return null;
  }

  function applyPhrases(text, compiled) {
    let out = yo(text);
    let changed = false;
    for (const p of compiled.phraseList) {
      if (p.src.length < 4) continue;
      const rx = new RegExp(
        "(?<![А-Яа-яЁёA-Za-z])" + escapeRe(yo(p.src)) + "(?![А-Яа-яЁёA-Za-z])",
        "gi"
      );
      const next = out.replace(rx, p.zh);
      if (next !== out) {
        out = next;
        changed = true;
      }
    }
    return changed ? out : text;
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function protectGlossary(text, compiled) {
    const slots = [];
    let out = text;
    compiled.gloss.forEach((g, i) => {
      if (!g.src) return;
      const rx = new RegExp(
        "(?<![А-Яа-яЁёA-Za-z])" + escapeRe(g.src) + "(?![А-Яа-яЁёA-Za-z])",
        "gi"
      );
      if (!rx.test(out)) return;
      rx.lastIndex = 0;
      const token = `XGLS${i}X`;
      out = out.replace(rx, token);
      slots.push({ token, zh: g.zh, src: g.src });
    });
    return { text: out, slots };
  }

  function restoreGlossary(text, slots) {
    let out = text;
    for (const s of slots) out = out.split(s.token).join(s.zh);
    return out;
  }

  function polishMt(text) {
    let out = text;
    for (const [rx, to] of MT_FIX) out = out.replace(rx, to);
    return out.replace(/\s{2,}/g, " ").trim();
  }

  function translateLocal(raw, compiled) {
    const src = String(raw);
    const n = normalize(src);
    if (!n) return { text: src, hit: null, leftover: false };

    const exact = compiled.exact.get(n.toLowerCase()) || compiled.exact.get(yo(n).toLowerCase());
    if (exact) return { text: exact.zh, hit: "dict", leftover: false };

    const byRegex = applyRegex(src, compiled);
    if (byRegex) return { ...byRegex, leftover: false };

    let next = applyPhrases(src, compiled);
    const leftover = hasCyrillic(next);
    const hit = next !== src ? (leftover ? "mixed" : "dict") : null;
    return { text: next, hit, leftover };
  }

  function shouldSkipElement(el) {
    if (!el || el.nodeType !== 1) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    if (el.closest && el.closest("[contenteditable=true]")) return true;
    return false;
  }

  function isEditing(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName;
    if (tag === "TEXTAREA") return document.activeElement === el;
    if (tag === "INPUT") {
      const type = (el.type || "text").toLowerCase();
      if (["hidden", "checkbox", "radio", "submit", "button", "file"].includes(type)) return false;
      return document.activeElement === el;
    }
    return false;
  }

  function needsBodyMt(text, local) {
    if (!local.leftover) return false;
    const cyr = (local.text.match(/[А-Яа-яЁё]/g) || []).length;
    return cyr >= 8 || local.text.length >= 24;
  }

  global.TSEngine = {
    compile,
    translateLocal,
    protectGlossary,
    restoreGlossary,
    polishMt,
    hasCyrillic,
    looksTranslatable,
    shouldSkipElement,
    isEditing,
    needsBodyMt,
    normalize,
    yo,
  };
})(typeof window !== "undefined" ? window : self);
