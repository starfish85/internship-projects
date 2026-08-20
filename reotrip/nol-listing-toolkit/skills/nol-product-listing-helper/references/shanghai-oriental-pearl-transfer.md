# Shanghai City Hotel ↔ Oriental Pearl Tower Transfer (Live Notes)

Use this reference for `上海市区酒店-东方明珠` / Oriental Pearl private-car transfers.  
Live draft example (2026-08): `f8d81d72-908a-457d-9716-d200cf823c6f` (UNPUBLISHED).

**Load together with:** `SKILL.md` § User Corrections (especially Excel price asymmetry), `nol-partner-browser-playbook.md`, `nol-transfer-live-listing-workflow.md`.

---

## Absolute: Excel prices are the only truth (user 2026-08-06)

### Hard ban — do not “harmonize” prices

- **Every cell is independent.** Do **not** assume:
  - 去程 = 返程
  - 5 座 / 7 座 用同一套假日倍数
  - “豫园怎么写东方明珠就怎么写”
- **Live failure:** automation wrote **春节 7 座 = 500** for **both** go and return.  
  User Excel / screenshot table:

| 选项 | 成本(例) | 平日 HKD | 国庆/劳动档 | 春节档 |
| --- | --- | --- | --- | --- |
| 5座去程 | 170 | **213** | **304** | **425** |
| 7座去程 | 200 | **250** | **357** | **510** |
| 5座返程 | 170 | **213** | **304** | **425** |
| 7座返程 | 200 | **250** | **357** | **500** |

- **7座去程春节 = 510**；**7座返程春节 = 500**。表上就不对称。  
  用户指出「表里面有 510」= 源表正确；此前 skill/脚本对称抄 500 = **错价**。
- 改价验收：打开 **该选项** `销售日历管理` → 看 **日期格子上的数字**，不是选项列表卡片。
- `成本 / 0.8` 仅在用户明确要求或表只有成本列时使用；若表已给出售价列，**禁止用 /0.8 重算覆盖售价列**。

### Holiday windows (China scenic transfer — same calendar dates as 豫园 unless Excel differs)

Apply **per option** after cards exist; **one segment → 完成 → 再开日历**，禁止三段塞进同一未保存弹窗。

| 区间 | 5 座 HKD | 7 座去程 | 7 座返程 |
| --- | --- | --- | --- |
| 平日（销售期内默认） | 213 | 250 | 250 |
| `2026-10-01`～`10-10` | 304 | 357 | 357 |
| `2027-02-01`～`02-15`（春节） | 425 | **510** | **500** |
| `2027-05-01`～`05-10` | 304 | 357 | 357 |

---

## Product identity

- Korean product name:  
  `상하이 시내 호텔 ↔ 동방명주탑 단독 차량 편도 이동 서비스`
- Partner / management title (internal): from Excel, e.g.  
  `上海市区酒店-Oriental Pearl Radio & Television Tower Ticket`（以表为准）
- Currency: **HKD**
- Vehicles: **5 인승** + **7 인승**，各 **去(가는) / 返(오는)** → **4 options**
- Product max people: often **6** (7-seat usable cap) when form asks 人数
- Theme: **`司机提供车辆` / `기사제공차량`**
- Travel type: **`私人的`**
- Language: **韩语**
- Nationality: 不分国籍
- Use type: 按使用日期 / FIXED use-date at booking

### Option names (Korean)

1. `상하이 시내 호텔 출발 → 동방명주탑 편도 이동 (5인승 차량)`
2. `상하이 시내 호텔 출발 → 동방명주탑 편도 이동 (7인승 차량)`
3. `동방명주탑 출발 → 상하이 시내 호텔 편도 이동 (5인승 차량)`
4. `동방명주탑 출발 → 상하이 시내 호텔 편도 이동 (7인승 차량)`

### Price type names (Korean only)

| Option | 价格类型名称 | 说明 |
| --- | --- | --- |
| 5 go | `5인승 가는` | `5인승 차량` |
| 7 go | `7인승 가는` | `7인승 차량` |
| 5 rtn | `5인승 오는` | `5인승 차량` |
| 7 rtn | `7인승 오는` | `7인승 차량` |

**禁止** `5seat go` / `7seat return` 等英文码（全站审计规则）。

---

## Attributes page pitfalls (live 2026-08-06)

### Checkbox: click once only

- DOM `input[type=checkbox]` / `role=checkbox` 常 **`x ≈ -9999`**。
- **只点一次**；`aria-checked` / `input.checked` 已是 true → **禁止再点**（用户：*「你点了两次，都取消选择了」*）。
- 主题：`选择类别（主题）` → 仅勾选 **司机提供车辆** → **`已选`**。  
  页上出现 chip「司机提供车辆」、硬红 `请选择类别（主题）。` 消失 = 成功。  
  勿把灰色说明文案「请选择与产品相关的全部类别…」当成未选失败。
- 语言：`选择语言` → **韩语** 一次 → **`已选`**。

### POI 东方明珠

