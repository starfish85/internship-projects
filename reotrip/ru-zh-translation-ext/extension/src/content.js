/* Content script: walk DOM, dictionary first, then body MT for leftover Russian. */
(function () {
  const ATTRS = ["placeholder", "aria-label", "title", "alt"];
  const DONE = "data-i18n-done";
  const HIT = "data-i18n-hit";
  const SRC = "data-i18n-src";

  const originals = new WeakMap(); // Text node -> original string
  const attrOriginals = new WeakMap(); // Element -> {attr: original}
  const pendingMt = new Map(); // key -> {nodes:[{kind,node,attr,src}], text}
  let compiled = null;
  let settings = { enabled: true, highlight: false };
  let applying = false;
  let debounceTimer = 0;
  const observedRoots = new WeakSet();

  function setHighlightClass() {
    document.documentElement.classList.toggle("s8-i18n-highlight", !!settings.highlight);
    document.documentElement.classList.toggle("s8-i18n-off", !settings.enabled);
  }

  async function loadData() {
    const urls = ["data/dictionary.json", "data/glossary.json", "data/phrases.json"];
    const [dictionary, glossary, phrases] = await Promise.all(
      urls.map((u) => fetch(chrome.runtime.getURL(u)).then((r) => r.json()))
    );
    compiled = S8Engine.compile(dictionary, phrases, glossary);
  }

  function markEl(el, hit) {
    if (!el || el.nodeType !== 1) return;
    el.setAttribute(DONE, "1");
    if (hit) el.setAttribute(HIT, hit);
  }

  function applyTextNode(node, next, hit) {
    if (node.nodeType !== 3) return;
    if (!originals.has(node)) originals.set(node, node.nodeValue);
    applying = true;
    node.nodeValue = next;
    applying = false;
    if (node.parentElement) markEl(node.parentElement, hit);
  }

  function restoreTextNode(node) {
    if (!originals.has(node)) return;
    applying = true;
    node.nodeValue = originals.get(node);
    applying = false;
  }

  function applyAttr(el, attr, next, hit) {
    if (!attrOriginals.has(el)) attrOriginals.set(el, {});
    const bag = attrOriginals.get(el);
    if (!(attr in bag)) bag[attr] = el.getAttribute(attr);
    applying = true;
    el.setAttribute(attr, next);
    el.setAttribute(`${SRC}-${attr}`, bag[attr] || "");
    applying = false;
    markEl(el, hit);
  }

  function restoreAttrs(el) {
    const bag = attrOriginals.get(el);
    if (!bag) return;
    applying = true;
    for (const [a, v] of Object.entries(bag)) {
      if (v == null) el.removeAttribute(a);
      else el.setAttribute(a, v);
    }
    applying = false;
  }

  function queueMt(src, payload) {
    const key = S8Engine.normalize(src);
    if (!pendingMt.has(key)) pendingMt.set(key, { text: src, items: [] });
    pendingMt.get(key).items.push(payload);
  }

  function handleString(src, apply, payload) {
    if (!S8Engine.looksTranslatable(src)) return;
    const local = S8Engine.translateLocal(src, compiled);
    if (local.hit && !local.leftover) {
      apply(local.text, local.hit);
      return;
    }
    if (S8Engine.needsBodyMt(src, local)) {
      if (local.hit && local.text !== src) apply(local.text, "mixed");
      queueMt(src, payload);
      return;
    }
    if (local.hit) apply(local.text, local.hit);
  }

  function walk(root) {
    if (!compiled || !settings.enabled) return;
    if (!root) return;

    const doc = root.nodeType === 11 || root.nodeType === 9 ? root : root.ownerDocument || document;
    if (root.nodeType === 1 && S8Engine.shouldSkipElement(root)) return;

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (S8Engine.shouldSkipElement(p)) return NodeFilter.FILTER_REJECT;
        if (S8Engine.isEditing(p)) return NodeFilter.FILTER_REJECT;
        const raw = node.nodeValue;
        if (!raw || !raw.trim()) return NodeFilter.FILTER_REJECT;
        if (originals.has(node) && node.nodeValue !== originals.get(node)) {
          // already our translation or user/site change
          if (!S8Engine.hasCyrillic(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    for (const node of texts) {
      const src = originals.get(node) || node.nodeValue;
      handleString(src, (next, hit) => applyTextNode(node, next, hit), {
        kind: "text",
        node,
        src,
      });
    }

    const scope = root.nodeType === 1 ? root : root.body || root;
    if (!scope || !scope.querySelectorAll) return;

    const els = [scope, ...scope.querySelectorAll("*")];
    for (const el of els) {
      if (el.nodeType !== 1) continue;
      if (S8Engine.shouldSkipElement(el)) continue;
      if (S8Engine.isEditing(el)) continue;

      for (const attr of ATTRS) {
        const val = el.getAttribute(attr);
        if (!val) continue;
        const bag = attrOriginals.get(el);
        const src = (bag && attr in bag) ? bag[attr] : val;
        handleString(src, (next, hit) => applyAttr(el, attr, next, hit), {
          kind: "attr",
          node: el,
          attr,
          src,
        });
      }

      if (el.tagName === "OPTION" && !S8Engine.isEditing(el.parentElement)) {
        const src = originals.get(el) || el.text;
        if (!originals.has(el)) originals.set(el, el.text);
        handleString(src, (next, hit) => {
          applying = true;
          el.text = next;
          applying = false;
          markEl(el, hit);
        }, { kind: "option", node: el, src });
      }

      if (el.shadowRoot) observeRoot(el.shadowRoot);
    }
  }

  async function flushMtSafe() {
    if (!pendingMt.size || !settings.enabled) return;
    const jobs = [...pendingMt.values()];
    pendingMt.clear();
    const packed = jobs.map((j) => S8Engine.protectGlossary(j.text, compiled));
    const texts = packed.map((p) => p.text);
    let translated;
    try {
      translated = await chrome.runtime.sendMessage({
        type: "S8_TRANSLATE",
        texts,
      });
    } catch (_) {
      translated = null;
    }
    if (!Array.isArray(translated)) return;

    for (let i = 0; i < jobs.length; i++) {
      let zh = translated[i];
      if (!zh) continue;
      zh = S8Engine.restoreGlossary(zh, packed[i].slots);
      zh = S8Engine.polishMt(zh);
      for (const item of jobs[i].items) {
        if (item.kind === "text" && item.node && item.node.parentNode) {
          applyTextNode(item.node, zh, "mt");
        } else if (item.kind === "attr" && item.node) {
          applyAttr(item.node, item.attr, zh, "mt");
        } else if (item.kind === "option" && item.node) {
          applying = true;
          item.node.text = zh;
          applying = false;
          markEl(item.node, "mt");
        }
      }
    }
  }

  function restoreAll(root) {
    const doc = root.ownerDocument || document;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) restoreTextNode(n);
    const scope = root.nodeType === 1 ? root : root.body || root;
    if (scope && scope.querySelectorAll) {
      for (const el of [scope, ...scope.querySelectorAll("*")]) {
        restoreAttrs(el);
        if (el.tagName === "OPTION" && originals.has(el)) {
          applying = true;
          el.text = originals.get(el);
          applying = false;
        }
        if (el.hasAttribute && el.hasAttribute(DONE)) {
          el.removeAttribute(DONE);
          el.removeAttribute(HIT);
        }
      }
    }
  }

  function schedule() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!settings.enabled) return;
      walk(document.body);
      flushMtSafe();
    }, 80);
  }

  function observeRoot(root) {
    if (!root || observedRoots.has(root)) return;
    observedRoots.add(root);
    const obs = new MutationObserver((muts) => {
      if (applying || !settings.enabled) return;
      let worth = false;
      for (const m of muts) {
        if (m.type === "characterData") {
          if (applying) continue;
          worth = true;
        } else if (m.type === "childList" && (m.addedNodes.length || m.removedNodes.length)) {
          worth = true;
        } else if (m.type === "attributes") {
          worth = true;
        }
      }
      if (worth) schedule();
    });
    obs.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
  }

  function bindUiEvents() {
    const kick = () => schedule();
    document.addEventListener("click", kick, true);
    document.addEventListener("change", kick, true);
    document.addEventListener("input", (e) => {
      if (S8Engine.isEditing(e.target)) return;
      kick();
    }, true);
    document.addEventListener("focusout", kick, true);
    window.addEventListener("scroll", () => schedule(), { passive: true });
  }

  async function start() {
    const stored = await chrome.storage.local.get({ enabled: true, highlight: false });
    settings = { enabled: stored.enabled !== false, highlight: !!stored.highlight };
    setHighlightClass();
    await loadData();
    if (settings.enabled) {
      walk(document.body);
      flushMtSafe();
    }
    observeRoot(document.documentElement);
    bindUiEvents();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.enabled) settings.enabled = changes.enabled.newValue !== false;
    if (changes.highlight) settings.highlight = !!changes.highlight.newValue;
    setHighlightClass();
    if (!settings.enabled) {
      restoreAll(document.body || document.documentElement);
    } else {
      walk(document.body);
      flushMtSafe();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
