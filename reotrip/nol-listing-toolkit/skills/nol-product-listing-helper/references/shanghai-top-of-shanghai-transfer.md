# Shanghai City Hotel ↔ Top of Shanghai Observatory Transfer (Live Notes)

Use this reference for `上海市区酒店-Top of Shanghai Observatory Ticket` / 上海中心大厦观景台私人接送.  
Live draft example (2026-08-06): **`7805362f-ee7c-4bb9-abdf-203e3ecc0164`** (UNPUBLISHED).

**Load together with:** `SKILL.md` § User Corrections (Excel 售价列 + 中国时段 + 销售日历), `nol-partner-browser-playbook.md`, `nol-draft-edit-save-playbook.md`, `nol-transfer-live-listing-workflow.md`.  
**Do not** copy holiday cells from 豫园/东方明珠 blindly — re-read **this product’s Excel row**. (Top of Shanghai 售价表与明珠同档时也要逐格确认。)

---

## Absolute: Excel 售价列是唯一真相（用户 2026-08-06）

### 用户硬纠正

- *「不要另算价格，表内有现成的售价」*  
  表内常见公式：`D=C/0.8`，`E=D/0.7`，春节档 `F` **因行而异**（7 座去程可能 `E/0.7→510`，其余可能 `D/0.5→425/500`）。  
  **用公式求值后的单元格数字**，禁止再手算覆盖。
- **每一格独立。** 禁止假设 去=返、5=7、或「明珠怎么写这里就怎么写」。
- 7 座春节不对称（与明珠同结构时）：

| 选项 | 平日 HKD | 国庆/劳动 `10/1–10` & `5/1–10` | 春节 `2/1–15` |
| --- | --- | --- | --- |
| 5 座去/返 | **213** | **304** | **425** |
| 7 座去程 | **250** | **357** | **510** |
| 7 座返程 | **250** | **357** | **500** |

- 验收：**该选项 `销售日历管理` 格子上的数字**（容器 `1\n510`），不是列表卡片、不是 `fill` 返回 true。

### Holiday windows（销售期 1 年常见）

| 区间 | 5 座 | 7 去 | 7 返 |
| --- | --- | --- | --- |
| 平日默认 | 213 | 250 | 250 |
| `2026-10-01`～`10-10` | 304 | 357 | 357 |
| `2027-02-01`～`02-15` | 425 | **510** | **500** |
| `2027-05-01`～`05-10` | 304 | 357 | 357 |

---

## Product identity

| Field | Value |
| --- | --- |
| Korean product | `상하이 시내 호텔 ↔ 탑 오브 상하이 전망대 단독 차량 편도 이동 서비스` |
| Internal | `上海市区酒店-Top of Shanghai Observatory Ticket` |
| Dest short KO | `탑 오브 상하이` / full `탑 오브 상하이 전망대` |
| Currency | HKD |
| Vehicles | 5 인승 + 7 인승 × 去/返 → **4 options** |
| Product max people | **6**（7 座可用上限） |
| Theme | `司机提供车辆` / `기사제공차량` |
| Travel type | `私人的` |
| Language | 韩语 |
| Use type | 按使用日期 / FIXED |
| Images | 用户提供 3 张 → `upload-ready-images/top-of-shanghai/top-shanghai-{1,2,3}.jpg` |

### Option names

1. `상하이 시내 호텔 출발 → 탑 오브 상하이 전망대 편도 이동 (5인승 차량)`
2. `… (7인승 차량)` 去程
3. `탑 오브 상하이 전망대 출발 → 상하이 시내 호텔 편도 이동 (5인승 차량)`
4. `… (7인승 차량)` 返程

### Price types (Korean only)

| Key | 名称 | 说明 |
| --- | --- | --- |
| 5go | `5인승 가는` | `5인승 차량` |
| 7go | `7인승 가는` | `7인승 차량` |
| 5rtn | `5인승 오는` | `5인승 차량` |
| 7rtn | `7인승 오는` | `7인승 차량` |

---

## Bootstrap / 创建产品（live 踩坑）

1. 列表 **新产品注册**（勿把名称填进后台搜索框）。
2. 模态：产品名 → 类型 **TRANSPORTATION**。
3. 确认按钮文案 live 可能是 **简繁混写**：**`开始創建产品`**（「开始」简 + 「創建」繁）。  
   - 只匹配 `开始创建产品` 或 `開始創建產品` 会 **miss**。  
   - 可靠：`/开始.*产品|開始.*產品|創建产品|创建產品/` 或枚举 button 含 `创建`/`創建`/`제품`.
4. 跳转 `.../registration/properties?id=...` 后立刻记下 **id**（本产品：`7805362f-…`）。

---

## Attributes

### Checkbox 只点一次

