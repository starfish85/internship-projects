# Shanghai City Hotel ↔ Madame Tussauds Shanghai Transfer (Live Notes)

Use this reference for `上海市区酒店-Madame Tussauds Shanghai Admission Ticket` / 마담 투소 상하이 private transfer.  
Live draft (2026-08-06): **`4f20f9a8-0e5a-48fd-942e-5ebd469cb68e`** (UNPUBLISHED).

**Load together with:** `SKILL.md` **§ MANDATORY Verify-Before-Next** + **§36–41（杜莎硬规则）**, `nol-partner-browser-playbook.md`, `nol-draft-edit-save-playbook.md`, `nol-transfer-live-listing-workflow.md`.

**Do not** invent holiday cells — re-read **this product’s Excel rows R39–42** (`国内接送产品`).

---

## Why this file exists（用户 2026-08-06 杜莎连否）

| 用户原话 | 代理错误 | 硬规则 |
| --- | --- | --- |
| *「别放搜索框」* | 产品名填进列表顶部搜索 | **只填创建弹窗** + TRANSPORTATION |
| *「保存然后」灰 / 属性未齐* | 主题/语言/POI 未齐就想跳步 | 三项齐 + 私人的 → 按钮 enabled 再点 |
| 截图 **6 张** 缩略图 | 同一批图上传两次 | 用户 3 图 → **正好 3**；多则删底，留「代表」 |
| *「选了但没选上」「每次选择要验收」* | 预约 force 点 / 不滚列表 / 不读摘要 | scroll + `label[for]` + checked + **页面摘要** 再过 |
| *「分钟都没选到」* | 间隔 30 未真选上 | 生成前 **读回间隔=30** |
| 结束成 `00:30` | 双列时间点错列 | 结束 **左 21 / 右 30**，读回 `21:30` |
| *「这里要点保存」*（时段列表截图） | 生成后未点 **弹窗「保存」** | 弹窗 list 28 行后 **必点弹窗保存**；再读 form compact |
| *「时间分明就是没做好」* | count=0 仍 done / 只验弹窗 | compact **28/08:00/21:30** + 四卡二次重开 |

### 事故模式（禁止重演）

```text
# 错：分钟未选 / 结束 00:30 / 未点弹窗保存
setTimes → 弹窗内好像有行 → Escape 或只点临时保存
→ 表单 时间段 count: 0
→ console.log('done')   ← 违规

# 对：
重复小时添加 → 08:00 / 21:30 读回 → 分钟 30 读回
→ 生成 → 弹窗 28 行 → 弹窗「保存」
→ 表单 compact 28/08:00/21:30
→ 临时保存 → 下一个
→ 二次：再 open 读 compact
```

---

## Product identity

| Field | Value |
| --- | --- |
| Korean product | `상하이 시내 호텔 ↔ 마담 투소 상하이 단독 차량 편도 이동 서비스` |
| Internal / partner | `上海市区酒店-Madame Tussauds Shanghai Admission Ticket` |
| Dest short KO | `마담 투소 상하이` |
| Currency | HKD |
| Vehicles | 5 + 7 × 去/返 → **4 options** |
| Theme | `司机提供车辆` / `기사제공차량` |
| Travel type | `私人的` |
| Language | 韩语 |
| Images | 用户 3 张 → `upload-ready-images/tussauds/tussauds-{1,2,3}.jpg` |
| Draft id | `4f20f9a8-0e5a-48fd-942e-5ebd469cb68e` |

### Option names

1. `상하이 시내 호텔 출발 → 마담 투소 상하이 편도 이동 (5인승 차량)`
2. `… (7인승 차량)` 去程
3. `마담 투소 상하이 출발 → 상하이 시내 호텔 편도 이동 (5인승 차량)`
4. `… (7인승 차량)` 返程

### Price types (Korean only)

| Key | 名称 | 说明 |
| --- | --- | --- |
| 5go | `5인승 가는` | `5인승 차량` |
| 7go | `7인승 가는` | `7인승 차량` |
| 5rtn | `5인승 오는` | `5인승 차량` |
| 7rtn | `7인승 오는` | `7인승 차량` |

---

## Excel 售价（R39–42 公式求值，禁止另算）

| 选项 | 平日 HKD | 国庆/劳动 `10/1–10` & `5/1–10` | 春节 `2/1–15` |
| --- | --- | --- | --- |
| 5 座去/返 | **213**（`170/0.8`） | **304** | **425** |
| 7 座去程 | **250** | **357** | **510**（`E/0.7`） |
| 7 座返程 | **250** | **357** | **500**（`D/0.5`） |

- **7 去春节 510 ≠ 7 返春节 500** — 禁止对称抄。
- 验收：日历容器 **`1\n510`** / **`1\n500`**。

### Holiday windows

