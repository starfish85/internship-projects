---
name: nol-domestic-ticket-listing-helper
description: Assist with NOL domestic attraction ticket listings, including Korean-facing product copy, ticket/pass categories, age-based ticket types, supplier-based admission and redemption rules, child-sale restrictions, inventory-cost pricing, reservation fields, and review checks. Use when the user lists Chinese domestic scenic spot tickets, theme park tickets, admission tickets, passes, or voucher products.
---

# NOL Domestic Ticket Listing Helper

Use this skill for NOL **domestic attraction ticket** products only. Do **not** reuse private-car transfer skill defaults (vehicles, pickup times, luggage, hotel transfer copy, `기사제공차량`, etc.).

**Primary batch source (learn and unify from):**  
`~/Downloads/NOL 待上架产品 (1).xlsx` → sheet **`国内景区门票`**  
(Also accept `NOL 待上架产品.xlsx` with the same sheet name when present.)

Source priority: **user Excel batch** > visible supplier-chain page/screenshot > older skill examples. If sources conflict, follow the higher-priority source and state the conflict.

---

## Absolute Safety Stops

- **Never** click approval/submission (`批准請求` / `提交審核` / `승인요청`, etc.) during listing work.
- Phrases like “上架 / 做完 / 保存 / 提交 / 批准 / 按 skill 操作” do **not** authorize approval click.
- If an approval confirmation dialog appears by mistake: stop; only cancel/close if unambiguous; never confirm.
- After option cards are visible on step 4 **`選項管理`**, **stop**. Do not click page-level black `臨時存儲` unless the user explicitly asks in that turn; default handoff is human review. Identify `臨時存儲` by **exact text**, never by coordinates next to `批准請求`.
- Ticket products only — **never** reuse transfer defaults (`기사제공차량`, 私人的-as-required, 行李/航班/酒店接送文案, 去返×车型 option pattern).
- **⛔ 文字定位 + 真选中验收（门票 live 硬规则）：**  
  **定位半边 + 验收半边，缺一不可。**  
  1. **文字/元素定位：** 一切点击/填表 **必须** 用可见文案、role、name、placeholder、`label[for]`、`#id`、`input[name]`、`getByRole` / `getByText` / `locator(...).filter({ hasText })`。  
     **禁止** `page.mouse.click(x,y)`、`getBoundingClientRect`→坐标点击、写死 x/y。  
     含：创建通票、主题/语言、负责人、POI、预约、价格类型、销售期/日历价、时段时钟分钟（若出现）、假日日格、临时保存/下一个/保存然后——**一律元素/文字**。  
  2. **真选中验收：** 任何点击的完成条件 = **DOM 读回达标**（不是 click resolve、不是 log 写了 click、不是「看起来点了」）。  
     固定四步：**文字定位 → 点前读状态 → 点一次 → 点后 ≤3s 读回**。  
     **无对应验收字段 = 禁止下一步、禁止对用户说「已选中 / 已做好」。**  
     失败：**当场报读回** → 可见改路径最多 **2** 次（**禁止 silent 重试**）→ 仍败则 **停并报失败**。  
     分类验收表：属性勾选（含私人的若出现）· 预约 · 时钟分钟 · 时段 · 假日 — 见下方 **「真选中验收表」** 与 **优先级卡点**。
- **⛔ 先保存再退出：** 选项表单改完必须 **`临时保存` → `下一个`**（繁体 `臨時存儲` → `下個`）再回列表；时段/包含/价格类型弹窗必须先点弹窗 **`保存`/`完成`**；属性/介绍/法规必须 **`保存然后` enabled 后点击** 再跨步。出现「有变化…确定要离开吗？」= 未保存 → 点 **消除** → 补存；**禁止点确定** 丢改。
- **⛔ 禁止因单字段/单步失败而整页刷新或整流程重填（用户 2026-08-11；与「先保存再退出」「逐步验收」并列）：**  
  **单点失败 ≠ 整页重来。**  
  1. **默认恢复 = 定点修补：** 只修当前缺项 + **DOM 读回**；**禁止** `page.reload()` / 整页 `goto` 重开属性/介绍/法规「从头再填」碰运气。  
  2. **已填字段是资产：** 主题 / 私人的（若有）/ POI / 图 / 文案 / 预约 / 选项价等，**未用户当轮明确确认禁止清空或整页重填**。  
  3. **`保存然后` 仍灰：** 先枚举页上红字/缺项 → **逐项补** → 再点；**禁止** 刷新碰运气。  
  4. **离开窗：** 点 **消除** 后补存；**禁止** 点确定丢改；**禁止** 未保存就 `goto` 离开。  
  5. **整页重载白名单（仅此可 reload/整页 goto 重置）：** 白屏 / 掉登录 / **用户明确要求**；脚本 **默认禁止** `reload`。  
  6. 失败时：当场报读回 → 定点改路径 ≤2 次 → 仍败 **停报**；**禁止** 用「整流程重跑 attrs+intro+…」掩盖单字段 FAIL。
- **⛔ 成功必须沉淀 / 下次必须复用（用户 2026-08-11；与接送 skill 时段唯一实现 §40、POI §56、逐步验收 §55 并列）：**  
  **PASS 不落盘 = 不算可复用成功；动手前不声明入口 = 禁止开干。**  
  1. **任一步 DOM 验收 PASS 后，须在同轮写入** 本 skill **「已验证路径」** 专节 **或** `nol-listing-automation/lib/` **唯一实现**（改现有函数，不新建平行文件）；**未写入不得声称可复用** / 不得对用户说「以后都能用这套」。  
  2. **新产品动手前必须声明复用入口**（文件路径 / 本节标题 / 函数名）；**禁止** 即兴第二套 click 序列、`*-v2.mjs`、silent 手搓。  
  3. **失败：** 改 **唯一实现**（skill 路径表或 lib）再跑；**禁止** silent 重试碰运气 / 同失败路径闷头试 10 次。  
  4. **数据（价 / 名 / 图 / 选项文案）永远跟当单 Excel**；只复用 **流程与选择器**，**禁止** 复用错价、错 POI、错选项名。  
  5. 与 **定点修补**、**逐步验收**、**真选中** 联用：定点修的是 **唯一实现**，不是另起炉灶。
- **⛔ 售价列优先 · 禁止把「加价逻辑」当售价（用户 2026-08-11 · 黄浦江 152.33≠190 事故）：**  
  **国内景区门票表列语义（硬）：**  
  | 列（常见） | 表头 | 含义 | 能否写入 NOL 日历 |
  | --- | --- | --- | --- |
  | D | **加价逻辑** | 成本/基数/加价底数（如 152.33） | **禁止** 当客户售价 |
  | E | **售价hkd** | 客户售价；常为公式 `=D/0.8` 等 | **唯一** 写入源 |
  1. **只填「售价hkd」列** 求值后的数字进 NOL 日历 / 选项价；**禁止** 把「加价逻辑」数字原样当售价（黄浦江错例：写 152.33，正确 **190**）。  
  2. **E 列为公式时：** 必须 **求值/计算** 后再填（如 `152.33/0.8 → 190.4125`；用户截图或习惯取整 **190** 时以用户/表显示为准）；**禁止** 因 skill 旧句「不要 /0.8」而改填 D 列。  
  3. **「禁止默认 /0.8」含义（纠正后）：** 禁止在 **没有** 售价列公式、**没有** 用户当轮公式时，自己拿成本乱除 0.8 发明售价；**不禁止** 执行 Excel **已写在售价列里的** 公式。  
  4. 动手前汇报须写清：`【售价来源】列=售价hkd 值=…（加价逻辑=… 未用作售价）`。  
  5. 日历 DOM 读回必须 = 上述售价；读回仍是加价逻辑数 = **FAIL**，定点改价。  
  详见 **Pricing Rules** + 卡点 **0h / 7** + 表 E。