与明珠相同：`x≈-9999` → mouse 点 **可见 label**；已选 **禁止再点**。

### POI — 上海中心 / Top of Shanghai（勿点错城）

1. `添加地区和地点`
2. 搜索优先：**`上海中心大厦`** / **`탑 오브 상하이`** / 银城中路 **501**  
   - **正确：** 上海 / Shanghai / 浦东 / 银城中路  
   - **错误：** 韩国同名或无关 POI；东方明珠 POI（另一产品）
3. `添加地点` → 类型 **`旅游地`/`TRAVEL_PLACE` label** → 底部 **`添加`**
4. 验收：卡片地址含上海；硬红消失

`保存然后` → 介绍。

---

## Introduction

- 韩文：headline / 3 highlight / description / checkList / usage（模板同豫园/明珠，地名 `탑 오브 상하이 전망대`）
- **`scheduleType` = NONE**
- 图片 **仅缩略图** ×3（用户给的图优先）  
  路径：`upload-ready-images/top-of-shanghai/`
- **不要** `项目图片` / 프로그램

---

## Regulations（景区，无航班）

同明珠 / 豫园景区模板：

| 项 | 值 |
| --- | --- |
| 最短预约 | 3 天 |
| 购买 | 1–10 |
| 库存 | 不设置 |
| 确认 | 人工 + 3 DAYS |
| 取消 | 可取消 + **是（手动取消）**；`windows.0` = 2 / 0%；**勿添加空 windows.1** |
| 包含 | TRANSPORTATION + PICK_UP 韩文；**保存可能要 `AttributeFormPopup.onSave(values)` → `optionAttributeBase`** |
| 预约 | 无航班 id；`CELLPHONE`…`NUMBER_OF_SUITCASES`；**已选** + 摘要非空 |
| 代金券 | `用预约信息确认` + `无需換貨`；勿点到背后「手动取消」区 |

`保存然后` → 选项。

---

## Options ×4 + 时段（提速关键路径）

### 建卡顺序（勿跳）

1. `注册/添加选项`
2. name / desc / qty 1–10
3. 价格类型 tab **`其他价格类型 (直接输入)`** → 韩文名 + 必须购买 + 代表价 → **完成**
4. **立刻重填选项名**（易被覆盖）
5. 销售期 **`1年`** → 平日价 **只 fill 一次**（213 或 250）
6. **时段**（见下）
7. **窄 `临时保存` → 宽 `下一个`**
8. 离开窗 = 未保存 → **消除** 后重做 7

### Times — 中国景区 **08:00–21:30 × 28**（不是日本 07:00/30）

**成功序列（Top Shanghai live 验证）：**

```text
空卡：点「设置时间」
已有：时间段旁 ⋯（aria-label 더 보기）→ 编辑
→ 循环点「删除/刪除」清旧行
→ 点 button 精确文案「重复 小时 添加」
   （禁止点到同时含「新增各别时间」的父节点 → 否则 hasGen=false）
→ 两个时间字段：
   field[0] 小时最左点 08 + 分钟最右点 00
   field[1] 小时最左 21 + 分钟最右 30
→ 点「分钟/分鐘」→ 选 30
→ 必须点「生成」/「一代」/「생성」  ← 未点则保存只剩 1 条
→ 弹窗内确认 28 格 08:00…21:30
→ 弹窗「保存」
→ 表单「时间段」行验收 count=28 first=08:00 last=21:30
→ 临时保存 → 下一个
```

### Times 自动化致命坑（2026-08-06 真踩）

| 坑 | 症状 | 正确做法 |
| --- | --- | --- |
| 脏表单 / 卡在 option-form | `修改选项` count = **0** | **先 `goto` 干净列表 URL**，再 `nth(i)` 打开 |
| 一次脚本连改 4 卡不回列表 | 后几卡 open 失败 / slots=0 | **每卡：list → 修改选项 i → 设时段 → 临时保存→下一个 → 再 list** |
| `filter` 写错 `\|` 代替 `\|\|` | fields 异常 | JS 逻辑用 `\|\|` |
| 只点「设置时间」但弹窗未开 | hasGen false | 再走 `더 보기`→编辑；确认 dialog 含「重复/开始时间」 |
| 未点生成 | 1 条时段 | 强制 gen 文案 `生成\|一代\|생성` |
| 整页扫 `HH:MM` | 误把时钟当时段 | 只读 **「时间段」下一行 compact** |
| 并行多个 CDP | UI 冻结像卡住 | **同一时刻只跑一个** Playwright 脚本 |
| 长脚本超超时 | 对话像卡住 | 分批：先 4 卡建完 → 再 times 2–4 → 再 holidays；每卡 log |

**验收（本产品已通过）：** 4 选项均为 `count:28, first:08:00, last:21:30`。

---