| 区间 | 5 座 | 7 去 | 7 返 |
| --- | --- | --- | --- |
| 平日 | 213 | 250 | 250 |
| `2026-10-01`～`10-10` | 304 | 357 | 357 |
| `2027-02-01`～`02-15` | 425 | **510** | **500** |
| `2027-05-01`～`05-10` | 304 | 357 | 357 |

Live verify (2026-08-06)：12/12 段 ok；春节点验 5=425、**7go=510**、**7rtn=500**。

---

## 详细操作：创建 → 属性 → 介绍 → 法规

### 1) 创建草稿

```text
新产品注册
→ 【禁止】列表搜索框
→ 弹窗产品名 = 韩文全称
→ TRANSPORTATION
→ 开始創建产品（简繁混写）
→ 记 id=
```

### 2) 属性（保存然后门禁）

```text
标题 / 内部名
→ 使用日指定 / 运输货物
→ 主题 기사제공차량 → 已选
→ 人数限制 是 · min1 max 按车
→ 私人的（可见 label，点一次）
→ 语言 韩语 → 已选
→ POI：杜莎夫人蜡像馆 / Madame Tussauds Shanghai
   上海结果 + 旅游地 + 添加
→ 等 保存然后 enabled → 点击
→ 禁止 goto introduction
```

### 3) 介绍

```text
韩文 headline / 3 行亮点 / 正文 / 须知 / 使用方法
→ scheduleType NONE
→ 썸네일 上传 tussauds-1/2/3.jpg **各一次**
→ 数缩略图 = 3；若 6 → 删底部 3，留代表
→ 保存然后
```

### 4) 法规 / 预约

```text
截单 3 天 · 数量 · 手动确认 3 天
→ 包含 onSave(values) 韩文
→ 代金券 예약정보로 확인 · 无需换货
→ 取消 手动 · windows.0 = 2日/0%（勿空白第二行）
→ 代表预约：
   开弹窗 → 滚到底露出行
   → 每个 required：label[for=id] mouse
   → 读 aria-checked
   → 已选
   → 页面摘要列出字段（空 = 失败重开）
→ 保存然后
```

---

## 详细操作：选项 ×4 + 时段（§40 全文）

### 建卡

```text
注册/添加选项 → name/desc/qty
→ 其他价格类型 → 韩文名 + 必须购买 + 代表价 → 完成
→ 重填选项名（会被覆盖）
→ 1年 → 平日价一次（213 或 250）
→ 时段（下）
→ 窄临时保存 → 宽下一个
→ 列表确认新卡
```

### 时段逐步（每卡必须完整）

```text
1  goto 干净 option 列表（同 draft id）
2  修改选项 nth(i)
3  wait #name 有值
4  设置时间 或 ⋯→编辑
5  删旧行
6  button「重复 小时 添加」
7  开始 08:00（左小时 右分钟）读回
8  结束 21:30（左 21 右 30）读回 —— 禁止 00:30
9  间隔 分钟 → 30 读回 —— 禁止未选
10 生成/一代 可点时再点
11 弹窗内 28 行
12 ★ 弹窗底部「保存」★
13 表单 时间段 compact = 28 / 08:00 / 21:30
14 临时保存 → 下一个
```

四卡完成后 **二次验收**：再 open 0..3 读 compact。

---

## 详细操作：假日日历

```text
for oi in 0..3:
  for seg in [oct 10/1-10 304|357, spring 2/1-15 425|510|500, may 5/1-10 304|357]:
    Escape / 消除 / goto list
    确认 4×销售日历管理
    nth(oi) scrollIntoView + mouse（第4卡必滚）
    等 caption（如 8 月 2026）
    选择单个日期 → 翻月 → 点日 → 请输入价格 → 完成
```

验收：`readDayPrice` 容器 `日\n价`；7go 2/1→**510**；7rtn 2/1→**500**。

---

## Automation scripts

| Path | Role |
| --- | --- |
| `nol-listing-automation/list-tussauds.mjs` | 分 phase 上架 |
| `nol-listing-automation/fix-tussauds-holidays.mjs` | 假日 12 段 + 510/500 验收；exit≠0 若 verify fail |

**硬编码：** times 路径 `count < 28` 时 **不得** `process.exit(0)`。

---

## Fast path / Stop

```text
0. Excel R39–42 → PRICES（510/500）
1. 创建（勿搜索框）→ 属性齐 保存然后
2. 介绍 3 图 → 法规 预约摘要 → 保存然后
3. 四卡落列表
4. 时段×4：§40 全步含弹窗保存 → 二次 compact
5. 假日 listClean×12 → 格子 510/500
6. 页底临时保存 → STOP 列表 → 永不提交审核
```

汇报必须写：未点批准；时段二次 28；假日 7 去 **510** / 7 返 **500**。
