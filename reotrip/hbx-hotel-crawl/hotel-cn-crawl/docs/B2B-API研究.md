# Bedsonline / HBX B2B 入口与 API 调研

更新：2026-07-30  
目的：判断是否有正式 API，能否比「UI 抓包 + 猜 path」更高效地拉酒店内容 / 图片 / 日历价。

---

## 结论（先看这个）

| 通道 | 是否存在 | 我们是否已有凭证 | 效率 | 说明 |
|------|----------|------------------|------|------|
| **Hotelbeds APItude 正式 API** | ✅ 有官方套件 | ❌ 当前账号未见 Api-key/Secret | ⭐⭐⭐⭐⭐ | 内容+报价标准接口，适合批量 |
| **Bedsonline 中国站 Web B2B 后端** | ✅ 有（`webapi.gta-travel.cn`） | ✅ `darwinToken`（门户登录） | ⭐⭐⭐⭐ | **详情/可售/日历价 path 已锁定并 live 200** |
| **纯页面 DOM 爬取** | — | — | ⭐ | 最慢，仅作兜底 |

**当前可执行主路径：门户 `darwinToken` + `webapi.gta-travel.cn`（已够用）；APItude 仍作商务开通的增强项。**

---

## 1. 官方 B2B API：Hotelbeds APItude

Bedsonline / GTA Travel 同属 **HBX Group / Hotelbeds** 体系。对外开发者入口：

- 文档门户：`https://developer.hotelbeds.com/`
- Getting Started：注册 → 拿 **Api-key + Secret** → 算 **X-Signature**

### 鉴权（与门户完全不同）

```text
Api-key: <your key>
X-Signature: sha256(apiKey + secret + unixTimestampSeconds)
```

测试域：`https://api.test.hotelbeds.com`  
生产域：`https://api.hotelbeds.com`（上线后）

### 酒店相关套件（与我们需求一一对应）

| 套件 | 能力 | 对应我们要的 |
|------|------|----------------|
| **Content API** | 酒店静态信息：描述、设施、地址、**图片**、多语言 | 酒店内容 + 图片 |
| **Booking API** | Availability / CheckRate / Book | **日历价 / 可售** |
| **Cache API** | 大批量价库预取（进阶） | 大规模日历加速 |

Content 侧常见形态（公开文档/社区示例）：

```http
GET /hotel-content-api/1.0/hotels?fields=all&language=ENG&from=1&to=100
GET /hotel-content-api/1.0/hotels?destinationCode=PEK&...
```

Booking 侧典型工作流：

```text
POST /hotel-api/1.0/hotels          # availability（目的地或 hotelCodes + 日期 + 入住人数）
POST /hotel-api/1.0/checkrates
POST /hotel-api/1.0/bookings
```

评估环境默认约 **50 req/day**；认证/生产配额需在 dashboard 升级。

### 与「Bedsonline 中国站账号」的关系

- 门户登录账号（如 `BHU0000161`）**不等于** APItude 的 Api-key。
- APItude 一般由 **供应商/代理商商务或技术对接** 开通；有的机构 Bedsonline 能订，但 **未开 APItude**。
- 即便开了 APItude，**源市场 / 合同 / 价** 可能与 `app-bedsonline.gta-travel.cn` 不完全一致，上线前应用同一酒店做对照。

---

## 2. 当前已在用的「门户 B2B 后端 API」

入口：`https://app-bedsonline.gta-travel.cn`  
后端：`https://webapi.gta-travel.cn`  
鉴权：`Authorization: Bearer <darwinToken>`（localStorage，注意去引号）  
实现：优先 **XHR**（页面 fetch 易被 Tealeaf 劫持）。

### 账号权限（已抓到 users 接口）

用户：`BHU0000161` / 机构 `BHU00001`  
与酒店相关的 **grants 已开启**（说明业务侧允许酒店搜索/目录，不是权限被关）：

- `AVAILHOT` — 酒店可售
- `HOTELCATALOGUE` — 酒店目录
- `BKCONFHOT` — 酒店预订确认
- 以及 `NAVSEARCH`、`VIEWCOMMISSION` 等

### 已验证可用（2026-07-30 复核）