## Sales calendar（假日价）— 提速 + 防失败

### 必须节奏

```text
for optionIndex in 0..3:
  for segment in [oct, spring, may]:
    1) listClean（Escape / 消除 / goto 选项列表）  ← 每段都做，不是每选项做一次
    2) 销售日历管理 nth(optionIndex)
    3) Tab「选择单个日期（可多选）」
    4) NextButton 翻到目标月（caption 形如「2 月 2027」）
    5) mouse 点 day 1..N 的 PlainDayButton
    6) 等「请输入价格」enabled → fill Excel 价
    7) 「完成」关窗
    8) 下一段从 1) 重新开始
```

### 真踩坑：后半段 `goto month failed, at null`

- **原因：** 连续多段不回列表 → 日历弹窗半开 / caption 读不到 / NextButton 无效。  
- **修复（Top Shanghai 重试一次全绿）：** **每一段** `openCal` 前 `goto` 干净列表；`cals.count()===4` 再点。  
- 失败段单独重试即可，不必整产品重做。

### 价格写入后如何读格子（勿只读 button）

Live DOM：

```text
td.rdp-cell / [class*="custom-day___StyledContainer"]
  innerText = "1\n510"     ← 用这个验收
button.custom-day__PlainDayButton
  innerText = "1"          ← 只有日期，没有价格（脚本读这里会全 FAIL）
sibling: sale-period-day-content___StyledText2 = "510"
```

验收 snippet：

```js
// 读 day d 的价：找容器 text 第一行=d，第二行=price
const cell = [...document.querySelectorAll('td.rdp-cell, [class*="custom-day___StyledContainer"]')]
  .find(el => (el.innerText||'').trim().split('\n')[0] === String(d));
const price = (cell?.innerText||'').trim().split('\n').map(s=>s.trim()).filter(Boolean)[1];
// 期望：7go 2/1 → 510；7rtn 2/1 → 500
```

或截图肉眼：2 月 1–15 应整片 **510**（7 去）/ **500**（7 返）。

### 关键验收清单（本产品）

| 检查 | 期望 |
| --- | --- |
| 7go `2027-02-01` / `02-15` | **510** |
| 7rtn `2027-02-01` / `02-15` | **500** |
| 7go `2026-10-01` | 357 |
| 5go `2027-02-01` | 425 |
| 5rtn `2027-05-01` | 304 |

---

## Fast path（中国景区 5/7 接送 — 目标 ≤1 次重试）

```text
0. 读 Excel 售价列求值 → 写死 PRICES map（含 510/500）
1. 创建/续草稿 → id 记下；创建按钮兼容「开始創建产品」
2. 属性：主题/私人/韩语 各点一次；POI 上海中心；保存然后
3. 介绍：3 图缩略图 + 韩文 + NONE；保存然后
4. 法规：包含 onSave(values)；预约无航班；代金券；保存然后
5. 选项 ×4：建卡时带平日价；时段可建卡时设或建完再统一修
6. 时段：每卡 list→改→08:00–21:30 gen→临时保存→下一个；log 28
7. 假日：每「选项×段」listClean→开日历→选日→价→完成；失败只重跑失败段
8. 格子验收 510/500；页底临时保存；STOP 列表；永不提交审核
```

---

## Automation scripts

| Path | Role |
| --- | --- |
| `nol-listing-automation/list-top-shanghai.mjs` | bootstrap/attrs/intro/regs/options/holidays 分 phase |
| `fix-pearl-holidays2.mjs` 模式 | 假日三段；**改 ID + OPTS 价** 即可复用 |
| 内联 times 循环 | 见上「成功序列」；opt index 1–3 曾失败靠 list 重开修好 |

---

## Marketing copy（可直接贴）

One-line:

`상하이 시내 호텔 ↔ 탑 오브 상하이 편도 전용 차량으로 여유로운 이동을 즐기세요!`

3-line:

```text
상하이 시내 호텔에서 탑 오브 상하이 전망대까지 단독 차량으로 편안하게 이동
대중교통 환승 없이 빠르고 쾌적한 전용 픽업 서비스
숙련된 기사님의 안전하고 친절한 응대
```

包含运输：`상하이 시내 호텔 ↔ 탑 오브 상하이 전망대 편도 전용 차량 이동 및 주차비 포함`  
接送：`픽업/샌딩 서비스 및 주차비 포함`  
不包含：指南/小费/观景台门票/儿童座椅/夜间加价/中途停靠 等。

---

## Stop rules

- 四卡 **可销售** + 时段 28 + 假日格验收后 → **停选项列表**
- 可选页底 **`临时保存`**
- **禁止** `提交审核` / `批准请求`
- 汇报写明：未点批准；**价格按 Excel 核对（含 7 去春节 510 / 7 返 500）**
