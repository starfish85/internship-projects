# NOL TNA 前端入口

站点：韩国 NOL 海外投어·티켓，Next.js。产品页 `https://tour.yanolja.com/tna/products/{id}`。

网关（本机 curl，勿用会被 SSRF 拦的 fetch）：

```
https://tour.yanolja.com/tna/api/tour-api
```

请求头：

```
User-Agent: Mozilla/5.0 ... Chrome/120
Accept: application/json
Accept-Language: ko-KR,ko;q=0.9
Referer: https://tour.yanolja.com/tna/products?keyword=%EB%B2%A0%ED%8A%B8%EB%82%A8
Origin: https://tour.yanolja.com
```

间隔 ≥ 180ms。`web_fetch` 常因解析到内网 IP 失败。

## 列表

`GET /tna-product/externals/products`

| 参数 | 说明 |
|---|---|
| `cityIds` | 单个城市 UUID，不要逗号拼接 |
| `categoryIds` | 品类 UUID |
| `keyword` | 补漏用 |
| `page` | 从 1 |
| `size` | 50，最大约 100 |

响应：`body[]`，`page.{currentPage,size,totalPages,totalElements}`，`filters.countries[].cities[]`。

`categoryIds` 不是严格过滤，返回里会有交叉品类，必须再按标题分类。

### 品类

| 用途 | UUID | 韩文 |
|---|---|---|
| 门票 | `6a831ffc-5ddf-4d61-870b-269be92fc21b` | 티켓∙입장권 |
| 交通 | `257cf018-d16d-436f-adef-797fc9e4911f` | 교통편의/이동 |
| 接送子类 | `69029058-442b-4635-b854-d81176c5c27a` | 픽업∙샌딩 |

国家 geotag ISO1 越南：`6096fa84-becb-40ae-b8f2-079288204f11`。

### 城市（TRIPLE_CITY）

先 `keyword=베트남` 读 `filters.countries` 补全。已知：

| 城市 | UUID |
|---|---|
| 호치민 | `f486f75f-58cc-419c-b9de-16eafe94bcf6` |
| 다낭 | `80397537-a64f-4a1f-a55f-411a67f9f4ef` |
| 하노이 | `ad4c72b3-894f-4fcc-bbff-13993e5a111a` |
| 호이안 | `5db37216-00a2-45de-b0e4-ef338c31e170` |
| 나트랑 | `3722126c-5b89-49c1-806f-414823197d3c` |
| 푸꾸옥 | `e985cef4-7663-40b8-9d44-1b640e0d32d8` |
| 후에 | `0c418fdb-8037-4008-a4ef-255730735958` |
| 달랏 | `871dc087-825c-41a3-882d-cb312407ee07` |
| 닌빈 | `c74c86ed-ea8e-4afe-a8db-e5927459fc02` |
| 무이네 | `010c9841-e548-4a67-9c27-d7f67d89e90b` |
| 하이퐁 | `8c3a2eca-d72f-421a-b7ed-8288c95f2499` |
| 판티엣 | `03204435-5d8c-474f-96e1-1a5aa2a4ca6f` |
| 사파 | `be4f29ec-3b9a-4f33-beb0-d54beffced22` |

采集：每个城市 ×（门票品类 + 交通品类）翻页，再关键词补漏（`베트남 입장권`、`다낭 공항픽업` 等）。

## 详情

```
GET /tna-product/externals/products/{id}
  ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  &withReview=true&withItem=true&withContentAsset=true&withSupplierNotice=true
```

`startDate` 用今天+2 天。返回 `body`：名称、品类、价格、评论、销售商、地点、简介、`items[]`。

无日期的 `GET .../tna-product/products/{id}` 也能拿基础信息，选项价不完整。

## 套餐价

```
GET /tna-product/externals/v2/products/{id}/items/{itemId}
  ?startDate=...&endDate=...&date={startDate}
```

缺 `date` 会 400（`dateOfUse`）。选项在 `options[].prices[0].sales`（KRW）。

列表价字段：`price.display` 原价，`price.sales` 售价，`price.appliedCoupon` 券后价。交付用 `sales`。

## 列表项有用字段

`id, name, geotags, thumbnail, categories, types, price, review, guideLanguages, hasInstantConfirmation, hasInstantVoucher, cancellationTypes, badges, usableDates`