- **⛔ 禁止假成功用语：** 「已点过」「click 返回 true」「log 有 click」**≠** 选中。未附 DOM 读回值时 **禁止** 说已选中/已做好。**未写入已验证路径/lib 时禁止说「可复用」。****未核「售价hkd」列却写价 = 假成功。**
- **⛔ Live 运行节奏（门票 · 五条硬规则，缺一不可）：**  
  1. **单 CDP、先杀残留，再操作浏览器** — 同时只允许 **1** 个 Playwright/CDP 脚本；操作前 kill 残留 `node …list-*|fix-*|create-*|huangpu|ticket|pearl|…`；有残留禁止抢同一 tab。  
  2. **短步骤 + 每步验收** — **一批 = 一步**（一控件/一读回门禁）；每步必有对用户 **`【将要】` + `【结果】+读回`**；**禁止** silent 长脚本闷头跑（含「一次 all 跑 20 分钟」）；**禁止** 单步 FAIL 后整页刷新/整流程重填（见上条定点修补）；**禁止** silent 重试碰运气（失败改唯一实现）。  
  3. **禁止过窄 viewport** — 连接用户 Chrome 时 **默认不** `setViewportSize`；若必须设仅 **`1440×900` 或 `1512×982`** 且整次会话最多一次；**禁止** width `<1440`、zoom、mobile emulation；`window.innerWidth < 1280` → **先报异常再点**（过窄 = 点不中 = 死等）。  
  4. **脚本：明确 timeout + 失败 exit** — 所有 `goto` / `waitFor*` / `click` / `locator.waitFor` **必须** 带明确 `timeout`；入口可 `setDefaultTimeout(30000)`；**禁止** 无 timeout 的无限 `waitFor`；验收 FAIL → 打印读回 + **`process.exit(2)`**（**禁止** FAIL 仍 `exit(0)`）。  
  5. **代理汇报门禁（N=2 分钟）：** 自上次对用户**中文**可见汇报起 **超过 N 分钟无进度** → **视为违规 → 立即中断**（kill 当前批）→ 汇报原因与最后 DOM → **拆更短步重来**（定点修补唯一实现，**禁止** silent 整页 reload / 即兴第二套）；默认 **N = 2**；**禁止** 默许 10～20 分钟无中文输出。详见下方 **「Live 运行节奏专节」**。

---

## ⚡ 执行优先级卡点（门票 · 先看这里再动手）

任一未过 = **禁止**进入下一阶段 / **禁止**向用户报「已做好」。

| 序 | 卡点 | 最短真验收（DOM 读回） |
| --- | --- | --- |
| 0a | **⛔ 单 CDP · 先杀残留** | 操作前 kill 残留 node CDP；同时只 1 个 Playwright；有残留禁止开点 |
| 0b | **⛔ 短步 + 每步验收** | **一批一步**；每步 `【将要】→【结果】+读回`；禁止 silent 长跑 / 一次脚本闷 20 分钟 |
| 0c | **⛔ 视口不压窄** | 默认不 setViewport；若设 ≥1440 宽；`innerWidth<1280` 停报不点 |
| 0d | **⛔ timeout + 失败 exit** | 所有 wait/goto/click 有 timeout；FAIL → `exit≠0`；禁无限 waitFor |
| 0e | **⛔ N 分钟无汇报 = 违规中断重来** | 默认 **N=2**；>N 分钟无中文进度 → kill → 拆步重来（定点修补，禁整页 reload） |
| 0f | **⛔ 定点修补 · 禁整页刷新重填** | 单字段/单步 FAIL → **只修缺项 + DOM 读回**；禁 `reload`/整页 goto 重开属性·介绍；已填为主题/POI/图/文案/预约/价等资产；`保存然后` 灰 → 枚举红字逐项补；离开窗 **消除** 后补存；仅白屏/掉登录/用户明确要求可整页重载 |
| 0g | **⛔ 成功沉淀 / 下次复用** | PASS 后同轮写入 **「已验证路径」或 lib 唯一实现**；未写入禁止声称可复用；**新产品动手前声明复用入口**（文件/§/函数）；失败改唯一实现再跑，禁 silent 重试/即兴第二套；**价/名/图跟当单 Excel**，只复用流程 |
| 0h | **⛔ 售价=售价hkd 列 · 非加价逻辑** | 读表：**售价hkd**（可含 `=D/0.8` 求值）→ NOL；**禁止** 填「加价逻辑」基数；动手前报 `【售价来源】`；日历读回=售价列结果（黄浦江：190 对 152.33） |
| 0 | **⛔ 文字定位 + 真选中**（点≠选中） | 每步 `【将要】→【元素定位】→【读回值】→【结果】`；无读回禁止下一步/禁止说已选中；失败停报 |
| 1 | **属性勾选（表 A）** | 主题/语言 sheet → **已选** 后页摘要有文案；人数限制 **否** `checked`；若出现私人的 → 按门票规则读回（默认 **不** 当运输必勾）；`保存然后` 非仅因该项仍灰 |
| 2 | **预约（表 B）** | `label[for]` 点后 **逐项 checked===true** → **已选** → **页面摘要非空**（A/B 含护照+英文名按数量） |
| 3 | **时钟 + 分钟（表 C）** | **仅当**选项/弹窗出现时钟 UI 时适用；起止钮文案目标时刻；exact **「分钟」+ option 30**；**一代/生成 `disabled===false`** 再点 |
| 4 | **时段整体（表 D）** | 场次产品：两选项名含场次窗且列表可见；若有「时间段」compact 则读 compact 达标；弹窗保存后再读；未过禁下一个 |
| 5 | **假日/日历价（表 E）** | 销售期/日历 **价** 读容器或单元格（非仅 list 卡片）；段内首/中/末有价且 = Excel **售价hkd 求值**；只末日有价 = FAIL |
| 6 | **假成功禁语** | 「已点过」/ click true / 无读回 ≠ 完成；只信 DOM |
| 7 | **售价粘贴（列语义）** | 只贴 **售价hkd** 求值结果；**禁** 贴加价逻辑；E 有公式则求值后贴；**禁** 无公式时自创 `/0.8`；读回日历=该数 |
| 8 | **保存然后门禁** | 主题+语言+POI+预约摘要等读回通过后，`保存然后` **enabled** 再点；禁止跨步 URL 捷径 |
| 9 | **停选项列表** | 选项卡齐全后停 `選項管理`；**永不**提交审核/批准 |

**操作模板（每控件）：**

```text
【将要】… → 【元素定位】文案/role/label/id …
  → 点前读状态（已 true 禁止再点）
  → 点一次
  → 【读回值】checked=… / 文案=… / 摘要=… / 价=… / disabled=…
  → 【结果】PASS | FAIL（FAIL → 停报，禁止说已选中）
```

---

## ⛔ 真选中验收表（门票 · 点 ≠ 选中）

**总则（硬规则一句）：**  
**任何点击必须以 DOM 读回为完成条件；无验收字段禁止下一步、禁止对用户说已选中。**

### 固定四步（缺一不可）

| 步 | 动作 | 说明 |
| --- | --- | --- |
| a | **文字定位** | 仅文案 / role / name / id / label / placeholder（**禁止坐标**） |
| b | **点前读状态** | 已 `true` / 已显示目标文案 → **禁止再点**（防取消） |
| c | **点一次** | `locator.click()`；同文案多钮用 `filter` + `nth` + 必要时宽窄筛选（宽窄只筛，不拿 x/y 去 mouse 点） |
| d | **点后 ≤3s DOM 读回** | 写入 log + 对用户 `【结果】+读回值`；失败当场报；可见重试 ≤2；仍败 **停并报失败** |

### 表 A · 属性勾选（主题 / 语言 / 人数 / 私人的若出现）