| 接口 | 用途 | 状态 |
|------|------|------|
| `GET /client-content-api/1.0/countries/CN/destinations` | 中国目的地 ≈403 | ✅ 200 |
| `GET /client-content-api/1.0/fts?type=HOTEL&query=...` | 酒店名称检索（非严格全量） | ✅ 200 |
| `GET /client-user-api/1.0/users` | 用户/grants | ✅ 200 |
| 登录态 `darwinToken` | 会话 Bearer | ✅ |
| **`POST /client-content-api/1.0/hotels/detail`** | 酒店双语详情 | ✅ 200 |
| **`POST /client-hotel-avail-api/3.0/hotels?locale=zh`** | 按店/按目的地可售+房价 | ✅ 200 |
| **`POST /client-hotel-avail-api/1.0/hotels/calendar?locale=zh`** | **多日价格日历 priceCalendar** | ✅ 200 |
| **`POST /client-hotel-avail-api/2.0/hotels/list?locale=zh`** | 目的地酒店目录（PEK≈3001） | ✅ 200（分页待完善） |
| `GET /client-content-api/1.0/board-group-searchbox` | 餐型枚举 | ✅ 200 |
| `GET /client-content-api/1.0/hotels/facilities` | 设施字典 | ✅ 200 |

#### 日历价 HIT（门户 webapi，2026-07-30）

```http
POST https://webapi.gta-travel.cn/client-hotel-avail-api/1.0/hotels/calendar?locale=zh
Authorization: Bearer <darwinToken>
Content-Type: application/json

{
  "hotelCode": "100399",
  "shiftDays": 90,
  "stay": { "checkIn": "2026-08-06", "checkOut": "2026-08-07" },
  "occupancies": [{ "rooms": 1, "adults": 2, "children": 0 }]
}
```

返回：

```json
{
  "hotelCode": 100399,
  "priceCalendar": [
    { "checkIn": "2026-07-30", "checkOut": "2026-07-31", "price": 1114.16, "roomDescription": "双人房（两张床） 高级 RO" }
  ],
  "minPrice": 910.8,
  "maxPrice": 1179.83,
  "currency": { "code": "CNY", ... }
}
```

| shiftDays | 实测返回天数 |
|-----------|-------------|
| 7 | 15 |
| 14 | 29 |
| 30 | 61 |
| 60 | 121 |
| 90 | **181** |

→ **一店一次请求可拉 ~半年日历价**，远优于按天循环 `3.0/hotels`。

#### 可售搜索 HIT

```http
POST /client-hotel-avail-api/3.0/hotels?locale=zh
{ "hotelCodes": ["100399"], "stay": {...}, "occupancies": [...], "pageSize": 20 }
// 或 destinationCode: "PEK" → totalHotels≈380+（有价）
```

#### 目录列表（扩清单）

```http
POST /client-hotel-avail-api/2.0/hotels/list?locale=zh
{ "destinationCode": "PEK", "pageSize": 100 }
// totalHotels=3001；当前响应页约 20 条，page/offset 参数未证实翻页
```

#### 酒店详情 HIT（门户 webapi，无需 APItude Key）

```http
POST https://webapi.gta-travel.cn/client-content-api/1.0/hotels/detail?locale=zh
Authorization: Bearer <darwinToken>
Content-Type: application/json

{ "hotelCodes": ["100399", "100937"] }
```

- 必须 **POST**（GET 会 422：method not supported）
- body 键必须是 **`hotelCodes` 数组**（`code` / `hotelCode` / `codes` 会 500）
- `locale=zh|en` 可分别取中英文
- 可批量（已验证 3～5 个 codes 同批）
- 返回数组，字段示例：

| 字段 | 含义 |
|------|------|
| `code` / `name` | 酒店码、名称 |
| `category` | 星级 |
| `location` | 目的地/区/国家/坐标 |
| `chain` | 品牌连锁 |
| `accommodationType` | 住宿类型 |
| `contact.address` / `phones` | 地址电话 |
| `amenities` | 设施 |
| `segments` | 细分标签 |
| `urlImage` | 主图相对路径，如 `10/100399/100399a_hb_a_001.jpg?...` |
| `exclusiveDeal` / `luxuryCollection` / `sustainable` 等 | 标签 |

**图片 CDN（已 HEAD 验证 200）**

```text
https://photos.hotelbeds.com/giata/{urlImage去query}
https://photos.hotelbeds.com/giata/bigger/{...}
https://photos.hotelbeds.com/giata/original/{...}
https://photos.hotelbeds.com/giata/medium/{...}
https://photos.hotelbeds.com/giata/small/{...}
# 亦可 https://cdn.hotelbeds.com/giata/{...}
```

例：`urlImage=10/100399/100399a_hb_a_001.jpg?...`  
→ `https://photos.hotelbeds.com/giata/10/100399/100399a_hb_a_001.jpg`