1. `添加地区和地点`
2. 搜索框 placeholder 常为 `관광지/숙소/주소로 검색`；输入后 **Enter / 搜索按钮**
3. 优先搜 **`동방명주탑`** 或带上海的结果  
   - **正确：** `동방명주` / `동방명주탑` + 地址含 **Shanghai / Lujiazui / Century Ave / 中华人民共和国·上海**  
   - **错误：** 韩国本地同名 `동방명주`（서울 중구 등）— 曾误加后需用地点卡右侧删除再重搜
4. 点结果 → **`添加地点`**
5. 地点类型单选 **`旅游地` / `value=TRAVEL_PLACE`**：点 **可见 label**（不要只改 `input.checked`）
6. `nameTag` 可保留 `동방명주` → 底部 **`添加`**（灰着 = 类型未勾上）
7. 验收：地区区无硬红；卡片显示上海地址

### 私人的 / 人数

- `tourTypes` value `0` 私人；label 点击
- 人数限制 是；最少 1、最大 6（按车型）

`保存然后` 启用后再进介绍。

---

## Introduction

- 韩文 headline / 3 行 highlight / description / checkList / usage（模板同豫园，地名改 `동방명주탑`）
- **`scheduleType` = NONE**（没有单独的时间表）
- 图片：**仅** `缩略图` / `注册商品图片(3个以上)` ×3  
  路径例：`upload-ready-images/shanghai-oriental-pearl/oriental-pearl-1.jpg` …  
  **不要**传到 `项目图片` / 프로그램
- `保存然后` → 法规

---

## Regulations (scenic, no flights)

### Basics

| Field | Value |
| --- | --- |
| 最短预约天数 | `3` |
| 最小/最大购买 | `1` / `10` |
| 库存 | 不设置库存（RIGHT） |
| 确认 | 人工确认 + `confirmationLeadTimeValue=3` + type **`DAYS`（天）** |
| 取消 | 可取消；**是（手动取消）**；`windows.0.deadline=2`，`penalty=0`；**不要**再 `添加` 出空的 windows.1 |

### 包含/不包含（简体弹窗大坑）

- 打开 **`撰写`** → hash `#registration.option-attribute.popup.hash`
- 勾选 **运输 TRANSPORTATION** + **接送 PICK_UP**（各一次）
- 说明是 **`input type=text`**，id：
  - `#inclusions_TRANSPORTATION_description`
  - `#inclusions_PICK_UP_description`
- 韩文例：
  - 运输：`상하이 시내 호텔 ↔ 동방명주탑 편도 전용 차량 이동 및 주차비 포함`
  - 接送：`픽업/샌딩 서비스 및 주차비 포함`
- 不包含：`#exclusions` textarea（가이드/팁/동방명주탑 티켓…）
- **底部按钮文案是「保存」不是「节省」**
- **Playwright 点「保存」可能完全不关弹窗、不写回父表单**（live）：  
  - `DimmedPopupFooterActions` 的 onClick 是 ref 包装  
  - `AttributeFormPopup.onSave(values)` **必须带上当前 values**；无参时用默认空 `inclusions:[]`  
  - 可靠做法：在 React fiber 上取 `AttributeFormPopup` 的 `onSave`，传入  
    ```js
    {
      inclusions: [
        { type: 'TRANSPORTATION', description: '…韩文…' },
        { type: 'PICK_UP', description: '…韩文…' },
      ],
      exclusions: [{ type: 'ETC', description: '…韩文…' }],
      appliedToAllOptions: true,
    }
    ```  
  - 父 Formik 字段名：**`optionAttributeBase`**
  - 写回后主页面应出现「包括 運輸(…) · 撿起(…)」；再关弹窗（必要时 `关闭`+离开窗 **确定** 丢弃弹窗脏状态，以父表单已写入为准）

### 代表预约（无航班）

按 id 勾选（只点未选中的），然后 **`已选`**，读摘要：

`CELLPHONE` `EMAIL` `ENGLISH_LAST_NAME` `ENGLISH_FIRST_NAME` `DEPARTURE_DATE_TIME`  
`HOTEL_NAME` `HOTEL_ADDRESS` `PICKUP_AREA` `PICKUP_TIME` `SENDING_AREA`  
`KAKAO_TALK_ID` `MESSAGING_APP_ID` `NUMBER_OF_PEOPLE` `NUMBER_OF_SUITCASES`

**不要**勾机场航班类 id。

### 代金券

- 打开 **`选择凭证及其使用方式`**（hash `voucher-usage-select`）
- 点卡片：文案含 **`用预约信息确认`** + **`无需換貨`/`無需換貨`**（例：以北京环球等旧模板名开头的卡也可以，看方法文案）
- **禁止**点到背后法规页的「是否需合作方确认 / 手动取消」区块（曾误点）
- 软警告「凭证 0 小时 vs 商品 72 小时」可保留，只要 `保存然后` 可点

`保存然后` → 选项管理。

---

## Options (create ×4)