> 门票默认 **通票 `TICKET_PASS`**，**不是** 交通。运输 skill 的「必须私人的 + 기사제공차량」**不适用**。

| 控件 | 定位 | DOM 真选中读回 | 失败停报 |
| --- | --- | --- | --- |
| **产品类型 通票** | 创建弹窗 `input[value=TICKET_PASS]` / 文案「通票」 | `checked===true`；创建后属性页类型为通票/门票向 | 误选「交通」 |
| **主题** | `选择类别（主题）` → 精确行（景区：旅游地/观景台等；乐园：主题公园）→ **已选** | 属性页摘要出现主题文案；非仍红字「请选择类别」 | 摘要空 / 仍红字 |
| **语言 韩语** | `选择语言` → exact **`^韩语$`/`^韓語$`**（**禁止**点「仅限韩语用户」国籍项）→ **已选** | 页摘要出现韩语 | 点错国籍 / 摘要无韩语 |
| **人数限制** | `input[name=isPassengerLimit][value="0"]` 或文案 **否** | `checked===true` 为 **否**（门票默认） | 误成「是」且无供应商要求 |
| **私人的（若表单出现）** | 可见 label `私人的` / `tourTypes` | **读回 `checked` 实际值**；门票 **勿** 按接送默认强勾；未读回禁止说「已选私人的」 | 未读回却报已选；或误当运输必填 |
| **负责人/联系人** | 文案 `选择联系人` → 选人 → **已选** | 页上联系人姓名非空 | 仍「请选择其他负责人」 |
| **POI** | 添加地区和地点 → 搜+Enter → filter 城/官方名（**禁止默认第 1 条**）→ 旅游地 → 添加 | 已选卡 **完整文案** 含目标城+景点关键词 | 错城/酒店/空卡 |

### 表 B · 预约（代表预约信息）

| 步 | 定位 | DOM 真选中读回 | 失败停报 |
| --- | --- | --- | --- |
| 打开弹窗 | 文案点代表预约入口 | action-sheet / 弹窗可见 | 未开窗 |
| 每一 required 项 | `scrollIntoViewIfNeeded` + **`label[for=id]`** | 该项 **`checked===true` 或 `aria-checked===true`**（点前 true **禁止再点**） | 该项仍 false |
| Family A/B 身份 | 电话+邮箱（代表）+ **按数量** 英文姓/名 + 护照号 | 对应 id 均 true | 只勾代表未勾按数量 |
| Family C | 通常电话+邮箱；护照按 Excel | 与族矩阵一致 | 误强制护照或漏开 |
| 全项勾齐后 | 文案 **`已选`/`已選`** | **页面摘要非空**（电话/邮箱/姓名/护照…） | 摘要空 = 未写入 |
| 禁项 | 酒店/航班/接送/行李 | 摘要中 **无** 运输类字段（门票） | 误开接送预约 |

### 表 C · 时钟开始/结束 + 分钟间隔

> **适用范围：** 仅当门票选项表单/弹窗 **实际出现**「设置时间 / 重复小时 / 时钟 / 分钟」UI 时。  
> 多数门票场次用 **选项名写时间窗** + 销售日历，**无** 接送式 28 格时段——无 UI 则本表 **N/A**，不得空跑。

| 控件 | 定位 | DOM 真选中读回 | 失败停报 |
| --- | --- | --- | --- |
| **开始时钟** | 文案/role 起止「选择」钮；点后 option 时:分 | 该钮文案含目标开始（如 `08:00`） | 仍显示「选择」 |
| **结束时钟** | 开始填完后的正确 nth（勿重复点 nth(0)） | 该钮文案含目标结束（如 `21:30`） | `21:00`/`00:30`/仍「选择」 |
| **分钟间隔** | exact **`/^分钟$/`** 或「分鐘」→ role=option **`/^30$/`** | 间隔为 30；**不得**只点「分钟」字样 | 未点 option 30 |
| **一代门禁** | 文案 `一代`/`生成`/`생성` | **`disabled===false`** 再点 | 仍灰却硬点 |

### 表 D · 时段 / 场次整体

| 场景 | 定位 / 动作 | DOM 真选中读回 | 失败停报 |
| --- | --- | --- | --- |
| **Family A 场次选项** | 注册/添加选项 ×2；名称含上午/下午（或日/夜）窗 | 列表可见 **两卡** 且名称含 Excel 时间窗 | 只 1 卡 / 名称无场次 |
| **介绍 schedule** | `scheduleType` **NONE** /「没有单独的时间表」 | 对应 radio `checked`；场次不靠课程表 | 误设课程时间表 |
| **若有时间段 compact** | 生成 → 弹窗底 **保存**（非页底临时保存） | compact 行 count/first/last 达标 | compact 0 仍说已设 |
| **选项落卡** | **临时保存 → 下一个** | 列表 `修改选项` 增加或卡名可见 | 离开窗丢改 / 无卡 |
| **禁** | 用整页 `HH:MM` regex 冒充 | — | 违规假成功 |

### 表 E · 假日 / 销售日历价

| 步 | 定位 | DOM 真选中读回 | 失败停报 |
| --- | --- | --- | --- |
| 销售期 | 文案/ radio `1年` / `ONE_YEAR` 等 | 对应选中；价输入可填 | 期未选价仍灰 |
| **定售价（先列后数）** | 打开当行 Excel：定位 **售价hkd** 列（常见 E），**不要** 加价逻辑列（常见 D） | 汇报 `【售价来源】售价hkd=…（加价逻辑=…未用）` | 未声明列就填价 |
| 填售价 | placeholder 价格类 input **填一次** | `inputValue` 或日历格 = **售价hkd 求值结果** | 写成加价逻辑数（如 152.33 而非 190）；无公式却自创 `/0.8` |
| 若多选日历段 | 文案开日历 → **元素** 逐日 `PlainDayButton`（禁坐标、禁 evaluate 批量）→ 填价 → **完成** | 容器 **`日\n价`** 首/中/末 = **售价列**结果 | 只末日有价；价=D 列 |
| 列表卡 | — | **不足** 以卡片价为唯一验收；须读格/容器 | 只看卡报 done |

### 禁止的假成功用语（出现即违规）

- 「**已点过** xxx」/「**已选中**」但无 DOM 读回  
- 「**click 返回 true**」/ Playwright resolve 即当成功  
- log 有 click **无** checked / 文案 / 摘要 / 日历价 / 一代 enabled  
- 「主题/语言/预约已设」但页上仍红字或 `保存然后` 仍灰  
- 未过表 B 摘要却说「护照已勾」

### 失败策略（硬）

```text
读回不达标
  → 【结果】FAIL + 当场打印读回值（禁止 silent）
  → 定点修补：只改当前缺项/路径（仍四步 + 【将要】）
  → 可见重试最多 2 次
  → 仍败：停报 FAIL
  → 禁止下一步 / 禁止对用户说已选中
  → 禁止 process.exit(0) 掩盖
  → 禁止 page.reload / 整页 goto 重开属性·介绍·整流程重填
  → 禁止未用户确认清空已填资产（主题/POI/图/文案/预约/选项价…）
  → 保存然后仍灰：枚举红字 → 逐项补 → 再点（禁止刷新碰运气）
  → 失败改 skill「已验证路径」或 lib 唯一实现再跑（禁止 silent 重试 / 即兴第二套）
  → PASS 后同轮写入已验证路径或 lib；未写入禁止声称可复用
```

---

## ⛔ 成功必须沉淀 / 下次必须复用（门票 · 与接送 §40 时段 / §56 POI / §55 逐步验收并列）

**总则（硬规则一句）：**  
**DOM 验收 PASS → 同轮写入「已验证路径」或 lib 唯一实现；下次只调该入口；数据永远跟当单 Excel。**

### 硬规则表

