# Sputnik8 俄译中

本目录是 **Sputnik8**。Tripster 是另一套扩展，在 [`tripster/`](tripster/README.md)，加载 `tripster/extension/`，不要和这里的 `extension/` 搞混。

面向运营/采购看 [sputnik8.com](https://www.sputnik8.com) 俄语站的 Chrome/Edge **Manifest V3** 扩展。词典优先，不是通用网页翻译器。

- 源语言：俄语（也覆盖你从 Bing 点进来的 `/en` 固定栏）
- 目标语言：简体中文
- 范围：导航、筛选、卡片、详情、下拉、预订表单、评价区、动态插入节点

## 加载

1. 打开 `chrome://extensions`
2. 打开右上角「开发者模式」
3. 「加载已解压的扩展程序」，选本仓库里的 `extension/` 目录
4. 打开 https://www.sputnik8.com/?locale=ru 或任意 `/ru/...` 页面
5. 点工具栏图标：可关翻译，或打开「词典命中高亮」（绿=词典/规则，橙=正文机翻）

改完 `data/*.json` 后，在扩展页点刷新，再刷新网站。

## 怎么加词

编辑 `extension/data/dictionary.json` 的 `entries`：

```json
{
  "src": "Забронировать экскурсию",
  "zh": "预订行程",
  "context": "product.section",
  "match": "exact",
  "note": "预订按钮，不要译成「实现预订」"
}
```

| 字段 | 说明 |
| --- | --- |
| `src` | 页面上的原文，空白会折叠后匹配 |
| `zh` | 给运营看的中文 |
| `context` | 语境，避免一词多义（如 отзыв=评价，不是退款） |
| `match` | `exact` 整段相等才换；`phrase` 才做句中替换 |
| `note` | 给人看的备忘 |

价格、时长、人数、日期用 `extension/data/phrases.json` 的正则。  
地名、景点、否定词（不含 / 不可退 / 需另付）放 `extension/data/glossary.json`，正文机翻前会锁住这些词。

批量加词也可以改 `tools/build_data.py` 再运行：

```bash
python3 tools/build_data.py
```

## 翻译策略

1. 整段命中词典 → 直接换成产品站口吻
2. 命中正则（`от 1 700 ₽`、`до 4 ч.`、`7263 отзыва`）→ 只译周围的词，数字货币保留
3. 剩下的行程介绍 / 评价走机翻，先套术语表，再压一遍机翻腔（「进行选择」「被包含」等）
4. `MutationObserver` + 点击/滚动后补翻；已译节点打 `data-i18n-done`，输入框正在输入时不改 `value`

## 已知未覆盖

- Intercom 客服 iframe、Yandex 地图 iframe 内部文案（第三方，不注入）
- 关闭的 shadow DOM
- QRATOR 人机验证页
- 向导姓名、门牌地址、纯数字日历格子（有意不译）
- 站点有两套壳：老 Rails 详情页已按字段做准；偶发新首页区块若出现新按钮，把原文补进词典即可
- 正文机翻依赖 `translate.googleapis.com`，公司网不通时标题/长介绍会暂时留俄文，固定栏不受影响

抽检记录见 [QA.md](QA.md)。