1. **`注册/添加选项`**（`#registration.option-form.popup.hash`）
2. `#name` / `#description` / qty `rule.bookingRule.minimumPurchaseQuantityPerSession` = 1，max = 10  
3. **`选择价格类型`** → 精确点 tab **`其他价格类型 (直接输入)`**（LI/BUTTON，h≈50）  
   - 名称 placeholder：`输入的名称將顯示在销售渠道上。`  
   - 说明：`例) 滿 19 歲以上`  
   - min/max 1–10；勾选 **`必须购买`** + **`代表价`**（`ETC-required-label` / `ETC-representative-label`）各一次  
   - **`完成`**
4. **立刻重填选项名**（易被价格类型说明覆盖）
5. 销售期：**`1年`** → `input[value=ONE_YEAR]`（`range-select.range-type`）  
6. 价格：`请输入价格` **选期后才可填**；**只 fill 一次** 213 或 250  
7. 时段见下  
8. 表单 footer：**窄 `临时保存`(≈120px) → 宽 `下一个`(≈600px)**  
9. 离开窗 = 没保存 → **消除** 后重做 8

### Times — China attraction transfer

- **`08:00`–`21:30` every 30 min → 28 unique slots**（不是日本 07:00 起的 30 格）
- 空：点 **`设置时间`**  
  已有：时间段旁 **⋯ `더 보기` → 编辑**
- **`重复 小时 添加`**（点 **button 精确文案**，不要点到同时含「新增各别时间」的父节点）
- 两个时间字段：`08:00`、`21:30`；**分钟 → 30**  
- 必须点 **`生成` / `一代` / `생성`** 再弹窗 **`保存`**  
- 未生成就保存 → 只剩 1 条（用户曾否决）  
- 验收：**时间段** 下一行 compact：`08:00 · 08:30 · … · 21:30`，count = **28**

---

## Sales calendar (holiday overrides)

### UI path (简体 live)

1. 选项列表 **`销售日历管理`**（每卡一个，按 index 0–3）
2. Tab **`选择单个日期（可多选）`**
3. 月份标题形如 **`8 月 2026`**；翻月：  
   `button[class*="custom-caption__NextButton"]` / `PreviousButton`
4. 日期：`button[class*="custom-day__PlainDayButton"]` — **mouse 点格子**；选中后 **`请输入价格` 才从 disabled 变为可填**
5. fill 价格 → **`完成`**（关弹窗）  
6. **下一段重新打开日历**；禁止 Oct/Feb/May 同一弹窗连改

### 验收

- 平日格子：213 / 250  
- Oct 1–10：304 / 357  
- Feb 1–15：5 座 425；**7 去 510**；**7 返 500**  
- May 1–10：304 / 357  
- 读 **格子数字**，不要只信脚本 log

### 操作细节（Top Shanghai / 明珠共用，2026-08-06 再确认）

- **每一段**（Oct / 春节 / May）写价前：`Escape`/`消除` + `goto` 选项列表 + 确认 4 个「销售日历管理」再开。  
  连续多段不回列表 → 月份 caption 读到 `null`、后半选项失败。
- 日按钮 `innerText` **只有日期**；价格在容器 `1\n510`（`sale-period-day-content`）。验收脚本必须读容器第二行。
- 表内有售价列时 **禁止另算**；同档产品（Top of Shanghai）见 `shanghai-top-of-shanghai-transfer.md`。

### Times 多卡修改（共用）

- 每卡：`goto` list → `修改选项` → `设置时间`/`더 보기`→编辑 → **精确**「重复 小时 添加」→ 08:00–21:30 → **生成/一代** → 保存 → **临时保存→下一个**。
- 脏 form 上 `修改选项` 数为 0 = 未回列表。

---

## Marketing copy (Korean, ready to paste)

One-line:

`상하이 시내 호텔 ↔ 동방명주탑 편도 전용 차량으로 여유로운 이동을 즐기세요!`

3-line:

```text
상하이 시내 호텔에서 동방명주탑까지 단독 차량으로 편안하게 이동
대중교통 환승 없이 빠르고 쾌적한 전용 픽업 서비스
숙련된 기사님의 안전하고 친절한 응대
```

（完整 intro / must-know / FAQ 结构同 `shanghai-yuyuan-transfer.md`，地名一律 `동방명주탑`。）

---

## Automation scripts (workspace)

Under `nol-listing-automation/`（按需维护，以本 notes + Excel 为准）:

| Script | Role |
| --- | --- |
| `list-oriental-pearl.mjs` | 全流程草稿（易陈旧，价格务必对表） |
| `fix-pearl-times.mjs` | 四选项 08:00–21:30 |
| `fix-pearl-holidays2.mjs` | 节假日三段（**7 去春节必须 510**） |

---

## Stop rules

- 四卡 **可销售/销售中** + 时段/日历验收后：**停在选项列表**
- 可选页底 **`临时保存`**
- **禁止** `提交审核` / `批准请求`
- 汇报中明确写：批准/提交审核未点击；**价格已按 Excel 行列核对（含 510）**