| # | 规则 | 要求 |
| --- | --- | --- |
| 1 | **PASS → 沉淀** | 任一步真选中 **PASS** 后，**同轮**更新下方 **「已验证路径」** 或 `nol-listing-automation/lib/*` **唯一**函数；只改 ad-hoc 脚本 / 口头说「下次用这套」**不算** |
| 2 | **未写入 = 不可复用** | 未落 skill/lib **禁止** 对用户说「已可复用 / 固定流程好了」 |
| 3 | **动手前声明入口** | 新产品 live 第一句须声明：`复用：<文件> / 本节标题 / 函数名`；**禁止** 即兴第二套 click、`list-xxx2.mjs` 平行实现 |
| 4 | **失败改唯一实现** | FAIL → 报读回 → **改** 已声明的路径表或 lib → 再跑；**禁止** silent 重试碰运气 |
| 5 | **只复用流程** | 价 / 选项名 / 图 / 韩文案 / 场次窗 **当单 Excel 售价hkd**；禁止抄上单价；禁止把加价逻辑当售价 |

### 共享 lib（门票 live 优先 import，禁止重写）

| 能力 | 唯一实现 | 说明 |
| --- | --- | --- |
| CDP 连接 / 杀残留 / 视口 | `nol-listing-automation/lib/cdp-session.mjs` → `connectNolPage` / `killPeerCdpScripts` | 与接送同源；门票脚本 **import**，勿自写 connect |
| POI 保存然后前验收 | `nol-listing-automation/lib/poi-gate.mjs` → `assertPoiGateBeforeSaveThen` 等 | 与接送 §56 同源；门票属性步必用 |
| 中国接送式 28 格时段 | `lib/set-times-china.mjs` | **仅当** 门票选项 UI **真出现**「设置时间」时钟时；Family A 多数用 **选项名写场次** → 本表 **N/A**，不得空跑 |
| 门票产品脚本壳 | `list-huangpu-cruise-ticket.mjs` 等 | 产品数据在脚本常量；**流程**须回写本 skill「已验证路径」，逐步抽 lib |

### 与并列条款

| 条款 | 关系 |
| --- | --- |
| 接送 §40 时段唯一实现 | **同律**：只许一个实现；FAIL 改 lib 再跑；禁第二套 |
| 接送 §56 POI | **同律**：`poi-gate.mjs` 唯一；门票属性同样调用 |
| 接送 §55 逐步验收 | **同律**：每步【将要】/【结果】+读回；禁 silent 重试 |
| 本 skill 定点修补 0f | 修的是 **唯一路径/lib**，不是整页重填 + 另起炉灶 |

---

## 已验证路径（门票 · 流程复用；数据跟当单 Excel）

> **写入约定：** 每条路径须含：定位方式 · 读回字段 · PASS 条件 · 日期/产品。  
> **未写本表 / 未进 lib = 不得声称可复用。**  
> **价/名/图永远改成当单 Excel，只抄步骤。**

### P0 · Live 清场与连接（共享）

```text
复用：lib/cdp-session.mjs → connectNolPage({ killPeers: true })
1. kill 残留 node …list-|fix-|create-|huangpu|ticket|…
2. connectOverCDP :9222 → 取 tour.triple.partners page → bringToFront
3. 默认不 setViewport；innerWidth<1280 → FAIL 停
4. setDefaultTimeout(30000) / navigation 60000
读回：仅 1 个 Playwright；innerWidth≥1280
```

### P1 · 产品类型 通票（创建弹窗）

```text
定位：input[value=TICKET_PASS] 或文案「通票」
读回：checked===true；创建后属性页非「交通」
禁：误选 TRANSPORTATION / 交通
```

### P2 · 主题 / 语言 / 人数（表 A）

```text
主题：选择类别（主题）→ 精确行（景区旅游地/观景台；乐园主题公园）→ 已选
  读回：页摘要有主题文案；非红字「请选择类别」
语言：exact ^韩语$ / ^韓語$ → 已选（禁「仅限韩语用户」）
  读回：摘要有韩语
人数：input[name=isPassengerLimit][value="0"] 或文案「否」
  读回：checked===true（门票默认否）
私人的：若出现 → 读回实际 checked；门票勿按接送默认强勾
```

### P3 · POI（表 A + lib）

```text
复用：lib/poi-gate.mjs → assertPoiGateBeforeSaveThen(page, { productKo, internal })
1. 添加地区和地点 → 搜+Enter → filter 城/官方名（禁默认第1条）→ 旅游地 → 添加
2. 读回完整卡文案 × 关键词交叉
3. 通过后才可点 保存然后；未过禁 goto 介绍
汇报：【结果】POI读回=… 关键词匹配=通过
```

### P4 · 预约 Family A/B（表 B）

```text
1. 打开代表预约 → action-sheet 可见
2. 每项：scrollIntoViewIfNeeded + label[for=id] 点一次
   Family A/B：代表 电话+邮箱；按数量 英文姓/名+护照号
3. 点前 true 禁止再点；点后 checked/aria-checked===true
4. 已选 → 页面摘要非空（含护照/英文名）
禁：酒店/航班/接送/行李（门票）
```

### P5 · 凭证 / voucher（法规 · 黄浦江 live 2026-08-11）

```text
定位：凭证区卡片/文案（预约信息确认 · 无需换货 等）
  优先：可见卡片 click（软 warning 可保留）
读回：hasVoucher / 选中态 true；保存然后可因该项解除禁用
禁：只改 DOM 不点 UI；未读回说「凭证已设」
注：与 intro「7 日邮件」软 warning 可并存（delivery timing ≠ SLA）
```

### P6 · 选项 · 销售期 ONE_YEAR + 售价 as-is（表 E）

```text
前置：价格类型已代表价可见；#name 已填
1. input[value=ONE_YEAR] 或文案 exact「1年」→ checked===true
2. 读回 from/to 或 设置된 销售期间 形如 起~止（约 +1 年）
3. placeholder 请输入价格 → fill **当单 Excel「售价hkd」列**（非「加价逻辑」列）
4. 读回：inputValue=售价；日历区当单价出现多次 / 首中末有价
禁：把 D 列成本/基数当售价；抄上单价格到新产品
黄浦江（Excel 12 · 国内景区门票 R25–26 · 纠正 2026-08-11）：
  D 加价逻辑=152.33；E 售价=D/0.8 → **190**（勿写 152.33）
```

### P7 · 选项 · 包含 设施入场费（弹窗）

```text
1. 按钮「添加 填写」打开
2. label[for=inclusions_FACILITY_ADMISSION_FEE] 或文案 设施入场费
3. 读回：#inclusions_FACILITY_ADMISSION_FEE checked/aria-checked===true
4. 排除韩文：개인 경비 + 포함 사항에 명시되지 않은 기타 비용（若有字段）
5. 弹窗 保存/完成
读回：选项页「包含和不包含사항을 입력해 주세요」红字消失或摘要有入场/시설
```

### P8 · 选项 · 临时保存 → 下一个（落卡）

```text
定位：button 文案 exact 临时保存/臨時存儲（取较窄表单 footer，非页底提交旁宽钮）
     → 下一个/下個（enabled 且较宽）
读回：#name 离开 option-form 或列表出现选项韩文名 / 修改选项 count+1
禁：未 enabled 硬点；未保存 goto；离开窗点确定
注：仍灰时先枚举红字（价格类型/包含/售价）定点补，禁止 reload
```

### P7b · 包含弹窗保存（黄浦江 live 2026-08-11 · PASS · 补强 P7）

```text
1. 「添加 填写」打开
2. label[for=inclusions_FACILITY_ADMISSION_FEE]（文案可为 시설 입장료）
3. 读回 checked===true；可填 description 유람선 승선권
4. 弹窗底 exact「保存」.click()（非表单临时保存）
5. 读回：红字「包含和不包含사항을…」消失；摘要含 包括 시설 입장료
未点弹窗保存 = 临时保存仍灰（即使 facility 已勾）
```

