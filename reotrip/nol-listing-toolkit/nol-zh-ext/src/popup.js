async function load() {
  const { settings = {} } = await chrome.storage.local.get("settings");
  const enabled = settings.enabled !== false;
  const online = settings.online !== false;
  document.getElementById("enabled").checked = enabled;
  document.getElementById("online").checked = online;

  const el = document.getElementById("status");
  try {
    const stats = await chrome.runtime.sendMessage({ type: "getStats" });
    el.textContent = `在线缓存词条：${stats?.onlineCacheSize ?? 0}`;
  } catch (_) {
    el.textContent = "后台未就绪，可稍后重开弹窗";
  }
}

async function saveSettings() {
  const settings = {
    enabled: document.getElementById("enabled").checked,
    online: document.getElementById("online").checked,
  };
  await chrome.storage.local.set({ settings });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "settingsChanged", settings }).catch(() => {});
  }
}

document.getElementById("enabled").addEventListener("change", saveSettings);
document.getElementById("online").addEventListener("change", saveSettings);

document.getElementById("retranslate").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "forceRetranslate" }).catch(() => {});
  }
  document.getElementById("status").textContent = "已请求重新翻译当前页";
});

document.getElementById("clearCache").addEventListener("click", async () => {
  await chrome.storage.local.set({ onlineCache: {} });
  document.getElementById("status").textContent = "在线缓存已清空";
});

load();
