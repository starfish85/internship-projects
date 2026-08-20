# 页面路标

站点固定用 **Tripadvisor UK**：`https://www.tripadvisor.co.uk`

Viator 后台：`https://supplier.viator.com/products/`

## Viator 已上线产品

1. 打开产品列表，筛 **当前已上线**（Active / Live / Published / 已上线，以页面实际状态名为准）。
2. 列表约 **130** 条。翻页直到收齐，记下产品名称、code、列表里能直接看到的评分和链接。
3. 企业位置在产品详情的 **Tripadvisor 企业详情**：
   - 企业详情名称（例：`Reotrip Abu Dhabi`）
   - 企业详情位置（例：`Abu Dhabi, Abu Dhabi, Emirate of Abu Dhabi`）
4. 列表里若没有企业详情，再点进详情。已有则不要重复打开。

产品 code 形态：`数字 + P + 数字`，例 `5514894P483`。正则：`\b\d{5,8}P\d{2,6}\b`

## Tripadvisor 透传判定

对每个已上线产品：

1. 先用 **产品 code** 在 UK 站搜索。
2. 无结果再用 **产品名称** 搜一次。
3. 打开候选产品页，在页面全文（常见于 Accessibility：`reference the product code: 5514894P483`）查找 **与后台完全一致** 的 code。
4. **一致 → 已透传**；找不到该 code → **未透传**。不要用标题模糊相似判定已透传。
5. 已透传时记录：产品页 URL、评分、评价数、评价类型（如 `operator reviews`）、页面上读到的 code。

评分在标题附近，例如 `3.9` 和 `18 operator reviews`。

## Tripadvisor 企业位置（完整列表，不只 Reotrip 前缀）

**不要**按名称是否以 `Reotrip` 开头过滤。酒店、餐厅、Things to do 等类别只要确认是本供应商相关企业位置，都收入。

来源取并集，按 **页面 URL** 去重：

1. Viator 已上线产品里出现过的全部「企业详情名称」。
2. UK 站搜索 `reotrip`：`https://www.tripadvisor.co.uk/Search?q=reotrip&searchNearby=false`，翻完结果。
3. 若某企业详情名称还没有 URL，再用该名称搜索补齐。

每个企业位置页必须采集：

- 名称、网页链接、评分、评价数、地理信息、类别
- **展示产品数量**（以实际列出的产品为准，翻完分页）
- **每一条展示产品**：名称、链接、评分、评价数；能读到 code 就记

位置页常见结构：标题 + 评分（例 `3.9 · 8 reviews`）+ About + `Tours and Tickets by {名称}` 产品列表。