### P9 · Family A 双选项（黄浦江 draft `b2aabbb6-…` · 2026-08-11 PASS）

```text
流程：P10 → P7b → P6 → P8 ×2（日/夜或上午/下午）
数据（当单 Excel，勿抄他单）：
  주간 유람선 티켓 (18:00 이전 출항) · **190**（售价=加价逻辑152.33/0.8；禁写152.33）
  야간 유람선 티켓 (18:00 이후 출항) · **190**
列表验收：修改选项 count===2；两卡 销售中；日历价=当单售价列
注意：中文 UI 可能把 주간 显示成「每周」、이전 显示成「上一步」——以修改选项数+18:00+유람선 为准，勿仅用 includes('주간')
停：選項管理；永不提交审核
```

### P10 · 价格类型 · 按年龄 ADULT（黄浦江 live 2026-08-11 · PASS）

```text
定位：选择价格类型 → #AGE-tab
     → label exact「成人」→ 读 input#uuid checked===true 且 aria-checked===true
     → 名称可保留「成人」
     → **必填说明**：input placeholder 含「例) 滿 19 / 19」→ fill「성인 전용 · 만 19세 이상」
       （未填说明 = 红字「请输入价格类型的说明」+「完成」disabled — 黄浦江根因）
     → 最小 tel=1（最大可 20 或空）
     → 完成（disabled===false 再点）
读回：仍Need「请设置价格类型」=false；页上有 代表价/成人
```

### 新产品开场模板（强制）

```text
【复用入口】
- CDP：lib/cdp-session.mjs#connectNolPage
- POI：lib/poi-gate.mjs#assertPoiGateBeforeSaveThen
- 流程：门票 skill「已验证路径」P0–P9（及本单适用 P10）
- 数据：当单 Excel 国内景区门票 行（**售价hkd 求值**/名/图/场次）— 不复用上单价
- 【售价来源】售价hkd=…（加价逻辑=… 未用作售价）
【将要】第 1 步 …
```

---

## ⛔ Live 运行节奏专节（门票 · 单 CDP / 短步 / 视口 / timeout / 汇报门禁）

**总则（硬规则一句）：**  
**先清场再点；一批一步；视口不压窄；有超时能失败；超过 N 分钟无中文汇报 → 违规中断并拆步重来。**

### 1. 单 CDP · 先杀残留再操作

```text
操作浏览器前：
  pgrep / ps 查 node … (list-|fix-|create-|huangpu|ticket|pearl|tussaud|popmart|…)
  → 有残留：kill（勿并行）
  → 再 connectOverCDP('http://127.0.0.1:9222')
同时只允许 1 个 Playwright CDP 脚本。
收到 delayed「task completed」：先读当前 DOM，勿盲信旧 exit 0。
```

可选 helper（若仓库有）：`nol-listing-automation/lib/cdp-session.mjs` → `killPeerCdpScripts` / `connectNolPage({ killPeers: true })`。

### 2. 短步骤 + 每步验收（禁 silent 长跑）

| 允许 | 禁止 |
| --- | --- |
| **一批 = 一步**（一勾选 / 一 sheet 已选 / 一选项落卡） | `node list-*.mjs all` 闷跑属性+介绍+法规+选项 10～20 分钟 |
| 每步对用户 `【将要】→【结果】+读回` | 无中文 stdout 的后台闷头 |
| 失败立刻 exit≠0 并报读回 | silent 重试 / 失败仍下一段 |
| 整产品 = **多批串起**；PASS 后立刻下一批 | 一次脚本「做完再说」 |
| **定点修补** 当前缺项 + DOM 读回 | 单字段 FAIL → `reload` / 整页 goto 重开属性·介绍·整流程重填 |
| **改唯一实现再跑** | silent 重试 / 即兴第二套 click / 未声明入口就开干 |
| **PASS 后写入已验证路径或 lib** | 口头「可复用」但 skill/lib 未更新 |

### 2b. 定点修补 · 禁整页刷新重填（与先保存再退出、逐步验收并列）

| 规则 | 要求 |
| --- | --- |
| 默认恢复 | **只修当前缺项**；保持已填 DOM；再读回 |
| 已填资产 | 主题 / 私人的（若有）/ POI / 图 / 文案 / 预约 / 选项价 — **未用户确认禁止清空或整页重填** |
| `保存然后` 仍灰 | **枚举红字缺项 → 逐项补 → 再点**；禁止刷新碰运气 |
| 离开窗 | **消除** → 补存；禁止确定丢改；禁止未保存 `goto` |
| `reload` / 整页重置 | **默认禁止**；仅 **白屏 / 掉登录 / 用户明确要求** |
| 脚本 | 默认 **禁止** `page.reload()`；单步 FAIL 不得 `goto` 属性/介绍入口「从头再来」 |

### 2c. 成功沉淀 / 下次复用（与 §40 / §56 / §55 并列）

| 规则 | 要求 |
| --- | --- |
| PASS 后 | **同轮**写 **「已验证路径」** 或 lib 唯一函数 |
| 动手前 | 声明 `复用：文件/本节/函数`；**禁止** 第二套 |
| FAIL | 改唯一实现 + 可见【将要】再跑；**禁止** silent 重试碰运气 |
| 数据 | 价/名/图 **当单 Excel**；只复用流程 |

### 3. 禁止过窄 viewport（避免点不中死等）

| 规则 | 要求 |
| --- | --- |
| 连接用户 Chrome | **默认不要** `page.setViewportSize` |
| 若必须设 | 仅 `{1440,900}` 或 `{1512,982}`；整次会话 **最多 1 次** |
| 禁止 | width `<1440`（含 1280×720）、zoom、mobile emulation、每步重设 viewport |
| 操作前 | 可读 `window.innerWidth`；**`<1280` → FAIL 停，禁止继续点** |
| 过窄后果 | footer/弹窗/第 4 卡被裁 → 点不中 → wait 挂死 → 像「卡死 20 分钟」 |

### 4. 脚本 timeout + 失败 exit

| 规则 | 写法 |
| --- | --- |
| `page.goto` | `{ timeout: 45000～60000 }`（禁止无限） |
| `waitFor*` / `locator.waitFor` | **必须** 传 `timeout`（建议 5～30s） |
| 默认 | 入口 `page.setDefaultTimeout(30000)` / `setDefaultNavigationTimeout(60000)` |
| 禁止 | 无 timeout 的 `waitForFunction` 死等；用超长 `waitForTimeout` 当逻辑门 |
| 失败 | `console.log('【结果】FAIL …')` + 读回 + **`process.exit(2)`** |
| 禁止 | 验收 FAIL 仍 `process.exit(0)`；silent 循环重试 10 次 |

### 5. 代理汇报门禁（N 分钟 · 中断重来）

| 项 | 约定 |
| --- | --- |
| **默认 N** | **2 分钟**（用户可当轮指定更大 N，未指定用 2） |
| **计时起点** | 自上次对用户**中文**可见汇报（`【将要】` / `【结果】` / 进度句） |
| **触发** | >N 分钟仍无新中文进度 |
| **动作** | 1）视为**违规** 2）**立即 kill** 当前 CDP/长命令 3）汇报中断原因 + 最后 DOM 4）**拆更短步重来**（禁止同批 silent 重跑） |
| **禁止** | 默许工具侧 10～20 分钟无输出；「脚本还在跑所以不汇报」 |

```text
自上次中文【将要】/【结果】起
  → 超过 N 分钟仍无新中文汇报
  → 【违规】立即 kill 当前任务
  → 汇报已停原因 + 最后 DOM 读回
  → 拆更短步再开（禁止 silent 重开同批长跑）
```

---

## Operating Mode

