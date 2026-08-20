# Tripster 俄译中

面向运营/采购看 [experience.tripster.ru](https://experience.tripster.ru/) 的 Chrome/Edge **Manifest V3** 扩展。词典优先，不是通用网页翻译器。

**这不是 Sputnik8 插件。** Sputnik8 仍在仓库根目录的 `extension/`；本插件只在 `tripster/extension/`。两套可以同时装，互不影响。

- 源语言：俄语
- 目标语言：简体中文
- 范围：顶栏、搜索、城市列表、筛选/排序下拉、产品卡、详情（含点开才出现的区块）、评价、登录、预订表单、动态插入节点

## 加载

1. 打开 `chrome://extensions`
2. 打开右上角「开发者模式」
3. 「加载已解压的扩展程序」，选 **`tripster/extension/`**（不要选根目录那个 `extension/`）
4. 打开 https://experience.tripster.ru/ 或任意城市页，例如 https://experience.tripster.ru/experience/Moscow/
5. 点工具栏图标：可关翻译，或打开「词典命中高亮」（绿=词典/规则，橙=正文机翻）

改完 `tripster/extension/data/*.json` 后，在扩展页点刷新，再刷新网站。

## 怎么加词

编辑 `tripster/extension/data/dictionary.json` 的 `entries`，或改 `tripster/tools/build_data.py` 再运行：

```bash
python3 tripster/tools/build_data.py
```

```json
{
  "src": "Выбрать дату",
  "zh": "选择日期",
  "context": "product.section",
  "match": "exact",
  "note": "预订主按钮"
}
```

| 字段 | 说明 |
| --- | --- |
| `src` | 页面上的原文，空白会折叠后匹配 |
| `zh` | 给运营看的中文 |
| `context` | 语境，避免一词多义（如 отзыв=评价，不是退款） |
| `match` | `exact` 整段相等才换；`phrase` 才做句中替换 |
| `note` | 给人看的备忘 |

价格、时长、人数、相对时间用 `phrases.json` 的正则。  
地名、景点、否定词（不含 / 不可退 / 需另付）放 `glossary.json`，正文机翻前会锁住这些词。

## 翻译策略

1. 整段命中词典 → 直接换成产品站口吻
2. 命中正则（`от 1 700 ₽`、`3 часа назад`、`246 отзывов`）→ 只译周围的词，数字货币保留
3. 剩下的行程介绍 / 评价走机翻，先套术语表，再压一遍机翻腔（「作者游览」「个体游览」「进行预订」等）
4. `MutationObserver` + 点击/滚动/路由后补翻；已打开的 shadow DOM 也会跟
5. Vue 改写同一文本节点时，若又出现俄语会重新翻译

## 和 Sputnik8 的区别（给下次下指令用）

| | Sputnik8 | Tripster |
| --- | --- | --- |
| 目录 | 仓库根目录 `extension/` | `tripster/extension/` |
| 扩展名 | Sputnik8 俄译中 | Tripster 俄译中 |
| 站点 | sputnik8.com | experience.tripster.ru |
| 消息类型 | `S8_TRANSLATE` | `TS_TRANSLATE` |
| 引擎 | `S8Engine` | `TSEngine` |
| 高亮 class | `s8-i18n-*` | `ts-i18n-*` |

下次要改 **Tripster**，请写明「Tripster / tripster 目录」，不要只说「那个俄语插件」。指令模板见 [INSTRUCTIONS.md](INSTRUCTIONS.md)。

## 已知未覆盖

- 关闭的 shadow DOM、第三方客服/地图 iframe
- 向导姓名、门牌地址、纯数字日历格子（有意不译）
- 行程长介绍 / 评价正文走机翻，公司网不通时会暂时留俄文，固定栏不受影响
- 向导后台、合作方后台不是采购主路径，只覆盖了露出来的公共文案

抽检记录见 [QA.md](QA.md)。
