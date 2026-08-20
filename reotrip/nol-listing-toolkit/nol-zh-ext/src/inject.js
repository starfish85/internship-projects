/**
 * MAIN world: 谨慎翻译 API JSON 中的展示字段。
 * 绝不改 id/code/url/token 等关键字段，避免产品页接口报错。
 */
(function () {
  if (window.__NOL_ZH_INJECT__) return;
  window.__NOL_ZH_INJECT__ = true;

  var HANGUL = /[\uAC00-\uD7A3]/
  // 仅这些「展示名」字段可译
  var LABEL_KEYS = {
    name: 1,
    title: 1,
    label: 1,
    displayName: 1,
    display_name: 1,
    placeholder: 1,
    buttonText: 1,
    button_text: 1,
    optionName: 1,
    option_name: 1,
    categoryName: 1,
    category_name: 1,
    statusName: 1,
    status_name: 1,
    typeName: 1,
    type_name: 1
  };

  // 这些字段名含 name 也不要碰
  var BLOCK_KEY =
    /^(id|uuid|code|key|token|url|href|src|path|slug|email|phone|password|hash|signature|secret|api|endpoint|statusCode|errorCode|createdAt|updatedAt|deletedAt|timestamp|date|time|price|amount|currency|lat|lng|longitude|latitude|sku|partnerId|productId|optionId|userId|orderId|value|raw|html|markdown|body|content|description|intro|introduction|detail|details|text|message|msg)$/i;

  var MAP = {
    "판매중": "销售中",
    "판매가능": "可销售",
    "판매불가": "不可销售",
    "미게시": "未发布",
    "게시": "发布",
    "검토중": "审核中",
    "반려": "驳回",
    "승인": "批准",
    "임시저장": "临时保存",
    "승인요청": "提交审核",
    "옵션": "选项",
    "상품": "商品",
    "가격": "价格",
    "예약": "预订",
    "취소": "取消",
    "확인": "确认",
    "등록": "注册",
    "수정": "修改",
    "삭제": "删除",
    "추가": "添加",
    "재고": "库存",
    "대표": "代表",
    "대표가": "代表价",
    "필수": "必填",
    "선택": "选择",
    "관광지": "旅游地",
    "숙소": "住宿",
    "기사제공차량": "司机提供车辆",
    "교통": "交通",
    "운송": "运输",
    "한국어": "韩语",
    "영어": "英语",
    "중국어": "中文",
    "자동": "自动",
    "수동": "手动",
    "예": "是",
    "아니요": "否",
    "개인": "私人",
    "단체": "团体",
    "성인": "成人",
    "청소년": "青少年",
    "소아": "儿童"
  };

  function tr(s) {
    if (typeof s !== "string" || !s) return s;
    if (!HANGUL.test(s)) return s;
    // 绝不翻译太长的内容字段（介绍正文等）
    if (s.length > 40) return s;
    var k = s.replace(/\s+/g, " ").trim();
    if (MAP[k]) return MAP[k];
    if (MAP[s]) return MAP[s];
    return s;
  }

  function walk(obj, depth) {
    if (obj == null || depth > 8) return;
    var i, keys, key, val;
    if (Array.isArray(obj)) {
      for (i = 0; i < obj.length; i++) {
        val = obj[i];
        if (val && typeof val === "object") walk(val, depth + 1);
        // 数组里的纯字符串不盲译
      }
      return;
    }
    if (typeof obj !== "object") return;
    keys = Object.keys(obj);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      val = obj[key];
      if (BLOCK_KEY.test(key)) continue;
      if (typeof val === "string") {
        if (LABEL_KEYS[key]) obj[key] = tr(val);
      } else if (val && typeof val === "object") {
        walk(val, depth + 1);
      }
    }
  }

  function shouldHook(url) {
    if (!url) return false;
    var u = String(url);
    // 不拦截上传/保存/提交类接口，避免写路径被改坏
    if (/\/(save|update|create|submit|upload|delete|publish|approve)/i.test(u)) return false;
    if (u.indexOf("triple.partners") === -1 && u.indexOf("/api/") === -1) return false;
    // 仅轻量 meta/code 类
    return (
      u.indexOf("/meta") !== -1 ||
      u.indexOf("/code") !== -1 ||
      u.indexOf("/enum") !== -1 ||
      u.indexOf("/category") !== -1 ||
      u.indexOf("/common/codes") !== -1 ||
      u.indexOf("/i18n") !== -1
    );
  }

  var _fetch = window.fetch;
  if (_fetch) {
    window.fetch = function (input) {
      var url = typeof input === "string" ? input : input && input.url;
      return _fetch.apply(this, arguments).then(function (res) {
        if (!shouldHook(url) || !res || !res.ok) return res;
        try {
          var ct = (res.headers && res.headers.get("content-type")) || "";
          if (ct.indexOf("json") === -1) return res;
          return res
            .clone()
            .json()
            .then(function (data) {
              try {
                walk(data, 0);
              } catch (_) {}
              return new Response(JSON.stringify(data), {
                status: res.status,
                statusText: res.statusText,
                headers: res.headers
              });
            })
            .catch(function () {
              return res;
            });
        } catch (e) {
          return res;
        }
      });
    };
  }
})();