- Use Chinese for operational guidance; paste-ready **Korean** for all customer-facing NOL fields.
- Ticket products = admission / pass / voucher / session entry — never transfer.
- Do not invent admission, redemption, issuance, cancellation, age, inventory, or price rules. Follow supplier + Excel.
- Every field recommendation must be traceable to Excel, supplier page, screenshot, or explicit user note.
- For a new pattern product, prefer assisted field-by-field mode until the user asks for autonomous browser listing.
- **Live 浏览器默认：** 遵守 **Absolute Safety Stops** + **优先级卡点 0a–0h** + **真选中验收表** + **已验证路径** + **Live 运行节奏专节** + **售价=售价hkd 列**；每步 `【将要】→【元素定位】→【读回值】→【结果】`；失败默认 **定点修补唯一实现**；PASS **同轮沉淀**；禁止整页刷新/整流程重填/即兴第二套/把加价逻辑当售价。
- **Never** click approval/submission (`批准請求` / `提交審核` / `승인요청`, etc.).
- After option setup is done and the page is on step 4 `選項管理`, **stop**. Do not click page-level black `臨時存儲` unless the user explicitly asks in that turn for temporary save; default handoff is human operator review.

---

## Product Families From Excel (unified)

Classify every row into **one** family before filling sale settings. Mixing families is the main source of “售卖设置不统一”.

| Family | Excel examples | What customer buys | Age | Pricing | Entry / ticket | Reservation identity |
| --- | --- | --- | --- | --- | --- | --- |
| **A. Session scenic (一般景区·场次)** | 上海豫园, 北京恭王府, 雍和宫, 天坛, 颐和园, 圆明园 | Morning / Afternoon **session** options | **Adult only** (no child/senior sale) | Excel **售价hkd** 求值（非加价逻辑列） | **Email e-ticket / ticket notice** ~within 7 days before use; customer presents ticket from email | All travelers: **full name + passport number** (collect at booking) |
| **B. Passport-entry theme park (护照入园·不预发票券)** | **上迪单门票**, **北环单门票** | One option: **1日票** | Adult 12+ + Child 3–11; **child cannot sell alone** | Excel **售价hkd** 求值；仅有成本无售价时问用户 — **禁** 擅自 `/0.8` | **No advance e-ticket or paper ticket.** Day-of **passport recognition** entry; still may send **email notice** within ~7 days | All travelers: **English name + passport number** (per quantity) |
| **C. E-ticket theme park (电子票入园)** | 港迪单门票 (see do-not-list) | 1日票 adult+child | Same age bands; child not alone | Variable / Excel 售价 | **E-ticket by email**; **passport not required for entry** (unlike B) | Usually phone + email only unless supplier changes |
| **D. Do not list** | 港迪 when Excel says NOL has official park coop | — | — | — | — | **Do not list** from this batch |

### Family decision rules

1. If Excel says **只卖成人票** + Morning/Afternoon Session → **Family A**.
2. If product is 上迪 / 北环 / same wording “**不预先提供电子票或纸质票** / **护照识别入园**” → **Family B**.
3. If product is 港迪 and Excel says **NOL平台有和景区官方合作，不给上** → **Family D** (stop; do not create draft).
4. If e-ticket entry **without** passport recognition (港迪-style when allowed) → **Family C**.

Never apply Family A “email QR entry” copy to Family B, or Family B “passport gate only” copy to Family A.

---

## Unified Sale Settings Matrix (售卖设置统一)

Use this matrix for every domestic ticket product so option/price/period settings stay consistent.

### Product attributes (all families)

| Setting | Unified value |
| --- | --- |
| Product type | Ticket / pass / admission (`通票` when platform Chinese-only) — **not** transportation |
| Theme | Match attraction: `主题公园` for Disney/Universal; scenic category for temples/parks |
| Person limit | **否** unless supplier forces group size |
| Progress language | **韩语** |
| Nationality | 不限 unless supplier restricts |
| Location | Real POI from search (with coordinates), not free-text only |
| Schedule type | **没有单独的时间表 / NONE** (sessions are **options**, not course schedules) |
| Images | ≥3 attraction images when required |
| Shortest booking days | Default **0** when supplier shows immediate access; do **not** set 7 just because email copy says “7 days before use” (that is delivery timing) |

### Option / sales calendar (all families)

| Setting | Unified value |
| --- | --- |
| Option creation | `註冊/添加選項` for each sales package; do not misuse transfer option patterns |
| Sales period | Default **1 year** (or first selectable date → +1 year) for ongoing inventory; report actual retained dates |
| Price entry | Fill calendar / period price **once** per price type; verify cells, not only list cards |
| Include | Prefer common include `시설 입장료` (facility admission) |
| Exclude (Korean) | `개인 경비` + `포함 사항에 명시되지 않은 기타 비용` |
| Option-level include override | Prefer **共同**; delete stale option override that shows Chinese / “不存在” and causes `포함 사항 작성 부탁드립니다.` |
| Stop | After options visible on 選項管理 → hand off; no approval |

### Family-specific sale settings

#### Family A — Session scenic

| Setting | Unified value |
| --- | --- |
| Options | **Two** sales options: Morning Session + Afternoon Session (use Excel time windows in Korean option name/description) |
| Price types | **Adult only** (`성인` / age text from supplier if needed). Do **not** add child/senior types |
| Min/max qty | Min `1`; max blank unless supplier max |
| Representative | Adult price type = representative |
| Mandatory purchase | Off |
| Sale price | Excel **售价hkd** 列求值（非加价逻辑）；表内有 `=D/0.8` 则用结果；禁把 D 列当售价 |
| Reservation | **Representative:** phone + email required. **Per quantity:** English surname, English given name, passport number required for every ticket |
| Voucher / ticket copy | Email e-ticket or ticket notice; emphasize valid email + attachment receive |

Example option names (Korean, adapt times from Excel):

```text
오전 세션 입장권 (09:00-12:30)
오후 세션 입장권 (12:30-16:00)
```

#### Family B — 上迪 / 北环 (passport entry)

| Setting | Unified value |
| --- | --- |
| Options | **One** option: `1일 입장권` |
| Price types | Age-based: **성인** + **아동** only |
| Adult | Name `성인`, desc `만 12세 이상`, min 1, max blank, **representative yes**, mandatory **no** |
| Child | Name `아동`, desc `만 3-11세`, min 1, max blank, representative **no**, mandatory **no** (mandatory would force every order to include a child) |
| Child alone | UI often has no true dependency → state in option desc + must-know + FAQ; do not fake mandatory |
| Cost basis | If Excel only notes inventory costs without 售价: take the value Excel/user designates as sale price; do not invent a markup |
| Sale price | Excel **售价hkd** 求值 copy-paste；无售价公式时禁自创 `/0.8` |
| Reservation | **Representative:** phone + email. **Per quantity:** English surname, English given name, passport number for every traveler |
| Voucher / ticket copy | **Do not** promise QR/e-ticket/paper ticket for gate entry. State **passport recognition on visit day**. Email within ~7 days is **notice/confirmation**, not a pre-issued park ticket |

#### Family C — E-ticket theme park (when listing is allowed)

| Setting | Same as Family B for ages/option structure |
| --- | --- |
| Entry copy | **E-ticket by email**; **passport not required** for entry (港迪 Excel) |
| Reservation | Prefer phone + email only unless supplier demands passport |

#### Family D

Stop listing; explain NOL official coop / batch “不给上”.

---

## Pricing Rules (unified) · ⛔ 售价列硬规则（用户 2026-08-11 升格）

**总则（硬规则一句）：**  
**NOL 日历价 = Excel「售价hkd」列求值结果；永远不是「加价逻辑」列原值。**

### 列语义（国内景区门票）

| 列 | 常见表头 | 含义 | 写入 NOL？ |
| --- | --- | --- | --- |
| D | **加价逻辑** | 成本 / 基数 / 加价底数（例：黄浦江 **152.33**） | **否** |
| E | **售价hkd** | 客户售价；常为 `=D25/0.8` 等公式（例：→ **190**） | **是 · 唯一源** |

