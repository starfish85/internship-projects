# API 探测记录（2026-07-27）

## 会话与鉴权

| 项 | 结论 |
|----|------|
| 登录可用 | 是（用户 `BHU0000161` / BING HU） |
| 判定字段 | `localStorage.darwinToken`（长度约 614–616） |
| 鉴权头 | `Authorization: Bearer <darwinToken>` |
| 注意 | `darwinToken` 在 localStorage 中可能带引号，使用前需 `replace(/^"+|"+$/g,'')` |
| 页面 fetch | 被 Tealeaf SDK 劫持易失败；**优先用 XHR** 或拦截浏览器原生请求 |
| 权限 | `AVAILHOT` 等 hotel 相关 grants 存在；`secondaryLocale=en` |

### Token 刷新 / 过期（2026-07-30 核实，必须重视）

| 项 | 实测 |
|----|------|
| 形态 | **JWT**（`iss=BEDSONLINECN`，`sub=BHU00001`，含 `sessionId`） |
| 有效期 | **iat→exp ≈ 8 小时**（样例：iat 23:54 → exp 07:54） |
| SPA 配置 | `sessionSettings.expirationHours: 4`（legacySession，与 JWT 8h 并存，保守按更短处理） |
| 存储 | `localStorage.darwinToken`；SPA 可能在页面存活时轮换 |
| 刷新方式 | 保持调试 Chrome 在 `main`；reload main 让 SPA 续签；401 时 `ensureFreshToken` / 重登 |
| 爬虫约束 | **禁止长时间缓存 token**；每请求从 localStorage 再读；临近过期（&lt;15–20min）主动 refresh；401/403 重试一次 |

实现：`lib/api-client.mjs` → `parseDarwinTokenMeta` / `ensureFreshToken`；phase2/phase3 已接 401 与到期前刷新。

## 已验证可用

### 0) 目的地列表（可查全中国）

与 UI「目的地? → 目的地列表 → 亚洲 → 中国 → 城市」对应：

```
GET /client-content-api/1.0/continents?locale=zh
GET /client-content-api/1.0/continents/ASI/countries?locale=zh
GET /client-content-api/1.0/countries/CN/destinations?locale=zh   # ≈403 个
GET /client-content-api/1.0/countries/CN/destinations?locale=en
```

已落盘：`/Volumes/CodexArchive/hbx-hotel-crawl/state/cn-destinations.json`（及 `.csv`）

### 1) 全文检索 FTS

```
GET https://webapi.gta-travel.cn/client-content-api/1.0/fts
  ?query=<关键词>
  &size=100
  &type=HOTEL|DESTINATION|ZONE|GROUPZONE
  &locale=zh|en
```

试点结果：

- `query=北京&type=HOTEL&locale=zh` → **200，100 家酒店**
- `query=Beijing&type=HOTEL&locale=en` → **200，100 家**
- `query=中国&type=DESTINATION&locale=zh` → **200，100 个目的地**（如 HGH/CKG/NKG…）

酒店条目字段示例：

- `id`（hotelCode 主键）
- `hotelDescription`（中文名或英文名，取决于 locale）
- `countryId` / `countryDescription`
- `destinationId` / `destinationDescription`
- `zoneId` / `zoneCode` / `zoneDescription`
- `weight`

**中英匹配**：用 `id`（hotelCode）合并，不要用名称。

### 2) 酒店搜索 UI 选择器

| 元素 | data-qa / 特征 |
|------|----------------|
| 产品类型-酒店 | `button[data-qa="HOTEL"]` |
| 住宿搜索区 | `CLIENTB2B-FRONT-SEARCH-ACCOMMODATION` / `HOTEL_radioButton_search` |
| 目的地输入 | `input[data-qa="destinationsControl"]` placeholder `目的地?` |
| 入住/离店 | `input[placeholder="yyyy/mm/dd"]` |
| 搜索按钮 | `button[data-qa="btn_search_stay_themepark"]` |

UI 注意：Angular CDK overlay 打开时会挡住搜索按钮；选完目的地后需 `Escape` 或正确点选列表项。

## 已命中：酒店详情（2026-07-28）

```http
POST /client-content-api/1.0/hotels/detail?locale=zh|en
Authorization: Bearer <darwinToken>
{ "hotelCodes": ["100399", "..."] }
```

