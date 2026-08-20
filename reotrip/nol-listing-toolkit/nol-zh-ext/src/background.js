/**
 * Background: online KO→zh-CN fallback + runtime cache.
 * Primary path is offline dictionary in content script.
 */

const memCache = new Map();

/** NOL 业务短词纠偏（覆盖机翻生硬译名）— keys must be quoted for SW parse safety */
const FIX = {
  "저장": "保存",
  "임시저장": "临时保存",
  "임시 저장": "临时保存",
  "승인요청": "提交审核",
  "승인 요청": "提交审核",
  "판매중": "销售中",
  "판매 중": "销售中",
  "판매가능": "可销售",
  "옵션": "选项",
  "옵션 수정하기": "修改选项",
  "판매 캘린더 관리": "销售日历管理",
  "상품": "商品",
  "가격": "价格",
  "가격 타입": "价格类型",
  "기타 가격 타입": "其他价格类型",
  "예약": "预订",
  "취소": "取消",
  "확인": "确认",
  "등록": "注册",
  "수정": "修改",
  "삭제": "删除",
  "추가": "添加",
  "대표": "代表",
  "대표가": "代表价",
  "캘린더": "日历",
  "재고": "库存",
  "재고 미설정": "不设置库存",
  "재고 설정": "设置库存",
  "인원": "人数",
  "차량": "车辆",
  "편도": "单程",
  "왕복": "往返",
  "호텔": "酒店",
  "기사": "司机",
  "픽업": "接驳",
  "바우처": "凭证",
  "수수료": "手续费",
  "환불": "退款",
  "예약정보로 확인": "用预约信息确认",
  "자동취소": "自动取消",
  "수동취소": "手动取消",
  "아니요": "否",
  "예": "是",
};

async function translateOnline(text) {
  if (!text || !String(text).trim()) return text;
  if (memCache.has(text)) return memCache.get(text);

  const { onlineCache = {} } = await chrome.storage.local.get("onlineCache");
  if (onlineCache[text]) {
    memCache.set(text, onlineCache[text]);
    return onlineCache[text];
  }

  if (FIX[text]) {
    const fixed = FIX[text];
    memCache.set(text, fixed);
    onlineCache[text] = fixed;
    await chrome.storage.local.set({ onlineCache });
    return fixed;
  }

  const q = encodeURIComponent(text);
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=zh-CN&dt=t&q=" + q;
  const res = await fetch(url);
  if (!res.ok) throw new Error("translate http " + res.status);
  const data = await res.json();
  let zh = (data[0] || []).map(function (p) { return (p && p[0]) || ""; }).join("");
  if (!zh) throw new Error("empty translation");

  if (FIX[text]) zh = FIX[text];
  if (text === "저장" && (zh === "库存" || zh === "储存")) zh = "保存";
  if (text === "승인요청" && zh.indexOf("承认") !== -1) zh = "提交审核";
  if (text === "판매중" && zh.indexOf("销售中") === -1) zh = "销售中";
  if (text === "옵션" && zh === "选择") zh = "选项";
  if (text === "대표가" && zh.indexOf("代表") === -1) zh = "代表价";
  if (text === "재고" && zh !== "库存") zh = "库存";
  if (text === "바우처") {
    if (zh.indexOf("券") === -1 && zh.indexOf("凭证") === -1 && zh.indexOf("代金") === -1) {
      zh = "凭证";
    }
  }

  memCache.set(text, zh);
  onlineCache[text] = zh;
  const keys = Object.keys(onlineCache);
  if (keys.length > 3000) {
    for (let i = 0; i < keys.length - 2500; i++) delete onlineCache[keys[i]];
  }
  await chrome.storage.local.set({ onlineCache });
  return zh;
}

chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
  if (msg && msg.type === "translateBatch") {
    const texts = Array.isArray(msg.texts) ? msg.texts : [];
    Promise.all(
      texts.map(function (t) {
        return translateOnline(t)
          .then(function (zh) {
            return { text: t, zh: zh, ok: true };
          })
          .catch(function (e) {
            return { text: t, zh: null, ok: false, error: String(e) };
          });
      })
    ).then(function (results) {
      sendResponse({ ok: true, results: results });
    });
    return true;
  }

  if (msg && msg.type === "translateOne") {
    translateOnline(msg.text)
      .then(function (zh) {
        sendResponse({ ok: true, zh: zh });
      })
      .catch(function (e) {
        sendResponse({ ok: false, error: String(e) });
      });
    return true;
  }

  if (msg && msg.type === "getStats") {
    chrome.storage.local.get(["onlineCache", "stats"]).then(function (data) {
      sendResponse({
        ok: true,
        onlineCacheSize: Object.keys(data.onlineCache || {}).length,
        stats: data.stats || {},
      });
    });
    return true;
  }
});