### 操作 SOP（填日历前必过）

```text
1. 打开当批 Excel · sheet 国内景区门票 · 定位本产品行
2. 确认表头：哪一列是「售价hkd / 售价」，哪一列是「加价逻辑 / 成本」
3. 取「售价hkd」单元格：
   - 若是数字 → 直接用
   - 若是公式（如 =D25/0.8）→ 求值后用（可用 data_only 或手算核对）
4. 对用户写：【售价来源】售价hkd=190（加价逻辑=152.33 未用作售价）
5. 填入 NOL → 日历 DOM 读回 = 该售价（非加价逻辑数）
```

### 允许 / 禁止

| 允许 | 禁止 |
| --- | --- |
| 贴 **售价hkd** 求值结果（含表内 `=D/0.8` 算出的 190） | 把 **加价逻辑** 152.33 当售价写入（黄浦江事故） |
| 用户当轮明确给的售价/截图价 | 表无售价列、无用户公式时，自己默认 `成本/0.8` 发明价 |
| 有成本+售价两列时 **只信售价** | 用供应链网页价覆盖表内售价（除非用户当轮改） |
| 成人/儿童 **分别** 取各自售价列 | 抄上单产品价到本单；对称抄错行 |

### 与旧句「不要 /0.8」的关系（纠正）

- **旧误读：** 一律不除 0.8 → 有人把 D 列原样当售价。  
- **正确：**  
  - Excel **售价列已经写了** `=D/0.8` → **必须求值**，这是表内售价，不是代理发明。  
  - Excel **没有** 售价公式、只有成本，且用户 **未** 给公式 → **禁止** 擅自 `/0.8`，应停问用户。  
- 用户截图价与求值小数不一致时（190 vs 190.41）：**优先用户截图/表显示习惯**，并在汇报中写明。

### 事故锚点（必须记住）

| 产品 | 错 | 对 |
| --- | --- | --- |
| 黄浦江游船（Excel 12 · R25–26） | 日历 152.33 | **190**（售价=加价逻辑/0.8） |

### 其它

1. Adult and child prices calculated **separately** when both exist.  
2. Never invent cancellation windows when supplier only shows vague labels.  
3. Variable parks（上迪/北环仅库存成本说明）：仅当用户当轮要求重算时才动；否则仍跟 **售价** 列。

### Reference sale prices from `NOL 待上架产品 (1).xlsx` (recheck supplier before reuse)

| Product | Options | Sale HKD (batch) |
| --- | --- | --- |
| 上海豫园 | Morning / Afternoon | 60 / 60 |
| 北京恭王府 | Morning / Afternoon | 58 / 58 |
| 北京雍和宫 | Morning / Afternoon | 65 / 65 |
| 北京天坛 | Morning / Afternoon | 30 / 30 |
| 北京颐和园 | Morning / Afternoon | 131 / 131 |
| 北京圆明园 | Morning / Afternoon | 56 / 56 |
| 上迪 1日票 | Adult / Child | 986 / 726 (batch; still revalidate inventory max cost) |
| 北环 1日票 | Adult / Child | 969 / 730 (batch; still revalidate inventory max cost) |
| 港迪 1日票 | Adult / Child | 869 / 653 — **do not list** if coop rule applies |

---

## Copy Rules by Family

All customer-facing text: **Korean only**. No Chinese leftovers in option include/exclude, FAQ, etc.

### Shared must-emphasize blocks (from Excel 备注)

**All listable products (A/B, and C when allowed)** should cover where applicable:

1. Email: ticket **or notice** usually sent within **7 days before travel** to the booking email; email must be real and can receive attachments.  
2. Identity: booking needs **all travelers’ full names and passport numbers** (except Family C 港迪-style when Excel does not require passport for entry — then do not force passport fields).

### Family A only (session scenic)

- Emphasize **session time windows** (morning vs afternoon).
- Emphasize **adult-only** sale when Excel says 只卖成人票.
- Emphasize **email ticket/notice** for entry presentation.
- Do **not** say “no ticket provided / passport-only gate” unless supplier truly works that way (Excel Family A does not).

Template points (Korean):

```text
티켓 안내는 이용일 기준 보통 7일 이내에 예약 시 입력한 이메일로 발송됩니다. 이메일 주소가 정확하고 첨부파일을 수신할 수 있는지 확인해 주세요.
모든 이용자의 영문 성명과 여권번호를 예약 시 입력해 주세요.
```

### Family B only — 上迪 / 北环 (passport entry, no pre-ticket)

Excel items 3–4 for both parks (must appear in intro + must-know + FAQ as appropriate):

3. **景区不预先提供电子票或纸质票**；出行当天所有旅客需 **护照识别入园**；务必携带护照。  
4. **3–11岁儿童须购儿童票，12岁及以上须购成人票**；儿童票不可单卖。

Do **not** copy Family A “出示邮箱电子票入园” as the main entry method.

#### 上迪 copy anchors

- Product name: `상하이 디즈니랜드 1일 입장권`
- One-line:

```text
상하이 디즈니랜드를 하루 동안 자유롭게 즐길 수 있는 1일 입장권입니다.
```

- Summary:

```text
상하이 디즈니랜드 1일 입장권
성인권과 아동권 선택 가능
사전 전자티켓/지류 티켓 없이 이용일 여권 인식으로 입장
```

- Entry/must-know core:

```text
본 상품은 이용 전 별도의 전자티켓이나 종이 티켓을 미리 제공하지 않습니다.
이용 당일 모든 방문객은 여권을 지참하고 여권 인식으로 입장해야 합니다.
티켓/이용 안내는 이용일 기준 보통 7일 이내에 예약 이메일로 발송될 수 있으나, 이는 안내 성격이며 사전 입장권 교부를 의미하지 않습니다.
만 3-11세는 아동권, 만 12세 이상은 성인권을 구매해야 합니다.
아동권은 단독 구매가 불가하며 동일 주문 내 성인권과 함께 구매해야 합니다.
모든 이용자의 영문 성명과 여권번호를 예약 시 정확히 입력해 주세요.
```

#### 北环 copy anchors

- Product name: `베이징 유니버설 리조트 1일 입장권`
- Same structure as 上迪: passport gate, no pre e-ticket/paper ticket, adult/child rules, email notice ≠ ticket, child not alone.

```text
본 상품은 이용 전 별도의 전자티켓이나 종이 티켓을 미리 제공하지 않습니다.
이용 당일 모든 방문객은 여권을 지참하고 여권 인식으로 입장해야 합니다.
```

#### Recommended FAQ set

**Family A:** email delivery; passport/name required for booking; adult-only if applicable; session times.  

**Family B:** email notice timing; **passport required for entry**; no pre-issued ticket; child not alone; age bands.

```text
Q: 전자티켓이나 종이 티켓을 미리 받나요?
A: 아니요. 본 상품은 사전 전자티켓/지류 티켓을 제공하지 않으며, 이용 당일 여권 인식으로 입장합니다. 예약 이메일로 안내가 발송될 수 있습니다.

Q: 아동권만 따로 살 수 있나요?
A: 아니요. 아동권은 동일 주문 내 성인권과 함께 구매해야 합니다.
```

### Family C (港迪 when allowed)

- E-ticket by email; **passport not required for entry**.
- Child not alone; age 12+ / 3–11.
- Do not use Family B passport-gate copy.

---

## Reservation Information (unified)

| Need | Family A | Family B (上迪/北环) | Family C (港迪 e-ticket) |
| --- | --- | --- | --- |
| Phone + email (order once) | Required | Required | Required |
| English name per traveler | Required | Required | Off unless supplier asks |
| Passport number per traveler | Required | Required | **Off** for entry (Excel 港迪) |
| Hotel / flight / pickup / luggage | Off | Off | Off |

