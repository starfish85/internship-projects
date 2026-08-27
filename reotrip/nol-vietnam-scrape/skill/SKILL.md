---
name: nol-vietnam-scrape
description: >
  从 NOL（야놀자 / tour.yanolja.com）前端接口采集越南单门票与纯接送，并按中文表头的韩中对照 xlsx 交付。
  Use when the user asks to scrape NOL Vietnam tickets/transfers, 야놀자 투어티켓, 단입장권, 픽업/샌딩, 韩中对照 Excel, or runs /nol-vietnam-scrape.
---

# NOL 越南单门票 / 纯接送

面向中国读者：表头、工作表名、文件名用中文。韩文只出现在产品原文对照列。

本仓库已有实现时优先复用，不要重写：

- 采集：`scrape_nol_vietnam.py`
- 导出：`export_xlsx.py`（`python3 scrape_nol_vietnam.py --xlsx-only`）
- 韩中词表：`ko_zh.py`

接口细节见 [references/api-entry.md](references/api-entry.md)。xlsx 字段与样式见 [references/excel-style.md](references/excel-style.md)。

## 流程

1. 用列表接口按越南城市 × 品类翻页（门票品类 + 交通品类），关键词只作补漏。
2. 用 geotag `베트남` 过滤后，按标题规则分成 **单门票** / **纯接送**，丢弃一日游、SPA、快速通关等。
3. 拉详情与套餐价：详情带 `withItem=true`；选项价走 v2 items，必须带 `date`。
4. 导出四张表，样式与参考文件 `vietnam_tickets_transfers.xlsx` 对齐，原文列用「（韩）」不用 RU/KO 英文字母。
5. 文件名：`NOL_越南单门票纯接送.xlsx`。

## 分类（标题为主）

- **单门票**：含 `입장권`/`티켓`，且不含跟车游览、导游团、SPA、快速通关、巴士票。
- **纯接送**：含 `픽업`/`샌딩`/`단독차량`/`셔틀` 等，且不含一日游、浮潜、课程、eSIM。点对点机场/市区/城际包车或班车保留。

## 注意

- `tour.yanolja.com` 可能被 SSRF/内网解析拦住，用本机 `curl`/`urllib`，不要依赖网页抓取工具。
- `cityIds` 不要逗号拼接多个城市，按城请求。
- 中国读者看的单元格：分类、成团类型（中）、出行方式（中）、计价类型（中）、是/否、货币 `KRW`。
- NOL 没有已下单人数、热度、组织者累计订单，对应列留空，在「字段说明」写明。
