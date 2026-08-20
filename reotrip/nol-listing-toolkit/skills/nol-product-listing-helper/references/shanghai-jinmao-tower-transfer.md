# Shanghai City Hotel ↔ JinMao Tower 88F Observatory Transfer (Live Notes)

Use this reference for `上海市区酒店-金茂大厦88层` / 진마오 타워 88층 전망대 private transfer.  
Live draft (2026-08-06): **`6be1a050-26d4-4ab9-a68f-23ef30b251dd`** (UNPUBLISHED).

**Load together with:** `SKILL.md` **§ MANDATORY Verify-Before-Next** (highest priority), User Corrections (Excel + China times + calendar), `nol-partner-browser-playbook.md`, `nol-draft-edit-save-playbook.md`, `nol-transfer-live-listing-workflow.md`.

**Do not** copy holiday cells from 豫园 blindly — re-read **this product’s Excel row**. JinMao 售价表与明珠/Top of Shanghai 同档时也要逐格确认。

---

## Why this file exists（用户 2026-08-06 金茂事故）

| 用户原话 | 根因 | Skill 强制 |
| --- | --- | --- |
| *「时间分明就是没做好」* | create 脚本 log：`times { count: 0 }` 仍 `done` | **count≠28 → 失败**；禁止假报 |
| *「先检查是不是真做好了再做下一个」* | 未过验收就开假日/下一卡 | **Verify-Before-Next 门禁表** |
| *「不能通过跳转 url…只能保存然后」* | 用 `goto` 跨注册步 | 跨步只 `保存然后` / stepper |

### 事故日志（禁止重演）

```text
create 5go
  price 213
  times { count: 0 }    ← 已失败
  done 5go              ← 违规：禁止 done
```

**正确：** `times.count===28 && first==='08:00' && last==='21:30'` 才临时保存→下一个；否则重试或停。

### 时段二次验收（金茂已验证有效）

```text
for i in 0..3:
  干净列表 → 修改选项 nth(i)
  wait #name 有值
  读「时间段」下一行 compact → 必须 28 / 08:00 / 21:30
  临时保存 → 下一个
任一张 FAIL → 只修该卡 → 再二次验收
```

中间态 `setTimes` 弹窗内看到 28 格 **不够**；**保存回列表后再打开**才算过门。

---

## Absolute: Excel 售价列是唯一真相

与明珠 / Top of Shanghai 同结构时（国内接送表）：

| 选项 | 平日 HKD | 国庆/劳动 `10/1–10` & `5/1–10` | 春节 `2/1–15` |
| --- | --- | --- | --- |
| 5 座去/返 | **213** | **304** | **425** |
| 7 座去程 | **250** | **357** | **510** |
| 7 座返程 | **250** | **357** | **500** |

- 用户：*「不要另算价格，表内有现成的售价」* → 公式求值后写入，禁止再 `/0.8` 覆盖。
- **7 去春节 510 ≠ 7 返春节 500** — 禁止对称抄。
- 验收：日历容器 **`1\n510`**，不是列表、不是 `fill===true`。

### Holiday windows

| 区间 | 5 座 | 7 去 | 7 返 |
| --- | --- | --- | --- |
| 平日 | 213 | 250 | 250 |
| `2026-10-01`～`10-10` | 304 | 357 | 357 |
| `2027-02-01`～`02-15` | 425 | **510** | **500** |
| `2027-05-01`～`05-10` | 304 | 357 | 357 |

---

## Product identity

| Field | Value |
| --- | --- |
| Korean product | `상하이 시내 호텔 ↔ 진마오 타워 88층 전망대 단독 차량 편도 이동 서비스` |
| Dest short KO | `진마오 타워 88층 전망대` |
| Currency | HKD |
| Vehicles | 5 + 7 × 去/返 → **4 options** |
| Theme | `司机提供车辆` / `기사제공차량` |
| Travel type | `私人的` |
| Language | 韩语 |
| Images | 用户 3 张 → `upload-ready-images/jinmao/jinmao-{1,2,3}.jpg` |
| Draft id | `6be1a050-26d4-4ab9-a68f-23ef30b251dd` |

### Option names

1. `상하이 시내 호텔 출발 → 진마오 타워 88층 전망대 편도 이동 (5인승 차량)`
2. `… (7인승 차량)` 去程
3. `진마오 타워 88층 전망대 출발 → 상하이 시내 호텔 편도 이동 (5인승 차량)`
4. `… (7인승 차량)` 返程

### Price types (Korean only)

| Key | 名称 | 说明 |
| --- | --- | --- |
| 5go | `5인승 가는` | `5인승 차량` |
| 7go | `7인승 가는` | `7인승 차량` |
| 5rtn | `5인승 오는` | `5인승 차량` |
| 7rtn | `7인승 오는` | `7인승 차량` |

---

## Bootstrap / 属性 / 介绍 / 法规

与 Top Shanghai / 明珠同流：