Modal: `选择` = shown; `必填` = required. Per-traveler identity → **按數量**, not only 代表.

**Live 预约操作（真选中）：** 必须走 **表 B**。`label[for=id]` 点后读 `checked`/`aria-checked`；点 **已选** 后读 **页面摘要非空** 才算过。禁止只改 `input.checked=true` 不点 UI；禁止无读回说「已选护照」。

WhatsApp if needed and no field → additional request Korean:

```text
예약 후 연락 가능한 WhatsApp 번호를 입력해 주세요.
```

---

## Option Management Details

### Age-based UI pitfall

Translated labels may mis-map (e.g. `CHILDREN` shown as 嬰兒). Prefer internal type + rename display to `아동` for 3–11. Do not pick real infant type for child tickets.

### Family A session products

- Two options, adult price type each.
- Put session window in option name/description in Korean.
- Same sale period length for both sessions when inventory allows.

### Family B single day ticket

- One option `1일 입장권`.
- Adult + child price types as matrix above.
- Option description must mention ages + child not alone + passport entry (B only).

### Include/exclude recovery

If card shows `포함 사항 작성 부탁드립니다.`:

1. Open option edit.  
2. Check option-specific include override.  
3. Switch to 共同 or delete bad override; set `시설 입장료` + Korean exclude.  
4. Save include modal then option `下個`/save.  
5. Recheck card.

---

## Product Regulations / Voucher Notes

- Passport-entry (B): must-know and usage describe **bring passport → recognition entry**, not “show QR at gate from email ticket”.
- Email “7 days” is **delivery/notice timing**, not platform voucher SLA and not shortest book day.
- Soft warning shortest book `0` vs intro `7` days can remain when 7 = email timing only.
- Soft warning voucher issue `0h` vs intro `168h` same idea — do not invent voucher delay rules.
- Cancellation: if supplier only shows vague conditional/non-refundable labels, do not invent windows; use conservative setting or ask user.

---

## Automation Workflow (ticket only)

0. **Live 清场（卡点 0a–0h）：** kill 残留 CDP → 确认单 Playwright → 视口不压窄 → 脚本 timeout 就绪 → 准备逐步中文汇报；默认 **禁止 reload**。  
0b. **声明复用入口（卡点 0g）：** 对用户写出 `复用：lib/… + 已验证路径 P…`；数据源 = 当单 Excel；**禁止** 未声明即兴第二套。  
0c. **定售价（卡点 0h）：** 读 **售价hkd** 求值；汇报 `【售价来源】`；**禁止** 用加价逻辑列。  
1. Read Excel `国内景区门票` row → classify Family A/B/C/D → **解析售价hkd（非加价逻辑）**。  
2. Open supplier link; confirm ticket types, costs, entry method.  
3. Write Korean copy per family.  
4. Fill attributes → intro → regulations → options with **unified sale matrix**.  
   - **分批执行**（属性一批、介绍一批…）；**禁止** 一次 silent 跑完全流程。  
   - **Every click:** 文字定位 + **DOM 读回**（优先级卡点 0–5、**0f/0g/0h**；表 A–E；**已验证路径**）。  
   - 读回 FAIL → **改唯一实现定点修补** → 仍败 **停报** + `exit≠0`；**禁止** 整页刷新/整流程重填 / silent 重试 / 说已选中。  
   - 读回 PASS → **同轮写入已验证路径或 lib**；未写入禁止说可复用。  
   - **`保存然后` 灰 → 枚举红字逐项补**，禁止 reload 碰运气。  
   - **>N 分钟无中文汇报 → 中断拆步重来**（默认 N=2；定点修补，禁整页重开）。  
5. Save options onto 選項管理（每卡 **临时保存→下一个** + 列表可见卡名读回）。  
6. Stop; human temporary-save / approval.  
7. Self-check list below（含真选中 + 运行节奏 + **0g 沉淀**）。  
8. Recap learnings → **必须** 更新「已验证路径」或 lib（非可选）。

---

## Hong Kong Disneyland Notes (Family C / D)

- If Excel says **NOL平台有和景区官方合作，不给上** → **do not list**.
- When listing is explicitly allowed later: e-ticket entry, no passport for entry, adult/child, child not alone, email delivery, prices from Excel **售价** as-is.
- Do **not** reuse 上迪/北环 passport-gate assumptions.

---

## Final Check

- [ ] Family A/B/C/D classified from Excel before fill  
- [ ] Ticket product, not transfer（通票，非交通；未套接送默认）  
- [ ] Korean customer fields only  
- [ ] Sale settings match **unified matrix** for that family  
- [ ] Family A: two sessions, adult only, email ticket copy  
- [ ] Family B: one 1-day option, adult+child, child not alone, **passport entry / no pre-ticket** copy  
- [ ] Sale prices = Excel **售价hkd 求值**（非加价逻辑）；有 `=D/0.8` 已求值；日历 **读回** 一致；动手前有 `【售价来源】`  
- [ ] Reservation: **表 B** 逐项 checked + **页面摘要非空**（A/B 护照+英文名按数量）  
- [ ] 主题/语言：**表 A** 已选后摘要读回；韩语 exact，未点错「仅限韩语用户」  
- [ ] 全程 **文字定位**（无坐标）；每关键点击有 **DOM 读回**；无读回未宣称已选中  
- [ ] 时钟/分钟/时段（若出现 UI）：**表 C/D** 读回通过；失败已停报  
- [ ] 假日/日历段（若有）：**表 E** 首/中/末有价 = **售价列**  
- [ ] **单 CDP：** 操作前已杀残留；全程同时只 1 个 Playwright  
- [ ] **短步：** 一批一步；无 silent 长跑 10～20 分钟；每步有【将要】/【结果】+读回  
- [ ] **视口：** 未压窄 `<1440`；默认未乱 setViewport；`innerWidth<1280` 已停  
- [ ] **脚本：** 所有 wait/goto 有 timeout；FAIL 用 `exit≠0`；无无限 waitFor  
- [ ] **汇报门禁：** 无 >N 分钟（默认 2）无中文进度；若触发已 kill 并拆步重来  
- [ ] **定点修补（0f）：** 无单字段 FAIL 触发 `reload`/整页重开属性·介绍；已填资产未擅自清空；`保存然后` 灰时已枚举红字逐项补  
- [ ] **成功沉淀 / 复用（0g）：** 动手前已声明复用入口；PASS 已写入「已验证路径」或 lib；失败改唯一实现非 silent 重试；价/名/图来自当单 Excel 未抄错上单  
- [ ] **售价列（0h）：** 未把加价逻辑当售价；黄浦江类 `D/0.8` 已用结果  
- [ ] Shortest book day not wrongly set to 7  
- [ ] Include warning cleared on option card  
- [ ] Stopped on 選項管理; approval not clicked  
- [ ] 港迪 not listed when batch forbids  

---

## Source Snapshot (workbook learning note)

File: `NOL 待上架产品 (1).xlsx` / `NOL 待上架产品 (12).xlsx` 等 · sheet **`国内景区门票`** columns:

`产品 | 待上option/套餐 | 年龄档位 | 加价逻辑 | 售价hkd | 供应链 | 备注`

**列硬语义：**

- **加价逻辑** = 成本/基数 → **禁止** 直接写入 NOL 客户售价。  
- **售价hkd** = 客户价；常为 `=加价逻辑/0.8` → **求值后** 写入；例黄浦江 D=152.33 → E→**190**。  
- 读表时优先 `data_only` 或手算核对公式，避免把公式字符串或 D 列误当售价。

Reusable Excel defaults embedded above. When a new row appears, map it to Family A/B/C/D first, then apply the matching sale + copy block — do not invent a third hybrid pattern without user confirmation.
