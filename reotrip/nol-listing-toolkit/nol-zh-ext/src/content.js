/**
 * NOL Partner Center → 简体中文
 *
 * 安全原则：
 * - 只改 TEXT 节点和少量属性，绝不 el.textContent= 整段覆盖（会拆掉 React）
 * - 绝不翻译 input / textarea / contenteditable 内的用户填写内容（含韩文）
 * - SPA 重扫只针对文本节点
 */

(() => {
  if (window.__NOL_ZH_ACTIVE__) return;
  window.__NOL_ZH_ACTIVE__ = true;

  try {
    if (!document.getElementById("nol-zh-inject")) {
      const el = document.createElement("script");
      el.id = "nol-zh-inject";
      el.src = chrome.runtime.getURL("src/inject.js");
      el.async = false;
      (document.head || document.documentElement).appendChild(el);
    }
  } catch (_) {}

  const HANGUL = /[\uAC00-\uD7A3]/
  // 浏览器机翻常见繁体字（识别后走繁→简 / remap）
  const TRAD_CHAR =
    /[註產類選擇請語國際個與為這還會時間開關儲備餘數點區場處實際業務貨運輸團體機構標準價買賣銷購訂預約確認證據優對應當從來裡裏後發現見視頻圖寫讀說話總經驗復複據釋術進遊課內別項舉辦門宮領議萬麼並稱無長東車經絡隻陽陰雙響頁風飛飯馬體髮幹乾亂亞們儀億儲內兩冊凍凱刪剛創劃劇劉劍劑勁動務勝勞勢勳勵勸匯區醫華協單賣衛卻厲縣叢]/;

  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "CODE",
    "PRE",
    "SVG",
    "MATH",
    "TEXTAREA",
  ]);

  const ATTRS = [
    "placeholder",
    "title",
    "aria-label",
    "alt",
    "aria-placeholder",
    "data-tooltip",
    "data-title",
  ];

  let DICT = {};
  let REMAP = {};
  const runtimeDict = new Map();

  let settings = { enabled: true, online: true };
  let scanQueued = false;
  let applying = false;
  let observer = null;
  let _phraseKeys = null;

  function normKey(s) {
    return String(s)
      .replace(/&nbsp;/gi, " ")
      .replace(/[\u00a0\u202f\u200b\u200c\u200d\ufeff]/g, " ")
      .replace(/[↔⟷⇔⇄⇆]/g, "↔")
      .replace(/[→⟶➔]/g, "→")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasHangul(s) {
    return HANGUL.test(s || "");
  }
  function hasTrad(s) {
    return TRAD_CHAR.test(s || "");
  }

  function needsTranslate(s) {
    if (!s || !String(s).trim()) return false;
    if (hasHangul(s)) return true;
    if (hasTrad(s)) return true;
    const k = normKey(s);
    if (REMAP[k] || REMAP[s]) return true;
    // 浏览器机翻残留：半繁半简 / 生硬简体
    if (
      /解釋|術語|術语|課程|導遊|旅遊|舉辦|進行|領取|宮殿|个別|個別|会議|會議|是的。|相關|相关的術|時間表相关/.test(
        s
      )
    ) {
      return true;
    }
    return false;
  }

  function tradLoose(s) {
    let out = String(s);
    // 先整词，再单字（覆盖浏览器机翻残留繁体）
    out = out
      .replace(/修復/g, "修复")
      .replace(/註冊/g, "注册")
      .replace(/恢復/g, "恢复")
      .replace(/選項/g, "选项")
      .replace(/產品/g, "产品")
      .replace(/預約/g, "预约")
      .replace(/確認/g, "确认")
      .replace(/價格/g, "价格")
      .replace(/銷售/g, "销售")
      .replace(/臨時/g, "临时")
      .replace(/儲存/g, "保存")
      .replace(/開啟/g, "开启")
      .replace(/關閉/g, "关闭")
      .replace(/語言/g, "语言")
      .replace(/國籍/g, "国籍")
      .replace(/數目/g, "数目")
      .replace(/時間/g, "时间")
      .replace(/資訊/g, "信息")
      .replace(/詳情/g, "详情")
      .replace(/內容/g, "内容")
      .replace(/類型/g, "类型")
      .replace(/類別/g, "类别")
      .replace(/介紹/g, "介绍")
      .replace(/設置/g, "设置")
      .replace(/設定/g, "设置")
      .replace(/解釋/g, "解释")
      .replace(/術語/g, "术语")
      .replace(/術语/g, "术语")
      .replace(/旅遊/g, "旅游")
      .replace(/導遊/g, "导游")
      .replace(/課程/g, "课程")
      .replace(/項目/g, "项目")
      .replace(/个別/g, "个别")
      .replace(/個別/g, "个别")
      .replace(/會議/g, "会议")
      .replace(/会議/g, "会议")
      .replace(/舉辦/g, "举办")
      .replace(/舉办/g, "举办")
      .replace(/進行/g, "进行")
      .replace(/領取/g, "领取")
      .replace(/體驗/g, "体验")
      .replace(/体驗/g, "体验")
      .replace(/宮殿/g, "宫殿")
      .replace(/相關/g, "相关")
      .replace(/相關/g, "相关")
      .replace(/號/g, "号")
      .replace(/與/g, "与")
      .replace(/為/g, "为")
      .replace(/這/g, "这")
      .replace(/還/g, "还")
      .replace(/會/g, "会")
      .replace(/開/g, "开")
      .replace(/關/g, "关")
      .replace(/請/g, "请")
      .replace(/個/g, "个")
      .replace(/產/g, "产")
      .replace(/類/g, "类")
      .replace(/選/g, "选")
      .replace(/擇/g, "择")
      .replace(/語/g, "语")
      .replace(/國/g, "国")
      .replace(/際/g, "际")
      .replace(/點/g, "点")
      .replace(/區/g, "区")
      .replace(/場/g, "场")
      .replace(/處/g, "处")
      .replace(/實/g, "实")
      .replace(/際/g, "际")
      .replace(/業/g, "业")
      .replace(/務/g, "务")
      .replace(/運/g, "运")
      .replace(/輸/g, "输")
      .replace(/團/g, "团")
      .replace(/體/g, "体")
      .replace(/機/g, "机")
      .replace(/標/g, "标")
      .replace(/準/g, "准")
      .replace(/價/g, "价")
      .replace(/買/g, "买")
      .replace(/賣/g, "卖")
      .replace(/銷/g, "销")
      .replace(/購/g, "购")
      .replace(/訂/g, "订")
      .replace(/預/g, "预")
      .replace(/約/g, "约")
      .replace(/確/g, "确")
      .replace(/認/g, "认")
      .replace(/證/g, "证")
      .replace(/據/g, "据")
      .replace(/優/g, "优")
      .replace(/對/g, "对")
      .replace(/應/g, "应")
      .replace(/當/g, "当")
      .replace(/從/g, "从")
      .replace(/來/g, "来")
      .replace(/裡/g, "里")
      .replace(/裏/g, "里")
      .replace(/後/g, "后")
      .replace(/發/g, "发")
      .replace(/現/g, "现")
      .replace(/見/g, "见")
      .replace(/視/g, "视")
      .replace(/圖/g, "图")
      .replace(/寫/g, "写")
      .replace(/讀/g, "读")
      .replace(/說/g, "说")
      .replace(/話/g, "话")
      .replace(/總/g, "总")
      .replace(/經/g, "经")
      .replace(/驗/g, "验")
      .replace(/復/g, "复")
      .replace(/複/g, "复")
      .replace(/時/g, "时")
      .replace(/間/g, "间")
      .replace(/數/g, "数")
      .replace(/備/g, "备")
      .replace(/儲/g, "储")
      .replace(/註/g, "注")
      .replace(/釋/g, "释")
      .replace(/術/g, "术")
      .replace(/進/g, "进")
      .replace(/遊/g, "游")
      .replace(/課/g, "课")
      .replace(/內/g, "内")
      .replace(/別/g, "别")
      .replace(/項/g, "项")
      .replace(/舉/g, "举")
      .replace(/辦/g, "办")
      .replace(/門/g, "门")
      .replace(/宮/g, "宫")
      .replace(/領/g, "领")
      .replace(/議/g, "议")
      .replace(/萬/g, "万")
      .replace(/麼/g, "么")
      .replace(/並/g, "并")
      .replace(/稱/g, "称")
      .replace(/無/g, "无")
      .replace(/長/g, "长")
      .replace(/東/g, "东")
      .replace(/車/g, "车")
      .replace(/餘/g, "余")
      .replace(/餘/g, "余")
      .replace(/餘/g, "余")
      // 机翻残留：句末多余「是的。」（韩语입니다 被硬译）
      .replace(/。是的。/g, "。")
      .replace(/是的。導/g, "例如：导")
      .replace(/是的。导/g, "例如：导");
    return out;
  }

  function lookupRemap(raw) {
    if (!raw) return null;
    const key = normKey(raw);
    if (REMAP[key]) return REMAP[key];
    if (REMAP[raw]) return REMAP[raw];
    const loose = tradLoose(key);
    if (REMAP[loose]) return REMAP[loose];
    // 长说明文案也做繁→简（原 60 字上限导致帮助条文不生效）
    if (hasTrad(key) && !hasHangul(key) && key.length <= 400) {
      const s = tradLoose(key);
      if (s !== key) return s;
    }
    // 已是简体但含机翻痕迹：仍走 tradLoose 纠偏（如「。是的。」）
    if (!hasHangul(key) && key.length <= 400) {
      const s = tradLoose(key);
      if (s !== key && (/是的。|術语|術語|解釋|課程|導遊|旅遊|舉辦|進行|領取|宮殿|个別|個別|会議|會議/.test(key))) {
        return s;
      }
    }
    return null;
  }

  function lookupExactKo(raw) {
    if (!raw) return null;
    const key = normKey(raw);
    if (DICT[key]) return DICT[key];
    if (DICT[raw]) return DICT[raw];
    if (runtimeDict.has(key)) return runtimeDict.get(key);
    return null;
  }

  function getPhraseKeys() {
    if (_phraseKeys) return _phraseKeys;
    const keys = Object.keys(DICT).filter(
      (k) => k.length >= 2 && k.length <= 100 && hasHangul(k)
    );
    keys.sort((a, b) => b.length - a.length);
    _phraseKeys = keys.slice(0, 4000);
    return _phraseKeys;
  }

  /**
   * 商品名 / 选项名 / 路线名：必须保留韩文，禁止机翻或词典改写。
   * 典型：오사카 시내 호텔 ↔ 이타미공항(ITM) 단독 차량 편도 이동 서비스
   */
  function isProductContentLike(s) {
    const t = String(s || "").trim();
    if (!t || t.length < 8) return false;
    // 含路线箭头的长标题
    if ((t.includes("↔") || t.includes("→") || t.includes("⟶")) && t.length >= 12) return true;
    // 韩文接送商品句式
    if (
      hasHangul(t) &&
      (/(시내\s*호텔|단독\s*차량|편도\s*이동|전용\s*차량|픽업\s*[/／]\s*샌딩|인승\s*차량)/.test(t) ||
        /(공항|호텔|디즈니|유니버설|항\b|역\b).{0,40}(이동|서비스|픽업)/.test(t))
    ) {
      return true;
    }
    // 已被误译成中文的商品名：改回韩文由 remap 处理，lookup 不再二次机翻
    if (
      !hasHangul(t) &&
      (/(市内酒店|城市酒店|独享车辆|私家车|单程接送|专用车辆|接驳\/送机)/.test(t) ||
        /(酒店|机场|港口|车站|迪士尼|环球影城).{0,40}(接送|私家车|独享)/.test(t)) &&
      (t.includes("↔") || t.includes("→") || /ITM|KIX|HND|NRT|ITM|机场|港口/.test(t))
    ) {
      return true;
    }
    return false;
  }

  function partialTranslateKo(text) {
    // 商品名整段不参与部分替换（避免「시내 호텔→市内酒店」撕碎标题）
    if (isProductContentLike(text)) return null;

    let out = text;
    let changed = false;
    for (const k of getPhraseKeys()) {
      // 跳过商品名级长词条（≥12 且含路线/接送语义）
      if (isProductContentLike(k) || (k.length >= 12 && (k.includes("↔") || k.includes("→")))) {
        continue;
      }
      if (out.includes(k)) {
        out = out.split(k).join(DICT[k]);
        changed = true;
      }
    }
    // 仅保留短 UI 词，不再替换接送商品句式
    const reps = [
      [/(\d+)\s*인승\s*차량/g, "$1座车"],
      [/(\d+)\s*인승/g, "$1座"],
    ];
    for (const [re, rep] of reps) {
      const next = out.replace(re, rep);
      if (next !== out) {
        out = next;
        changed = true;
      }
    }
    // 若部分替换后仍像商品名，放弃
    if (changed && isProductContentLike(out)) return null;
    return changed ? out : null;
  }

  function lookup(raw) {
    if (!raw) return null;
    const key = normKey(raw);
    if (!key || key.length > 500) return null;

    // 误译中文商品名 → 韩文（remap 优先）
    const remapped = lookupRemap(raw);
    if (remapped && remapped !== key && remapped !== raw) return remapped;

    // 韩文商品名 / 选项名：不译
    if (isProductContentLike(key) || isProductContentLike(raw)) {
      // 若 remap 已给出韩文则上面已返回；否则保持原文
      return null;
    }

    if (hasHangul(key)) {
      const exact = lookupExactKo(raw) || lookupExactKo(key);
      // 词典命中但仍是商品名级：不译
      if (exact && isProductContentLike(key)) return null;
      if (exact) return exact;

      const partial = partialTranslateKo(key);
      if (partial && partial !== key) {
        let polished = tradLoose(partial).replace(/\s+/g, " ").trim();
        if (!hasHangul(polished)) return polished;
        const left = (polished.match(/[\uAC00-\uD7A3]/g) || []).length;
        const before = (key.match(/[\uAC00-\uD7A3]/g) || []).length;
        if (left < before) return polished;
      }
      return null;
    }

    if (hasTrad(key)) {
      const s = tradLoose(key);
      if (s !== key) return s;
    }
    return null;
  }

  function shouldSkipParent(parent) {
    if (!parent) return true;
    if (SKIP_TAGS.has(parent.tagName)) return true;
    // 输入框本身及其内部文本一律不译（用户填写的韩文必须保留）
    if (parent.tagName === "INPUT" || parent.tagName === "TEXTAREA") return true;
    if (parent.isContentEditable) return true;
    if (
      parent.closest &&
      parent.closest(
        "input, textarea, [contenteditable='true'], [contenteditable=''], #nol-zh-badge"
      )
    )
      return true;
    return false;
  }

  function applyTextNode(node, zh) {
    if (!node || zh == null) return;
    const raw = node.nodeValue ?? "";
    if (raw === zh) return;
    // 保持首尾空白
    const m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    applying = true;
    try {
      node.nodeValue = m ? m[1] + zh + m[3] : zh;
    } finally {
      queueMicrotask(() => {
        applying = false;
      });
    }
  }

  function setAttr(el, attr, value) {
    applying = true;
    try {
      el.setAttribute(attr, value);
    } finally {
      queueMicrotask(() => {
        applying = false;
      });
    }
  }

  async function onlineTranslate(text) {
    if (!settings.online || !text) return null;
    const key = normKey(text);
    if (runtimeDict.has(key)) return runtimeDict.get(key);
    try {
      const res = await chrome.runtime.sendMessage({ type: "translateOne", text: key });
      if (res && res.ok && res.zh) {
        let zh = tradLoose(String(res.zh).trim());
        const rem = lookupRemap(zh);
        if (rem) zh = rem;
        if (zh && !hasHangul(zh)) {
          runtimeDict.set(key, zh);
          return zh;
        }
      }
    } catch (_) {}
    return null;
  }

  async function walkTextNodes(root, onlineQueue) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (!needsTranslate(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (shouldSkipParent(node.parentElement)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      const raw = node.nodeValue;
      const key = normKey(raw);
      if (!key || key.length > 500) continue;

      // 超长韩文正文（介绍框里的 text node 若在 contenteditable 已被 skip）
      // 列表标题通常 < 120 字
      const zh = lookup(raw);
      if (zh && zh !== raw) {
        applyTextNode(node, zh);
        if (hasHangul(zh) && settings.online && key.length <= 200) {
          onlineQueue.push({ node, key });
        }
      } else if (
        settings.online &&
        hasHangul(key) &&
        key.length >= 2 &&
        key.length <= 200 &&
        !isProductContentLike(key)
      ) {
        onlineQueue.push({ node, key });
      } else if (
        !isProductContentLike(raw) &&
        key.length <= 400 &&
        (hasTrad(raw) || needsTranslate(raw))
      ) {
        const zh = lookup(raw);
        if (zh && zh !== raw) applyTextNode(node, zh);
        else {
          const s = tradLoose(raw);
          if (s !== raw) applyTextNode(node, s);
        }
      }
    }
  }

  function walkAttrs(root) {
    if (!root || !root.querySelectorAll) return;
    const list = root.querySelectorAll
      ? [root, ...Array.from(root.querySelectorAll("*"))]
      : [root];
    for (const el of list) {
      if (!(el instanceof Element)) continue;

      // 输入框 / 多行文本：永不改 value；仅可译 placeholder 等提示属性
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        for (const attr of ATTRS) {
          if (!el.hasAttribute(attr)) continue;
          const raw = el.getAttribute(attr);
          if (!raw || !needsTranslate(raw)) continue;
          const zh = lookup(raw);
          if (zh && zh !== raw && !hasHangul(zh)) setAttr(el, attr, zh);
        }
        continue;
      }

      // contenteditable 内：不译任何属性，避免动到用户内容
      if (el.isContentEditable || (el.closest && el.closest("[contenteditable='true'], [contenteditable='']"))) {
        continue;
      }

      if (shouldSkipParent(el)) continue;

      for (const attr of ATTRS) {
        if (!el.hasAttribute(attr)) continue;
        const raw = el.getAttribute(attr);
        if (!raw || !needsTranslate(raw)) continue;
        const zh = lookup(raw);
        if (zh && zh !== raw && !hasHangul(zh)) setAttr(el, attr, zh);
      }

      if (el.tagName === "OPTION") {
        const raw = el.text;
        if (raw && needsTranslate(raw)) {
          const zh = lookup(raw);
          if (zh && zh !== raw && !hasHangul(zh)) {
            applying = true;
            try {
              el.text = zh;
            } finally {
              queueMicrotask(() => {
                applying = false;
              });
            }
          }
        }
      }
    }
  }

  async function flushOnline(queue) {
    if (!settings.online || !queue.length) return;
    const byKey = new Map();
    for (const item of queue) {
      if (!byKey.has(item.key)) byKey.set(item.key, []);
      byKey.get(item.key).push(item);
    }
    const keys = [...byKey.keys()];
    for (let i = 0; i < keys.length; i += 8) {
      const slice = keys.slice(i, i + 8);
      let results = [];
      try {
        const res = await chrome.runtime.sendMessage({ type: "translateBatch", texts: slice });
        results = (res && res.results) || [];
      } catch (_) {
        for (const t of slice) {
          const zh = await onlineTranslate(t);
          results.push({ text: t, zh: zh, ok: !!zh });
        }
      }
      for (const r of results) {
        if (!r || !r.ok || !r.zh) continue;
        let zh = tradLoose(String(r.zh).trim());
        const rem = lookupRemap(zh);
        if (rem) zh = rem;
        if (!zh || hasHangul(zh)) continue;
        runtimeDict.set(r.text, zh);
        for (const item of byKey.get(r.text) || []) {
          try {
            if (item.node && item.node.isConnected) applyTextNode(item.node, zh);
          } catch (_) {}
        }
      }
    }
  }

  async function scan(root) {
    if (!settings.enabled) return;
    const base = root || document.body;
    if (!base) return;
    const onlineQueue = [];
    try {
      walkAttrs(base);
      await walkTextNodes(base, onlineQueue);
      await flushOnline(onlineQueue);
    } catch (e) {
      console.warn("[nol-zh] scan error", e);
    }
  }

  function queueScan(root) {
    if (!settings.enabled || applying) return;
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      scan(root || document.body);
    });
  }

  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      if (!settings.enabled || applying) return;
      queueScan(document.body);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS.concat(["class"]),
    });
  }

  function hookUiEvents() {
    const kick = () => {
      if (!settings.enabled) return;
      setTimeout(() => queueScan(document.body), 50);
      setTimeout(() => queueScan(document.body), 200);
      setTimeout(() => queueScan(document.body), 500);
    };
    document.addEventListener("click", kick, true);
    document.addEventListener("focusin", kick, true);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "settingsChanged") {
      settings = Object.assign({}, settings, msg.settings || {});
      if (settings.enabled) queueScan(document.body);
    }
    if (msg && msg.type === "forceRetranslate") {
      runtimeDict.clear();
      scan(document.body);
      setTimeout(() => scan(document.body), 300);
      setTimeout(() => scan(document.body), 800);
    }
  });

  async function init() {
    try {
      const data = await chrome.storage.local.get("settings");
      if (data.settings) settings = Object.assign({}, settings, data.settings);
    } catch (_) {}

    try {
      const [dRes, rRes] = await Promise.all([
        fetch(chrome.runtime.getURL("src/dictionary_ko_zh.json")),
        fetch(chrome.runtime.getURL("src/remap_zh.json")),
      ]);
      DICT = await dRes.json();
      REMAP = await rRes.json();
    } catch (e) {
      console.warn("[nol-zh] dict load failed", e);
      DICT = {};
      REMAP = {};
    }

    const nd = {};
    for (const [k, v] of Object.entries(DICT)) {
      if (!v) continue;
      nd[k] = v;
      nd[normKey(k)] = v;
    }
    DICT = nd;

    const nr = Object.assign({}, REMAP, {
      註冊: "注册",
      修復: "修复",
      恢復: "恢复",
      選項: "选项",
      產品: "产品",
      預約: "预约",
      確認: "确认",
      價格: "价格",
      銷售: "销售",
    });
    for (const [k, v] of Object.entries(nr)) {
      if (!v) continue;
      nr[normKey(k)] = v;
    }
    REMAP = nr;
    _phraseKeys = null;

    console.info("[nol-zh] ready safe-mode dict=%d", Object.keys(DICT).length);

    startObserver();
    hookUiEvents();
    // 轻量周期重扫（仅文本节点，安全）
    setInterval(() => {
      if (settings.enabled) queueScan(document.body);
    }, 1500);

    if (!settings.enabled) return;
    await scan(document.body);
    setTimeout(() => scan(document.body), 400);
    setTimeout(() => scan(document.body), 1200);

    try {
      const tip = document.createElement("div");
      tip.id = "nol-zh-badge";
      tip.textContent = "中";
      tip.title = "NOL 简体（安全模式：不拆页面结构）";
      Object.assign(tip.style, {
        position: "fixed",
        right: "10px",
        bottom: "10px",
        zIndex: "2147483646",
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        background: "#16a34a",
        color: "#fff",
        fontSize: "13px",
        fontWeight: "700",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,.25)",
        opacity: "0.9",
        pointerEvents: "none",
      });
      document.documentElement.appendChild(tip);
      setTimeout(() => tip.remove(), 3000);
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