- 必须 POST + body 键 `hotelCodes`
- 返回：code/name/category/location/chain/contact/amenities/segments/urlImage 等
- 主图 CDN：`https://photos.hotelbeds.com/giata/{urlImage去query}`
- 批量脚本：`npm run pipeline:enrich -- --dest=PEK,PVG,CN1,SZX`

## SPA 挖出的酒店可售 path（2026-07-29，webpack chunk 静态分析）

**注意**：旧探针猜的 `/client-btb-avail-api/.../hotels/availability` 是错的——`client-btb-avail-api` 实际服务活动/租车/接送，不是酒店。

| Path | SPA 用途 |
|------|----------|
| `POST /client-hotel-avail-api/3.0/hotels` | 主搜索/可售（`hotelAvailabilityPath`） |
| `POST /client-hotel-avail-api/1.0/hotels/calendar` | **日历图**（`getHotelAvailabilityCalendar`） |
| `POST /client-hotel-avail-api/4.0/hotels` | v4 搜索 / alternatives |
| `POST /client-hotel-avail-api/2.0/hotels` | filtered path |
| `POST /client-hotel-avail-api/1.0/hotels` | filters / cancellation-policies 基路径 |
| `POST /client-hotel-avail-api/2.0/hotels/list` | 酒店目录 catalog list |
| `POST /client-hotel-avail-api/1.0/hotels/suggested` | 推荐酒店 |

### Live 验证（2026-07-30）

**A. 多日日历价（推荐批量用这个）**

```http
POST /client-hotel-avail-api/1.0/hotels/calendar?locale=zh
{
  "hotelCode": "100399",
  "shiftDays": 90,
  "stay": { "checkIn": "YYYY-MM-DD", "checkOut": "YYYY-MM-DD" },
  "occupancies": [{ "rooms": 1, "adults": 2, "children": 0 }]
}
→ 200 { hotelCode, priceCalendar[{checkIn,checkOut,price,roomDescription}], minPrice, maxPrice, currency }
```

shiftDays=90 → 约 **181** 天有价序列。必须带 `occupancies`，否则易 500。

**B. 单日可售（含房型明细）**

```http
POST /client-hotel-avail-api/3.0/hotels?locale=zh
{ "hotelCodes": ["..."], "stay": {...}, "occupancies": [...], "pageSize": 20 }
// 或 destinationCode: "PEK"
```

**C. 目录**

```http
POST /client-hotel-avail-api/2.0/hotels/list?locale=zh
{ "destinationCode": "PEK" } → totalHotels=3001
```

产物：

- `00-state/probes/webapi-research-*/webapi-path-catalog.json`（SPA 全 path）
- `00-state/probes/live-probe-summary.json`
- `00-state/probes/calendar-probe-latest.json`（ok=true, mode=priceCalendar）
- Phase3 已支持 `priceCalendar` 一店一次请求

## 尚未闭环（下一步）

| 能力 | 状态 |
|------|------|
| 日历价批量写盘 | API 已 HIT；等详情尾部完成后自动跑 / 可手动 phase3 |
| list 分页拉满 3001 | total 有了，翻页参数未证实 |
| 多图图集 | 详情主图为主 |

## 外接盘试点批次

```
/Volumes/CodexArchive/hbx-hotel-crawl/batches/CN/by-city/PEK/probe-fts-*/
  hotels.jsonl          # 100 条 zh+en 合并样例
  destinations-sample.json
  meta.json
```

## 推荐爬取路线（更新）

1. **登录保活**：调试 Chrome CDP 9222 + `darwinToken`
2. **目的地枚举**：FTS `type=DESTINATION` 多关键词（省/市/字母）去重 → `state/cn-destinations.json`
3. **酒店清单**：按目的地再 FTS / 待发现的 catalog；主键 `hotelCode`
4. **中英内容**：`locale=zh` + `locale=en` 合并
5. **日历价**：UI 一次成功搜索后锁定 avail API，再按日期窗口批跑
6. **落盘**：`batches/CN/by-city/<destCode>/<runId>/`

## 规模提示

- 声称约 **41 万** 酒店级记录：仅靠「城市名 FTS size=100」不够
- 需要：目的地覆盖清单 + 分页列表/可售接口 + 断点
- 磁盘：CodexArchive WD_BLACK SN850X，温度约 39–40°C，空间充裕
