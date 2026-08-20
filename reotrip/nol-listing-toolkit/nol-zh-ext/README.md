# NOL 合作后台 · 韩→简中 浏览器插件

将 `https://tour.triple.partners/*` 合作伙伴后台中的界面文案，**按业务习惯改写成自然简体中文**，用来覆盖浏览器自带/机翻的生硬译文。

| 项 | 值 |
| --- | --- |
| 名称 | NOL 合作后台 韩译中 |
| 版本 | 见 `manifest.json` 的 `version`（当前交付 **1.3.1**） |
| 类型 | Chrome / Edge Manifest V3 扩展（加载已解压目录） |
| 作用域 | 仅 `*.triple.partners` 合作后台展示层 |

## 功能

- **韩文 → 业务简体**：离线词典 `src/dictionary_ko_zh.json`（上架流程高频 UI）
- **生硬中文覆盖**：`src/remap_zh.json`（纠正繁中机翻 / 错译，如「期权→选项」「节省→保存」「批准请求→提交审核」）
- **在线兜底**：仅补漏掉的**韩文**（`ko → zh-CN`），结果再过业务纠偏；**不对中文再走机翻**
- **动态页面**：SPA / 弹窗 / 下拉后自动重扫
- **API 层**：`inject.js` 谨慎翻译 JSON 中的 name/title/label 等展示字段
- **保护填写**：不翻译 `input` / `textarea` / `contenteditable` 内用户内容；不改提交到服务器的 value/code

## 安装（Chrome / Edge）

1. 打开 `chrome://extensions`（Edge：`edge://extensions`）
2. 打开右上角 **开发者模式**
3. **加载已解压的扩展程序** → 选择本目录 **`nol-zh-ext`**
4. 打开并登录合作后台，例如：  
   `https://tour.triple.partners/product-management/registration?lang=zh-tw`
5. **强制刷新**页面（Mac：`⌘+Shift+R`）
6. 右下角短暂出现紫色 **「中」** 表示已启用

## 日常使用

点击浏览器工具栏扩展图标可：

- 启用 / 关闭翻译
- 启用 / 关闭在线兜底
- **重新翻译本页**
- **清空在线缓存**

更新代码后：扩展管理页点 **重新加载** → 业务页强制刷新。

## 目录结构

```text
nol-zh-ext/
├── manifest.json              # MV3 清单
├── background.js              # Service Worker（在线翻译 + 缓存）
├── icons/                     # 16 / 48 / 128
├── README.md                  # 本说明
└── src/
    ├── bootstrap.js           # document_start：注入 inject
    ├── inject.js              # MAIN world：fetch/XHR 展示字段
    ├── content.js             # DOM 扫描 + MutationObserver + 词典
    ├── dictionary_ko_zh.json  # 离线 韩→简中
    ├── remap_zh.json          # 生硬中文 → 自然简体
    ├── popup.html / popup.js  # 开关 UI
    └── background.js          # 与根目录逻辑一致的副本（参考用）
```

> 实际加载以 `manifest.json` 为准：`service_worker` 指向根目录 `background.js`。

## 补词典 / 覆盖生硬译名

| 情况 | 改哪个文件 |
| --- | --- |
| 页面仍是**韩文** UI | `src/dictionary_ko_zh.json`：`"한국어": "简体"` |
| 页面是**生硬繁中/错译中文** | `src/remap_zh.json`：`"生硬原文": "自然简体"` |

改完后：扩展页 **重新加载** → 业务页 `⌘+Shift+R`。

建议：对本站关闭浏览器自带翻译（或选「从不翻译」），只保留本扩展，避免双重翻译打架。

## 注意

- 仅本机展示层替换，**提交到服务器的 value/code 不变**
- **输入框内的韩文一律不译**（避免干扰上架填写）
- **商品名 / 选项名 / 路线名一律保留韩文**（含 `↔` 接送标题）；若曾被误译成中文，会按 `remap_zh.json` 尽量改回韩文
- 商品介绍等用户填写的长韩文正文默认不译
- **不要**用本插件自动点「批准请求」；上架操作仍由人工完成

## 与本仓库其它内容的关系

本插件与 Grok Skills **独立安装、独立使用**：

| 路径 | 用途 |
| --- | --- |
| `skills/nol-domestic-ticket-listing-helper/` | 国内门票上架规则 |
| `skills/nol-product-listing-helper/` | 接送产品上架规则 |
| `nol-zh-ext/`（本目录） | 后台 UI 韩→简中显示 |

推荐组合：浏览器装本插件看懂后台 + Grok 加载对应 skill 指导填写。