1. 新产品注册；确认钮兼容 **`开始創建产品`** 混写；记下 `id=`。
2. **禁止 URL 跨步**；每页等 **`保存然后` enabled → click**。
3. Checkbox **只点一次**；隐藏 input → **mouse 可见 label**。
4. **POI 金茂 / Jin Mao Tower / 世纪大道附近上海结果** — 勿点韩国同名、勿点东方明珠/上海中心（别的产品）。
5. 介绍：缩略图 ×3（用户图）+ 韩文 + `NONE`。
6. 法规：包含优先 `AttributeFormPopup.onSave(values)` → `optionAttributeBase`。
7. **预约：** 无航班；required 行用 **`label[for=id]` mouse.click**（input 常 `y≈-9999`）；摘要非空后 `已选`。

---

## Options ×4 + 时段（必须过门）

### 建卡

```text
注册/添加选项 → name/desc/qty
→ 其他价格类型 → 韩文名 + 必须购买 + 代表价 → 完成
→ 重填选项名
→ 1年 → 平日价一次（213/250）
→ 时段（下）
→ 窄「临时保存」→ 宽「下一个」
→ 列表确认新卡出现
```

### Times — 中国景区 **08:00–21:30 × 28**

```text
设置时间 或 ⋯더 보기→编辑
→ 删旧行
→ button 精确「重复 小时 添加」
→ 08:00 / 21:30 → 分钟 30
→ 必须「生成」/「一代」/「생성」
→ 弹窗保存
→ 表单「时间段」行：count=28 first=08:00 last=21:30
→ 临时保存→下一个
```

### 金茂时段致命坑

| 坑 | 症状 | 正确 |
| --- | --- | --- |
| setTimes 失败仍 done | log `count: 0` + done | **exit≠0 / 重试**；禁止报完成 |
| 只验弹窗不验表单 | 用户截图仍空 | 弹窗保存后读 **时间段 compact** |
| 不二次重开 | 以为 4 卡都好 | 四卡全部再 open 读一遍 |
| `#name` 未就绪就读 | 假 count=0 | wait name 再读 |
| 脏 form 连开下一卡 | 修改选项=0 | 每卡回干净列表 |
| 并行/后台旧脚本 | UI 乱点 | **单 CDP**；先 kill 残留 |

---

## Sales calendar（假日）

### 节奏

```text
for optionIndex in 0..3:
  for segment in [oct, spring, may]:
    listClean（Escape / 消除 / 必要时 goto 同 id 选项列表）
    销售日历管理 nth(i)：scrollIntoView + mouse.click
    等 caption 出现（如「8 月 2026」）+ PlainDay 存在
    选择单个日期 → 翻月 → 点日 → 价 → 完成
```

### 金茂日历致命坑

| 坑 | 症状 | 正确 |
| --- | --- | --- |
| 第 4 卡不滚动 force click | `caption=null`，7rtn 三段全挂 | **scrollIntoView center + mouse** |
| 多段不 listClean | 后半段挂 | **每段** listClean |
| 只读 PlainDayButton | 验收全 FAIL | 读容器 `日\n价` |
| 对称写 500/500 | 错价 | 7 去 **510** / 7 返 **500** |

### 抽检验收

| 检查 | 期望 |
| --- | --- |
| 7go `2027-02-01` / `02-15` | **510** |
| 7rtn `2027-02-01` / `02-15` | **500** |
| 5go spring | 425 |
| 任意国庆/劳动 7 座 | 357 |

---

## Automation scripts（workspace）

| Path | Role |
| --- | --- |
| `nol-listing-automation/fix-jinmao-times.mjs` | 四卡时段 08–21:30；**RESULTS 全 ok 才 exit 0** |
| `nol-listing-automation/fix-jinmao-holidays.mjs` | 假日三段 + 春节点验 |
| `fix-pearl-holidays2.mjs` 模式 | 改 draft id + OPTS 价 |

**硬编码：** 任何 times 脚本在 `count < 28` 时 **不得** `process.exit(0)`。

---

## Fast path

```text
0. Excel 售价求值 → PRICES（含 510/500）
1. 创建/续草稿；开始創建产品 混写
2. 属性→介绍→法规：每步 保存然后；预约 label[for]
3. 四卡落列表（平日价）
4. 时段×4：每卡 list→设→验 28→临时保存→下一个
5. 时段二次：再 open 四卡读 时间段
6. 假日：每段 listClean；第 4 卡 scroll+mouse；格子 510/500
7. 页底临时保存；STOP 列表；永不提交审核
```

---

## Stop rules

- 四卡可销售 + 时段二次 28 + 假日格验收 → **停选项列表**
- 可选页底 **临时保存**
- **禁止** 提交审核 / 批准请求
- 汇报必须写：未点批准；时段二次验收数字；假日 510/500 格子结果  
- **禁止**在 `times {count:0}` 类日志后写「已完成时段」