样例落盘：`hotel-pipeline/00-state/probes/hotel-detail-full.json`

### 仍待完善

| 能力 | 状态 |
|------|------|
| 目录 list 分页 | total=3001 但 page/offset 试参仍返回同一页 20 条 |
| 多图图集 | 详情多为主图 `urlImage`；facilities/room-observations body 未完全定型 |
| APItude Key | 商务开通后可替代/加速 |

→ SPA 完整 path 目录：`hotel-pipeline/00-state/probes/webapi-research-*/webapi-path-catalog.json`  
→ live 探针：`.../live-probe-summary.json`、`calendar-shift-and-list-pagination-20260730.json`

---

## 3. 两条路线怎么选

### 路线 A — 正式 APItude（推荐，效率最高）

**前提**：向 Hotelbeds/Bedsonline 商务或技术支持申请该代理的 **Hotel API Key + Secret**（Content + Booking）。

优点：

- 内容/图片可分页批量拉，标准字段
- 可售按目的地或 hotelCodes + 日期窗口，适合日历表
- 不依赖 UI 选择器与 Angular overlay
- 限速/配额清晰，利于断点与温控落盘

动作清单：

1. 注册/登录 `developer.hotelbeds.com` 或走代理商已有合同开 key  
2. 确认 **sourceMarket=CN / 币种 CNY** 是否与门户一致  
3. 用 ContentAPI 按 `destinationCode=PEK|PVG|...` 或 hotel codes 拉详情+图  
4. 用 BookingAPI availability 按日/按窗拉价，写入现有 `product.xlsx` 分月表  
5. 与现有 FTS 清单 `hotelCode` 做主键对齐（注意 code 体系是否同一）

### 路线 B — 继续门户 webapi + darwinToken

**前提**：UI 成功搜出酒店列表 / 打开详情，拦截真实 XHR。

优点：与现网 B2B 报价、合同完全一致  
缺点：依赖前端稳定性；批量要自控限速；path 变更要重探

动作清单：

1. 修好目的地控件选择（列表项 + Escape 关 overlay）  
2. 一次成功 `btn_search_stay_themepark` → 抓 `webapi.gta-travel.cn` 全部 POST/GET  
3. 点进一家酒店详情 → 抓 content/images  
4. 把 HIT path/body 写进 `calendar-probe-latest.json` / content probe → 接 phase3  

### 路线 C — 混合（务实）

- **清单**：继续门户 FTS（已完成北上广深）  
- **内容+图**：有 APItude 就用 ContentAPI；没有则门户详情 path  
- **日历价**：有 BookingAPI 就用；没有则门户 avail path  
- 外接盘仍作主落盘 + 温控

---

## 4. 和当前流水线的衔接

已完成：

- Phase1 清单：PEK/PVG/CN1/SZX 共约 4583 家  
- Phase2 产品骨架：`product.json` / `product.xlsx`（字段来自 FTS，日历空、无图）

阻塞：

- `calendarsDone=0`，`imagesSaved=0`，content probe 未 HIT  

若拿到 APItude：

- 新增 `scripts/pipeline/phase2-apitude-content.mjs`  
- 新增 `scripts/pipeline/phase3-apitude-availability.mjs`  
- 配置 `config/apitude.json`（Api-key / Secret / endpoint，**勿提交密钥**）  
- 断点仍写 `hotel-pipeline/00-state/checkpoint.json`

---

## 5. 建议你方立刻确认的 3 件事

1. **代理是否已有 Hotelbeds APItude 合同/Key？**  
   - 有：把 **test/prod Api-key + Secret**（可先 test）放到本机环境变量，不进 git  
   - 无：联系 Bedsonline/HBX 客户经理开通 Hotel Content + Booking  
2. **目标价是「门户 CN 预付价」还是「APItude 合同价」？** 两者可能不同  
3. **酒店 code 是否同一套**（门户 FTS 的 id 是否 = ContentAPI hotel code）— 拿 5 家样例对齐  

---

## 6. 参考链接

- Hotelbeds Developer：https://developer.hotelbeds.com/  
- Getting Started：https://developer.hotelbeds.com/documentation/getting-started/  
- Content API：https://developer.hotelbeds.com/documentation/hotels/content-api/  
- Booking workflow：https://developer.hotelbeds.com/documentation/hotels/booking-api/workflow/  

内部已有：

- `docs/API探测记录.md` — 门户 FTS/鉴权  
- `docs/PIPELINE.md` — 分阶段落盘与温控  
- 用户 grants 样例：`data/probe-hotel-beijing-live.json`（users 响应）
