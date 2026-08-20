const enabledEl = document.getElementById("enabled");
const highlightEl = document.getElementById("highlight");

chrome.storage.local.get({ enabled: true, highlight: false }, (s) => {
  enabledEl.checked = s.enabled !== false;
  highlightEl.checked = !!s.highlight;
});

enabledEl.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabledEl.checked });
});
highlightEl.addEventListener("change", () => {
  chrome.storage.local.set({ highlight: highlightEl.checked });
});
