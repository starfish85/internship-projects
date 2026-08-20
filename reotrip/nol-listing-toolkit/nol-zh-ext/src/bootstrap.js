/**
 * document_start: inject MAIN-world hook before app JS loads meta/options.
 */
(function () {
  try {
    if (document.getElementById("nol-zh-inject")) return;
    const el = document.createElement("script");
    el.id = "nol-zh-inject";
    el.src = chrome.runtime.getURL("src/inject.js");
    el.async = false;
    const parent = document.documentElement || document.head || document.body;
    if (parent) parent.appendChild(el);
  } catch (_) {}
})();
