---
name: nol-product-listing-helper
description: Assist with NOL product listing forms, especially Korean travel/private-car transfer products (Japan airport/station/port/attraction and China attraction transfers). Use when the user sends NOL admin screenshots, asks how to fill a field, says 怎么填/可以吗/怎么添加/继续上架, or wants to list a product from a task brief, Excel/CSV price table, or example listing. Distinguish transfer products from ticket products (use nol-domestic-ticket-listing-helper for tickets).
---

# NOL Product Listing Helper

Use this skill to answer field-by-field NOL listing questions and prepare copy, options, prices, policies, and review checks for Korean-facing **transfer** products. Do not use ticket-product flows for private-car transfers.

## Absolute Safety Stops

- **Never** click `批准請求`, `승인 요청`, `提交審核`, or any approval-submission control unless the user explicitly asks for approval submission **in that same turn**.
- If the user states a standing ban (e.g. “坚决不允许点击批准请求”), treat it as session-wide law. Temporary save only.
- **Default completion stop for Japanese hub/airport live runs (user 2026-08-05):** after all option cards exist on **選項管理 list** (`판매중`), **stop automation there**. Optional exact `臨時存儲` only. Do not keep driving the browser after the list looks complete unless the user asks.
- Final preservation when saving = exact `臨時存儲` + green/temporary-save toast. The approval button remaining visible afterward is normal and is **not** a prompt to click it.
- Never coordinate-click the bottom bar when `臨時存儲` and `批准請求` are adjacent. Enumerate buttons by exact text/DOM index.

## ⚡ 执行优先级卡点（先看这里再动手）

按「还会翻车概率」排序。任一未过 = **禁止**进入下一阶段 / **禁止**向用户报「已做好」。

| 序 | 卡点 | 最短真验收 |
| --- | --- | --- |
| 1 | **时段**（中国景区最脆） | §40 全步：分钟 30 读回 → 结束 21:30 读回 → 生成 → **弹窗「保存」** → form compact `28/08:00/21:30` → 四卡二次重开仍对 |
| 2 | **假成功** | 脚本 log / 弹窗里见过 28 行 / 点过按钮 ≠ 完成；只信 DOM 门禁表 |
| 3 | **售价 510≠500** | Excel 本行公式求值；7 去春 **510** / 7 返 **500**；读日历容器 `日\n价` |
| 4 | **假日 12 段** | 每「选项×段」listClean；第 4 卡 scroll+mouse；一段一「完成」 |
| 5 | **预约摘要** | scroll + `label[for]` → `已选` → **页面摘要非空** |
| 6 | **保存然后门禁** | 主题+语言+私人的+POI 齐；`保存然后` enabled 再点；禁止跨步 URL |
| 7 | **创建/图** | 名只进弹窗（勿搜索框）；썸네일 正好 3（无 6） |
| 8 | **停列表** | 4×可销售 + 临时保存；**永不**提交审核 |
| 9 | **单 CDP** | 同时只跑一个 Playwright；先 kill 残留 `list-*`/`fix-*` |

**「保存」三层（勿点错）：** ① 时段/包含等 **弹窗「保存」** ② 选项表单 **临时保存→下一个** ③ 页底 **临时保存**。用户截图说「这里要点保存」多指 **① 弹窗**。

**价格类型名称：** 只用 `N인승 가는/오는`，**禁止** `5seat go` 等英文码（workflow 旧表示例已废）。

## ⛔ MANDATORY: 做好再下一步 / Verify-Before-Next（用户 2026-08-06 金茂硬纠正）

用户原话：*「你做什么都先检查一下是不是真做好了再做下一个」* / *「你这个时间分明就是没做好」* / *「不可以通过跳转url来到下一个界面，只能通过按保存然后类似按钮」*。

**Why same bugs kept happening:** skill 里已有零散备注，但代理仍会用「脚本 log 说 done / 点过按钮 / count 非 0 的某次中间态」冒充完成。  
**从本条起：未过验收门禁 = 未完成 = 禁止进入下一阶段 / 禁止向用户报「已做好」。**

### 零容忍验收门禁（每步过一门再走）

| 阶段 | 禁止往下的假成功 | 真验收（DOM/UI，写进汇报） |
| --- | --- | --- |
| 属性/介绍/法规 | `goto` 了下一步 URL | 当前页 **`保存然后` 曾 enabled 且被点击**；下一页标题/URL 由按钮推进 |
| 建选项卡 | 点了「注册/添加」 | 列表 **`修改选项` count 增加**；卡名可见 |
| **时段** | 脚本 `setTimes()` 返回 / 点过「设置时间」/ log 写 `done` / **只生成未点弹窗保存** | 表单 **`时间段` compact 行**：China `count===28 && first==='08:00' && last==='21:30'`（日本 hub `30`/`07:00`/`21:30`）。**`count===0` 或只有「设置时间」= 失败** |
| 时段弹窗 | 列表里看到 28 行就关窗 / 只点表单临时保存 | **生成后必须点时段弹窗底部「保存」**（用户：*「这里要点保存」*）；再读表单 compact |
| 时段保存后 | 只在弹窗内看过 28 格 | **临时保存→下一个** 后 **再打开该卡** 再读一遍 `时间段` 行仍为 28 |
| 假日价 | `fill` 返回 true / `price true` | 日历容器 **`日\n价`**（如 `1\n510`），不是 PlainDayButton 的 `"1"` |
| 整产品完成 | LIST mods=4 | 四卡可销售 + 时段复验 + 假日格子复验 + 停列表 + **未点提交审核** |

### 禁止的假成功写法

- `console.log('  times', { count: 0 })` 后继续 `done` / 向用户说「时段已设」→ **违规**
- `exists skip` 后不检查已有卡的时间段 → **违规**
- 并行/后台旧脚本还在跑（金茂：早期 create 脚本 `times {count:0}` 延迟 exit 0）→ **先 kill，再验收**
- 用整页 `match(/\d{2}:\d{2}/)` 的 first/last 冒充时间段 → **违规**
- 表单 `#name` 还是空 / 未 wait 就读 `时间段` → **未打开，不算验**

### 推进方式（再强调）

- **跨注册大步**（属性→介绍→法规→选项）：**只许** `保存然后` / 已启用 stepper。**禁止** `goto` introduction|regulations|option 当捷径。
- **选项列表内** listClean：可 `goto` **同一** `.../option?id=本草稿` 清脏表单/弹窗；**不是**跳到别的注册步。
- **改选项**：永远 **临时保存 → 下一个**；出现「有变化…确定要离开」= 没保存 → **消除** 后重存。

## User Corrections That Override Old Habits (2026-08-04~06)

These are **hard process rules** learned from live Kansai (KIX) / Narita / **Itami (ITM)** / **Haneda edit** / **Shanghai Oriental Pearl** / **Top of Shanghai Observatory** / **JinMao Tower 88F** / **Madame Tussauds Shanghai (杜莎)** work. Prefer them over any older “URL shortcut” notes elsewhere in this skill or playbook.

**修改已有草稿（改预约、改价格类型等）** → 先读并严格执行  
`references/nol-draft-edit-save-playbook.md`（保存顺序、离开弹窗、简体文案、验收清单）。

1. **Strict source table — 每一格独立（用户 2026-08-06 东方明珠硬纠正）**  
   Prices and route rows come **only** from the user’s Excel/CSV (e.g. `~/Downloads/NOL 待上架产品.xlsx` → sheet `国内接送` / `日本接送产品`).  
   - **Never invent** HKD, holiday columns, or vehicle rows.  
   - **Never “harmonize”** 去程=返程、5 座=7 座、或抄豫园/别的景区的假日价。  
   - **Live wrong price:** 春节 7 座去程表是 **`510`**、返程是 **`500`**；脚本按对称写两个 500 = **错价**。用户：*「表里面有510」*。  
   - 有售价列时 **禁止** 用 `成本/0.8` 覆盖表内售价；`/0.8` 仅当用户明确要求或表只有成本列。  
   - 验收：**销售日历格子数字**，不是列表卡片、不是脚本 log 自称成功。

2. **No direct URL jump across registration steps**  
   Do **not** `goto` `/registration/introduction|regulations|option?...` to skip a page that is still incomplete. Advance only when the current page’s **`保存然後`/`保存然后` is enabled and clicked**, or when the **stepper** item is enabled and clicked.  
   (Historical note: older Haneda notes mentioned direct option URL when the stepper stuck. That is **last-resort only after regulations truly complete**; user forbids using URL as a routine bypass.)  
   **Never navigate while an option form is dirty** — see leave-dialog rule below.

3. **`保存然後`/`保存然后` is the completion gate (new section)**  
   A page is not “done” until that button is **clickable** (`disabled=false`). Grey button = missing required field (common: 私人的, theme, language, POI, 缩略图, 代表预约信息, voucher, blank cancel window, empty min qty). Fix the red/invalid fields; do not start filling the next major section.

4. **Attributes: always select 私人的**  
   Under `團體/私人`, select **`私人的`** (`input[name=tourTypes][value="0"]`). Unchecked → red `請選擇旅遊類型。` and both temp-save / save-then disabled.  
   **ITM pitfall:** the real checkbox is often **off-screen** (`boundingBox.x ≈ -9999`). Force-check on the input can fail; **mouse-click the visible label** (text starts with `私人的`). Exact `getByText('私人的')` may timeout when label text is multi-line.

5. **Regulations: 代表预约信息 is required**  
   Empty shows red `须填写「代表预约信息」…` / `您必須輸入代表預訂信息…` and blocks save-then. Open the modal, tick required ids, confirm with **`已选`/`已選`**, verify summary lists phone/flight/hotel/etc.  
   Prefer **real mouse clicks** on each required control; re-check until the **page summary** lists the fields.

6. **Option form save order（用户硬规则，修改必用）**  
   - **修改已有选项**：改完后必须 **`临时保存` → `下一个`**（繁体：`臨時存儲` → `下個`）。用户：*「先点临时保存再点下一个」*。  
   - 只点「下一个」、或只匹配繁体文案导致点空 = **没保存**。  
   - 表单打开时 footer 有较窄的 `临时保存`(≈120px) + 宽 `下一个`(≈600px)；**优先点表单 footer**，不要误点页底 `提交审核`。  
   - 新建选项至少保证 `下一个` 落卡；修改场景不可省略 `临时保存`。  
   细节见 `nol-draft-edit-save-playbook.md`。

7. **离开确认弹窗 = 没保存（用户硬规则）**  
   文案：`有变化…更改将丢失…确定要离开吗？`  
   - **消除** = 留下继续保存；**确定** = 丢改离开。  
   - 出现此窗说明未走完临时保存流程；点消除后先 **临时保存→下一个**，禁止点确定逃页。

8. **Stop on option list**  
   When four cards show (go/return × 7/10) with `판매중` / `可销售` / `可供出售`, stop. User: **「以后就停在这里」**.

9. **Introduction images: 썸네일 only (user 2026-08-05 ITM)**  
   Product photos go under **`썸네일 이미지` → `상품 이미지 등록(3개 이상)`**, **not** under **`프로그램 이미지`**.  
   Never use `input[type=file].last()` blindly; bind the **first** image file input under the 썸네일 / 상품 이미지 section.

10. **Step-by-step when the user asks to “边操作边展示 / 像真人鼠标”**  
    Announce → one click/fill → report result → wait. Do not silent-batch the whole product unless the user opts into autonomous multi-step.

11. **Price-type name must be Korean (audit 2026-08 post-review)**  
    Do **not** use English short codes such as `5seat go` / `7seat rtn` / `10seat return` in **价格类型名称**.  
    Use Korean names: `5인승 가는` / `7인승 가는` / `10인승 오는` 等.  
    **说明** stays Korean vehicle text: `7인승 차량`.  
    修改时流程见 playbook §5.B；改完 **临时保存→下一个**，再打开弹窗读 value 验收。

12. **Japan hub/attraction times always start 07:00 (not 09:30)**  
    Default slots: **`07:00`–`21:30` every 30 minutes → 30 slots**. Last slot is **21:30** (not 21:00).  
    **简体 UI 真路径（大阪站 2026-08 踩坑）：**  
    已有时段 → 点时间段旁 **⋯（`더 보기`）→ 菜单「编辑」**（不要只点 `21:00` 文字）。  
    清空错误行 → **「重复 小时 添加」** → 07:00 / 21:30 → **「分钟」30** → **「生成」**（扩展可能显示 **「一代」**）→ 弹窗 **「保存」**。  
    **未点生成就保存 = 只剩一条 `21:00`（用户已截图否决）。**  
    验收只读 **「时间段」下一行** compact 列表，禁止用整页 `HH:MM` first/last 冒充通过。

13. **UI language may be Simplified Chinese**  
    Live partner UI often shows `临时保存` / `下一个` / `保存然后` / `修改选项` / `选择价格类型` / `已选` / `提交审核` / `设置时间` / `重复 小时 添加`.  
    Scripts that only match 繁体 `臨時存儲`/`下個`/`設定時間` will fail silently. Always match 简+繁+韩.

14. **Never click 提交审核**  
    Same ban as `批准請求`. Bottom bar often has `临时保存` | `提交审核` side by side.

15. **Excel 红字逐条改（用户 2026-08）**  
    表格红字 = 待办。**改完一个就停，汇报，等用户检查，再下一个。**  
    映射见 `nol-draft-edit-save-playbook.md` §0。

16. **大阪站 ≠ 新大阪站**  
    产品/选项/介绍/包含 **禁止** `신오사카역` / `오사카역/신오사카역`；只写 **`오사카역`**。  
    （旧 skill 示例若仍写双站，以本条与用户红字为准。）

17. **打开草稿要点卡片中部**  
    `div[class*="slot___StyledContainer4"]` + **mouse.click**；只点标题小 div 可能进不去。

18. **Checkbox 只点一次（东方明珠 2026-08-06）**  
    主题/语言/私人/预约行：先读 `aria-checked` / `checked`；已是 true → **禁止再点**。  
    用户：*「你点了两次，都取消选择了」* / *「一个都没点到」*。  
    隐藏 input（`x≈-9999`）→ **mouse 点可见 label**。

19. **POI 必须官方景点，勿点同名异地（东方明珠）**  
    搜 `동방명주탑` + Enter；只选 **上海** 结果（Century Ave / Lujiazui / 中华人民共和国·上海）。  
    曾误选韩国 `동방명주`（서울）→ 删卡重加。  
    二段：`添加地点` → 类型 **`旅游地`/`TRAVEL_PLACE` label 点击** → 底部 **`添加`**（灰=类型未选）。

20. **包含弹窗「保存」可能写不回（东方明珠/简体）**  
    按钮是 **`保存`**（不是节省）。DOM 勾选+fill 后点保存仍可能不关窗。  
    可靠：对 `AttributeFormPopup` 调用 **`onSave({ inclusions, exclusions, appliedToAllOptions })`** 写入父 Formik 字段 **`optionAttributeBase`**，再确认页上「包括 運輸…」。细节见 `shanghai-oriental-pearl-transfer.md`。

21. **中国景区接送时段默认 08:00–21:30（28 格）**  
    与日本 hub **07:00 起 30 格** 区分。生成按钮可能显示 **`一代`**。验收只看 **时间段** compact 行。  
    **结束时间必须 21:30**（小时左、分钟右；误成 `00:30` = 失败）。**分钟间隔 30 必须真选上**再点生成。  
    **生成后弹窗底部「保存」必点**（用户 杜莎 2026-08-06：*「这里要点保存」*）。只生成不保存 → 关窗后 compact 仍 0。

22. **销售日历（简体）**  
    `选择单个日期（可多选）` → `custom-caption__NextButton` 翻月 → mouse 点 `custom-day__PlainDayButton` → 选中后 **`请输入价格` 才可填** → **`完成`**。  
    **一段一完成**；Oct / 春节 / May 禁止同一弹窗连改。

23. **表内售价列：禁止另算（用户 2026-08-06 Top of Shanghai）**  
    用户：*「不要另算价格，表内有现成的售价」*。  
    Excel 常见 `D=C/0.8`、`E=D/0.7`、春节 `F` **按行不同公式**（7 去程可到 **510**，7 返 **500**）。  
    **只用公式求值后的数字**；禁止脚本再 `成本/0.8` 覆盖。

24. **创建产品按钮可能简繁混写**  
    Live 确认钮可写 **`开始創建产品`**（「开始」简 + 「創建」繁）。  
    只匹配纯简 `开始创建产品` 或纯繁 `開始創建產品` → **点不到**。  
    用宽正则：`/开始|開始/` + `/创建|創建/` + `/产品|產品/`，或枚举 button 文本。

25. **改多选项时段：每卡必须回干净列表（Top Shanghai）**  
    卡在 option-form / popup 时列表 **`修改选项` count=0**。  
    **每卡流程：** `goto` 选项列表 → `修改选项` nth(i) → 设时段 → **临时保存→下一个** → 再 list。  
    禁止脏表单上连开下一卡。点 **`重复 小时 添加` 精确 button**（勿点父节点）；生成兼容 **`一代`**。

26. **假日每一段都要 listClean 再开日历（Top Shanghai）**  
    连续多段不回列表 → `caption=null` / `goto month failed` / 后几选项全挂。  
    **每「选项 × 区间」：** Escape/消除 → `goto` list → 确认 4×`销售日历管理` → 再开。  
    失败段单独重试即可。

27. **日历验收读容器 `日\n价`，不是 day 按钮**  
    `custom-day__PlainDayButton` 的 `innerText` **只有日期**（如 `"1"`）。  
    价格在兄弟节点 `sale-period-day-content___StyledText2`；容器  
    `[class*="custom-day___StyledContainer"]` / `td.rdp-cell` 的 text 为 **`1\n510`**。  
    脚本只读 button → 全假 FAIL；肉眼截图 / 读容器第二行才是真验收。

28. **提速：分阶段 + 单 CDP + 先卡后历**  
    推荐顺序：属性→介绍→法规→**4 卡落列表**→**时段×4**→**假日×12 段**→格子抽检→临时保存→停。  
    同一时刻 **一个** CDP 脚本；长循环拆批并 per-option log，避免「像卡住」。

29. **时段：脚本返回 count=0 仍写 done = 事故（金茂 2026-08-06）**  
    Live 坏脚本日志：`create 5go … times { count: 0 } … done 5go`。  
    用户立刻否决：「时间分明就是没做好」。  
    **硬规则：** `setTimes` 后若 compact 行不是 28/08:00/21:30 → **重试或停报失败**；禁止 `process.exit(0)` / 禁止说「已设时段」。  
    **二次验收：** 四卡全部 临时保存→下一个 后，**再逐卡打开**读 `时间段`；任一张失败 → 只修失败卡。

30. **预约字段：`label[for=id]` 点击（金茂）**  
    法规「代表预约信息」里大量 `input` 在 `y≈-9999`。  
    `force` 点 input 或只改 `checked` 常失败。  
    **可靠：** 对每个 required 字段找到 `label[for="${id}"]`，**mouse.click** 可见 label 中心；点后读 summary 非空。

31. **第 4 个「销售日历管理」必须滚进视口再点（金茂）**  
    四卡列表底部按钮 `y` 常贴近 `innerHeight`，`force: true` / 不滚动 → 弹窗半开、`caption=null`、三段假日全挂。  
    **可靠：** `scrollIntoView({block:'center'})` → **mouse.click** 中心坐标 → 等到 caption 形如 `8 月 2026` 与 PlainDayButton 出现再翻月。  
    失败只重跑 **该 optionIndex** 的失败段，不必整产品重来。

32. **后台/残留 CDP 脚本必须先杀（金茂）**  
    长 create 脚本超时进后台后仍可能继续点页面，与后续 fix 脚本抢同一 tab。  
    继续前：`pgrep`/杀残留 `node …fix-*|list-*`；**同时只跑一个** Playwright CDP。  
    收到 delayed「task completed」时：先抽查当前 DOM，勿默认信任旧脚本 exit 0。

33. **Form 未就绪禁止读验收（金茂 reopen 假 FAIL）**  
    点 `修改选项` 后若 `#name` 仍空，`时间段` 读到 count=0 是 **加载竞态**，不是真没时段。  
    **wait** `#name` 有值（或 name 含选项关键词）再读 compact 行；超时再判失败。

34. **汇报禁语**  
    未满足上表验收前，禁止写：「时段已做好」「假日已设」「可以提交」。  
    允许写：「未通过验收 / count=0 / 正在重试第 N 卡」。

35. **金茂塔 88 层 = 独立参考，勿抄错 POI**  
    见 **`references/shanghai-jinmao-tower-transfer.md`**（draft `6be1a050-…`；POI 金茂/Jin Mao；售价同档 213/250 + 510/500；时段 28 + 验收门禁全文）。

36. **创建产品：禁止把产品名填进列表搜索框（杜莎 2026-08-06）**  
    用户：*「别放搜索框」*。  
    列表页顶部 **搜索** 与 **新产品注册弹窗** 是两个 input。  
    **只填弹窗内产品名** + 勾选 **TRANSPORTATION** + 点 **`开始創建产品`**（简繁混写）。  
    搜索框保持空。填错 → 清搜索、重开弹窗。

37. **属性页灰「保存然后」= 必填未齐，禁止硬进下一步（杜莎）**  
    常见漏项：**主题** `기사제공차량` / 司机提供车辆 → 已选；**语言** 韩语 → 已选；**POI** 景点（杜莎：`杜莎夫人蜡像馆` / Madame Tussauds Shanghai，上海结果）→ 旅游地 → 添加；**私人的**。  
    **真验收：** `保存然后` `disabled===false` 后再点；禁止 `goto` introduction。

38. **缩略图只要 3 张，多了删底部重复（杜莎）**  
    用户截图 6 图 → 删掉底部 3 张重复，**保留带「代表」的 3 张**。  
    用户给几张就用几张（通常 3）；禁止同一批文件上传两次。上传后数 **썸네일** 区缩略图数量。

39. **预约「点了但没选上」：滚 action-sheet + label + 摘要验收（杜莎）**  
    用户：*「每次选择没选到要验收」* / *「选了但没选上」*。  
    - 代表预约弹窗列表常 **虚拟滚动**；先 **scroll** 弹窗 body 露出目标行。  
    - 隐藏 `input`（`y≈-9999`）→ **`label[for=id]` mouse.click**，禁止只 `checked=true`。  
    - 点后读 **`aria-checked` / checked**；已 true **禁止再点**（会取消）。  
    - 点 **`已选`** 前：弹窗内 required 全勾。  
    - 点 **`已选`** 后：读 **页面摘要**（电话/邮箱/酒店…）非空才算过；摘要空 = 失败，重开。

40. **中国时段完整 SOP（杜莎用户连否三刀：分钟 / 保存 / 验收）**  

    用户原话：  
    - *「分钟都没选到」*  
    - *「这里要点保存」*（指 **时段弹窗** 底部保存，不是表单临时保存）  
    - *「时间分明就是没做好」*  

    ### 正确逐步操作（简体 UI）

    ```text
    1. 干净选项列表 → 修改选项 nth(i)
    2. wait #name 有值
    3. 空：点「设置时间」
       已有：时间段旁 ⋯（더 보기）→ 菜单「编辑」（勿只点某个时刻文字）
    4. 若有旧行：逐条「删除」
    5. 精确 button「重复 小时 添加」（勿点父节点/「新增各别时间」）
    6. 开始时间：
       - 双列选择器：小时 = 左列，分钟 = 右列
       - 中国景区：08:00（左 08 / 右 00）
       - 禁止误成 00:00（点错列）
    7. 结束时间：
       - 必须 21:30（左 21 / 右 30）
       - 禁止 21:00、00:30、只改了小时没改分钟
       - 选完读回显示值再往下
    8. 间隔：点「分钟」类下拉 → 选 **30**
       - 必须读回确认间隔是 30，不是默认 60 / 空
       - 用户否决根因：脚本没真选上分钟
    9. 等「生成」/「一代」/「생성」**变为可点**（灰 = 开始/结束/间隔未齐，禁止硬点）
    10. 点生成 → 弹窗内应出现 **28** 条（08:00…21:30）
    11. ★ 点弹窗底部「保存」★  ← 硬规则；未点 = 未完成
        （用户截图时段列表展开时说的「这里」= 弹窗保存，不是页底临时保存）
    12. 弹窗关闭后读表单「时间段」下一行 compact：
        count===28 && first==='08:00' && last==='21:30'
        不满足 → 重开弹窗从第 4 步重来，禁止报 done
    13. 表单 footer：窄「临时保存」→ 宽「下一个」（勿点提交审核）
    14. 四卡都做完后：再逐卡打开读 compact 二次验收
    ```

    ### 禁止的假成功

    | 假动作 | 为何失败 |
    | --- | --- |
    | 只填了开始结束没选分钟 30 | 生成错区间或灰按钮 |
    | 结束显示 00:30 / 21:00 | 分钟列没点对 |
    | 弹窗列表有 28 行但没点「保存」就关 | 关窗后 compact=0（用户硬否） |
    | 只点了表单「临时保存」没点弹窗「保存」 | 时段未写入 |
    | log `times {count:0}` / `done` | 事故；exit≠0 |
    | 用整页 HH:MM regex 当验收 | 时钟/别的 UI 污染 |

41. **杜莎夫人 = 独立参考**  
    见 **`references/shanghai-tussauds-transfer.md`**（draft `4f20f9a8-…`；POI 杜莎；售价 213/250 + 510/500；上表时段 SOP；假日 listClean×12）。

## Operating Mode

- Infer the current field from the screenshot, page title, visible validation message, or the user's short follow-up.
- Answer with the exact value or action first; add brief reasoning only when it prevents a likely mistake.
- For screenshot-only follow-ups, continue from the last active product context.
- Use Chinese for operational guidance. Every customer-facing text or typed free-text value in NOL, including option include/exclude popups, must be paste-ready Korean unless the field is explicitly internal-only.
- Never invent route, vehicle capacity, date range, holiday price, confirmation rule, or cancellation rule. Ask for the single missing item when it changes the listing.
- When the user asks to continue listing inside the NOL partner center, load and follow `references/nol-transfer-live-listing-workflow.md` before operating the browser. Treat it as the execution checklist for full product listing, option creation, sales calendar overrides, saving, and review-safe stopping.
- For direct browser operation, also load `references/nol-partner-browser-playbook.md`. Use its selector patterns, fill order, verification snippets, and recovery logic instead of rediscovering the page behavior from scratch.
- When the user asks to **fix / 改 / 修复** an existing draft (预约、价格类型韩文、时段、选项字段等), load **`references/nol-draft-edit-save-playbook.md` first**. Hard rules: leave dialog = unsaved; option edit ends with **临时保存 → 下一个**; never 提交审核. Reuse script pattern `nol-listing-automation/fix-haneda-resv-pt.mjs` when automating.
- For Tokyo city hotel ↔ Tokyo Disney Resort, Tokyo Station/Tokyo Port/Yokohama Port, **Osaka Station (`오사카역` only)**, Osaka city hotel ↔ Universal Studios Japan, or similar hotel/transport-hub/private-attraction transfer listings, also load `references/tokyo-disney-transfer-live-notes.md`.
- For Tokyo city hotel ↔ Haneda Airport (HND) or other Japanese airport transfers (Narita/NRT, Kansai/KIX, Itami/ITM), also load `references/haneda-airport-live-notes.md`. Airport products need flight reservation fields, `항공권` exclude wording, fixed Japan pricing (no holiday overrides), and option-form pitfalls.
- For Osaka city hotel ↔ Kansai Airport (KIX), also load `references/kansai-airport-live-notes.md` (prices `99`/`133`, live draft id, page-gate pitfalls from 2026-08-04~05).
- For Osaka city hotel ↔ **Itami / Osaka International Airport (ITM)**, also load **`references/itami-airport-live-notes.md`** (prices **`77`/`105`**, 썸네일 image pitfall, 私人的 label click, POI `오사카 국제공항`, draft id `88b3861b-…`).
- For Osaka city hotel ↔ Universal Studios Japan listings, also load `references/osaka-universal-studios-live-notes.md`.
- For Osaka city hotel ↔ Osaka Port listings, also load `references/osaka-port-live-notes.md`.
- For Tokyo city hotel ↔ Yokohama Port listings, also load `references/yokohama-port-live-notes.md`.
- For **Shanghai city hotel ↔ Oriental Pearl Tower (东方明珠)** listings, load **`references/shanghai-oriental-pearl-transfer.md`** (prices **must** match Excel row-by-row including **7座去程春节 510** vs **7座返程 500**; draft example `f8d81d72-…`).
- For **Shanghai city hotel ↔ Top of Shanghai Observatory (上海中心观景台)** listings, load **`references/shanghai-top-of-shanghai-transfer.md`** (draft `7805362f-…`; same Excel 售价 asymmetry **510/500**; times **08:00–21:30×28**; calendar **listClean per segment**; create button **`开始創建产品`**).
- For **Shanghai city hotel ↔ JinMao Tower 88F Observatory (金茂大厦88层)** listings, load **`references/shanghai-jinmao-tower-transfer.md`** (draft `6be1a050-…`; same Excel 售价 **510/500**; **verify-before-next** times/holidays; cal button **scroll+mouse**; resv **`label[for]`**).
- For **Shanghai city hotel ↔ Madame Tussauds Shanghai (杜莎夫人蜡像馆)** listings, load **`references/shanghai-tussauds-transfer.md`** (draft `4f20f9a8-…`; 售价 **213/250 + 304/357/425/510/500**; 时段弹窗 **生成后必保存**；假日 listClean×12).
- For Shanghai city hotel ↔ Yu Garden (豫园), load `references/shanghai-yuyuan-transfer.md` (do not copy holiday cells onto 明珠/Top/JinMao/杜莎 without re-reading Excel).
- **Always** obey **§ MANDATORY Verify-Before-Next** above for any live listing — product-specific refs do not weaken it.
- For Beijing attraction transfer listings, run the workflow directly from the skill and references when data is present.
- If the user asks to show the whole input process, announce the exact field values before entering each major section and report the saved result after each section.
- When the user says to create another option, always use `註冊/添加選項` to make a new option card. Do not use `옵션 수정하기` unless the user explicitly asks to edit an existing saved option.
- If the product list already shows the target Korean route name as an UNPUBLISHED draft, **resume** it. Do not create a duplicate.

## Inputs To Collect

- Route and scope: city, origin area, destination, direction, pickup/drop-off scope.
- Vehicle details: vehicle size, usable passenger capacity, luggage capacity, and night surcharge rule.
- Price table: normal price, special dates, holiday prices, currency (**Excel only**).
- Availability: sales period, use period, operating days, time slots.
- Policy: confirmation SLA, voucher method, cancellation cutoff, inclusions, exclusions, and required reservation information.
- Images: user prompt attachments or Downloads basename matches.

## Field Flow

### Product Attributes

- Product name pattern: `{출발지} ↔ {도착지} 단독 차량 편도 이동 서비스`.
- One-way option name pattern: `{출발지} 출발 → {도착지} 편도 이동 ({차량})`.
- Partner product name: use the internal Chinese route name from Excel, such as `大阪市区-关西机场(KIX)`.
- Subtitle: leave blank unless a short, non-duplicative differentiator is needed.
- Usage type: choose use date specified at booking.
- Product category: choose `运输货物` / transportation goods.
- Theme/category: choose `기사제공차량` via `選擇類別（主題）` → tick → `已選`.
- Person limit: choose yes for vehicle-capacity products.
- **Travel type: private — must select `私人的`** (`tourTypes` = `0`). Not optional. Prefer visible-label mouse click when the checkbox is off-screen.
- Min/max participants: use min `1`; max is the vehicle's usable passenger cap (airport 7/10 products: product max often `9`). Do not leave fields at `0`.
- Nationality: choose no restriction unless the task brief limits nationality.
- Progress language: choose Korean (`選擇你的语言` → `韓語` → `已選`).
- Area/location: `添加地區和地點` → search + **Enter/search button** → pick official airport/attraction POI (not nearby hotels) → `添加地點` → location type **`旅遊地` / `TRAVEL_PLACE`** → final **`添加`**.  
  Examples: KIX → `간사이 국제공항`; ITM → search `이타미 공항` → **`오사카 국제공항`**.

### Product Introduction

- Write one-line marketing copy in Korean, focused on private transfer convenience.
- Write exactly three summary lines.
- Write product introduction that states route, included transfer, driver/vehicle, pickup method, and who the service suits.
- **Upload at least three product images into `썸네일 이미지` / `상품 이미지 등록(3개 이상)` only.**
  - There is a second zone **`프로그램 이미지`** (optional program/description images). **Do not** put listing photos there.
  - Bind the **first** `input[type=file][accept*="image"]` under 썸네일 / 상품 이미지 — not `.last()`.
  - Success criteria: three thumbs visible **in the 썸네일 section** and red `必須至少註冊 3 個縮略圖。` gone. Counting any `img` on the page is insufficient.
  - If images were uploaded to 프로그램 by mistake, delete each with the red **×** and re-upload to 썸네일.
- When the user supplies exact product images in the prompt, use those files rather than searching for substitute images. Copy them into a workspace upload-ready folder first when needed, then upload every supplied relevant image unless the user specifies a smaller set.
- When product images are required in live listing, first search the user's Downloads folder (`~/Downloads`) for three files whose basename is similar to the Chinese scenic-spot/product name.
- Prepare upload-ready copies by changing only the copy's suffix to `.jpg` or `.png` when needed. Keep originals in Downloads unchanged.
- Schedule type for simple transfer products: `NONE` (没有单独的时间表).

### Product Rules

- Confirmation: manual confirmation; confirmation time `3` business days (Japan transfer notes) unless brief differs.
- Voucher: reservation information / no exchange (`예약정보로 확인` + `無需換貨`). Template name may reference another product; method text is what matters.
- Include: customer-facing Korean only, e.g. route + parking under TRANSPORTATION; `픽업/샌딩 서비스 및 주차비 포함` under PICK_UP / OTHER as needed.
- Must-know / how-to-use / FAQ: luggage, WhatsApp/SMS, no voucher, 2-day change notice, flight fields for airport, round-trip = two one-ways, **no mid-route stops**.
- **Standard FAQ (add for all private one-way transfers, Disney/USJ audit):**
  - Q: `중간에 다른 장소에서 승하차할 수 있나요?`
  - A: `본 서비스는 출발지에서 목적지까지 바로 이동하는 지점 간 전용 차량 서비스입니다. 중간 경유지 추가 또는 중간 승하차는 제공되지 않습니다.`
- Cancellation: cancellable; partner **`是（手动取消）` / `예 (수동취소)`** — not auto cancel. `2` business days before use, `0%` fee, `100%` refund; after cutoff non-refundable.
- **Do not** click `添加` for a second cancel window if `windows.0` already has 2/0 — blank `windows.1` invalidates the form.
- Soft warnings (3-day book vs 2-day change copy; voucher 0h vs 72h) can remain if `保存然後` works.

### Reservation Information

- Required fields should be the minimum necessary for operation.
- For hotel/attraction/station/port transfers, require phone, email, English name, departure date/time, hotel address, pickup point, pickup time, drop-off point, Kakaotalk ID, messenger ID, passenger count, and luggage count. Keep airport flight ids **off**.
- For **airport** transfers, **also** require flight fields (arrival/departure flight number and times, etc. — full id list in `haneda-airport-live-notes.md` / `kansai-airport-live-notes.md`). Turn flight ids **on** only for airport products.
- Modal confirm control may show as `已選` rather than `節省`.
- After confirm, the summary under 代表預約信息 must list selected fields. Red “您必須輸入…” = not done.
- Prefer real UI clicks on `[role=checkbox]` rows over assigning `input.checked = true` only (React may ignore synthetic checked).

### Option Management

- Create separate options for each direction and vehicle size via **`註冊/添加選項`** only.
- Option description must include route, vehicle size, usable passenger cap, and luggage cap.
- Price type: `기타 가격 타입 (직접 입력)` / `其他價格類型（手動輸入）`.
- **價格類型名稱 (Korean only):** `{N}인승 가는` (outbound) / `{N}인승 오는` (return).  
  Examples: `5인승 가는`, `7인승 가는`, `10인승 오는`.  
  **Deprecated:** English codes `5seat go`, `7seat go`, `7seat rtn`, `10seat return` (audit correction 2026-08).
- **價格類型說明:** `{N}인승 차량` (already Korean; keep).
- Mark both **required purchase** and **representative** via `role=checkbox` (`aria-labelledby="ETC-required-label"` / `ETC-representative-label`).
- After price-type `완료`, **re-fill the option name** (NOL overwrites with display description).
- Sale period: prefer `1年` (`input[value="ONE_YEAR"]`). Price stays disabled until period exists.
- Fill price **once** (double-fill can produce `7070` style bugs).
- Verify prices from **calendar cells**, not list cards alone.
- Times (Japan hub / airport / Disney / USJ / port / station): **`07:00`–`21:30` / 30 min / 30 unique slots**.  
  **Never** use `09:30` as the first slot for USJ or other Japan private transfers unless Excel explicitly says so.  
  Sequence (韩/繁): `設定時間` → `반복 시간 추가` → `07:00` / `21:30` → `30 分鐘` → **`생성`** → popup `節省` → form **`下個`**.  
  Sequence (简体，已有时段): ⋯`더 보기` → **编辑** → 删旧 → **重复 小时 添加** → `07:00`/`21:30` → **分钟 30** → **生成/一代** → **保存** → **临时保存→下一个**.  
  **Must click generate before modal save.** Verify via **时间段** compact line only.
- Japan fixed fleet: **no** holiday calendar overrides unless Excel says otherwise.
- After all cards exist: **stop on list**; optional `臨時存儲`; never approval.
- **Osaka Station copy:** destination is **`오사카역` only** — never bundle `신오사카역` in product/option/intro/include text.

## Live Listing Workflow

When operating the partner center directly, use `references/nol-transfer-live-listing-workflow.md` + `references/nol-partner-browser-playbook.md`.

Page order (do not skip):

```text
產品列表 resume/create
  → 產品屬性 (含 私人的) → 保存然後 enabled → click
  → 產品介紹 (文案+图片+NONE) → 保存然後 enabled → click
  → 產品法規 (截单3天、包含、代金券、代表预约、取消2天0%) → 保存然後 enabled → click
  → 選項管理 stepper if needed
  → 四个选项 (註冊/添加選項 … 下個) ×4
  → STOP on option list (+ optional 臨時存儲)
```

### Fast path — Japanese airport / hub (7-seat + 10-seat)

1. Read Excel row(s); fix Chinese internal name, Korean product name, four prices.
2. Resume UNPUBLISHED draft by clicking product **card** (`slot___StyledContainer4`); `修復` is often text, not a button.
3. Fill attributes including **私人的**; wait for `保存然後`.
4. Intro + images + Korean copy; wait for `保存然後`.
5. Regulations: full reservation (airport flight ids), voucher, include Korean, cancel manual; wait for `保存然後`.
6. Create four options; each ends with times `생성` + **`下個`**.
7. Stop on option list; optional `臨時存儲`; **never** `批准請求`.

### Fast path — Beijing / Shanghai scenic (holiday overrides) — 提速版

1. **Excel 售价列求值**写入 PRICES map（go≠return 可能不对称，如 **510/500**）；用户说「表内有售价」→ **禁止另算**。
2. 创建草稿：确认钮兼容 **`开始創建产品`** 混写；记下 `id=`。
3. 属性（checkbox 一次；POI 对城）→ 介绍（缩略图×3）→ 法规（包含 `onSave(values)`；预约无航班）— 每页等 **`保存然后` 可点**。
4. **四卡先落列表**（韩文价格类型 + 平日价一次 + 临时保存→下一个）。
5. **时段×4（严格按 §40 SOP）：** 每卡 listClean → 修改选项 → 重复小时添加 → **08:00 / 21:30 / 分钟30 读回** → 生成/一代 → **弹窗「保存」** → compact 28 → **临时保存→下一个**。
6. **时段二次：** 再 open 四卡读 compact；任一张失败只修该卡。
7. **假日：** 每「选项×段」**listClean 再开日历** → 选日 → fill → **完成**；第 4 卡 scroll+mouse；失败只重跑失败段。
8. **格子验收**读容器 `日\n价`（尤其 7 去 **510** / 7 返 **500**）→ 页底 `临时保存` → **STOP 列表**；never 提交审核。

### Fast path — Shanghai Oriental Pearl

See **`references/shanghai-oriental-pearl-transfer.md`** end-to-end (attributes POI, include `onSave(values)`, voucher card text, 4 options, times, holidays).

### Fast path — Top of Shanghai Observatory

See **`references/shanghai-top-of-shanghai-transfer.md`**（POI 上海中心、用户 3 图、售价 213/250 + 假日 304/357/425/**510**/**500**、时段 28、listClean 假日）。

### Fast path — JinMao Tower 88F

See **`references/shanghai-jinmao-tower-transfer.md`**（POI 金茂；用户 3 图；同档售价；**时段必须二次重开验收**；第 4 卡日历 scroll+mouse；永不假报 count=0）。

### Fast path — Madame Tussauds Shanghai

See **`references/shanghai-tussauds-transfer.md`**（POI 杜莎/Madame Tussauds；用户 3 图；同档售价 510/500；**时段：分钟 30 + 结束 21:30 + 生成后弹窗保存**；`fix-tussauds-holidays.mjs`）。

## Airport Reference Map

| Route internal | Notes file | Prices (HKD 7/10) |
| --- | --- | --- |
| `东京市区-羽田机场` / HND | `haneda-airport-live-notes.md` | 70 / 105 |
| `东京市区-成田机场(NRT)` | haneda notes pattern + NRT names | 112 / 175 |
| `大阪市区-关西机场(KIX)` | **`kansai-airport-live-notes.md`** | **99 / 133** |
| `大阪市区-大阪国际机场（伊丹机场）(ITM)` | **`itami-airport-live-notes.md`** | **77 / 105** |

## Detailed live order (Japan airport 7/10) — ITM-validated

```text
1) 產品屬性
   title/managementTitle → FIXED use-date → 運輸貨物
   → 選擇類別（主題）기사제공차량 → 已選
   → 有人數限制 是 → 最少1 最大9
   → 私人的 (mouse on visible label)
   → 進度語言 韓語 → 已選
   → 添加地區和地點 → search+Enter → airport POI → 旅遊地 → 添加
   → wait 保存然後 enabled → click

2) 產品介紹
   headline / highlight / description / checkList / usage (Korean)
   → scheduleType NONE
   → 썸네일 상품 이미지 ×3 (NOT 프로그램)
   → wait 保存然後 enabled → click

3) 產品法規
   min book day 3; qty 1–10; MANUAL confirm 3 DAYS
   → cancel 가능 + 예(수동취소) + windows.0 = 2 / 0%  (no 添加 blank row)
   → 撰写 include: TRANSPORTATION + PICK_UP Korean + exclude → 節省
   → 代表預約信息: airport required ids via mouse → 已選 → summary non-empty
   → 代金券: 예약정보로 확인 · 無需換貨
   → wait 保存然後 enabled → click (or stepper 選項管理 if URL stuck)

4) 選項管理 ×4
   註冊/添加選項 → name/desc/qty
   → 가격 타입 선택 → 기타 가격 타입
      → 名稱 Korean e.g. 7인승 가는 (NOT 7seat go) / 說明 7인승 차량
      → 1–10 + required+대표 → 완료
   → re-fill option name
   → ONE_YEAR → price once → 設定時間 → 반복 → 07:00–21:30 (never 09:30 default) → 30분 → 생성 → 節省
   → 下個 → confirm card on list
   → after four cards: 臨時存儲 optional → STOP (never 批准請求)
```

### Post-review audit notes (Disney + USJ + 东京港, 2026-08)

Reviewed drafts (regulations/options corrected on platform; skill must match):

| Product | Draft id (UNPUBLISHED at audit) |
| --- | --- |
| 东京迪斯尼接送 | `462b9cef-c378-45d7-afd5-9b44f364b378` |
| 大阪环球影城接送 | `4b49b221-a013-4420-9def-ffddfc09a310` |

Corrections applied in skill from that package:

1. FAQ mid-stop Q&A (Korean) — required for private point-to-point transfers.
2. Price-type **name** English → Korean.
3. USJ / Japan times first slot **07:00**, not 09:30.
4. Port products (e.g. 东京港): never leave 代表預約信息 empty — red block stops save; re-check regulations section completeness.

## Automation / CDP Runtime Pitfalls (Grok)

- Chrome CDP needs non-default `--user-data-dir` + `--remote-debugging-port=9222 --remote-allow-origins=*`. Launch the Chrome binary directly; `open -a Chrome --args …` often fails to bind the port.
- **One Playwright CDP session at a time.** Parallel `node` scripts on the same tab cause freezes and “stuck” UI. Kill leftover automation before continuing.
- Long multi-option scripts exceed tool timeouts and look hung — split work and log per option (or run step-by-step when the user wants a visible trail). **分阶段：** 建卡 → 时段 → 假日；不要一个脚本闷头跑全产品无 log。
- After page fills, re-check `保存然後` / `臨時存儲` `disabled` before claiming progress.
- Hidden React checkboxes (私人的, reservation rows): **visible label / mouse click**, then re-read `checked` and **page summary**, not only `input.checked` mid-script.
- Image upload: **section context first**, then file input; never assume any on-page `<img>` count means 썸네일 is done.
- POI: type alone may return empty results until **Enter/search**; second-stage **旅遊地 + 添加** is required after `添加地點`. Reject same-name POIs in the wrong country (e.g. Seoul vs Shanghai 동방명주 / Top of Shanghai).
- Include modal (简体): prefer `AttributeFormPopup.onSave(values)` → parent `optionAttributeBase`; plain button `保存` may no-op.
- Sales calendar: price input stays **disabled** until days are selected; use `custom-caption__NextButton` to change month. **每段 listClean 再开**；读价用容器 `日\n价` 不是 PlainDayButton。
- Create product confirm: match **混写** `开始創建产品`，不要写死单一简/繁串。
- Times multi-edit: **goto list before each option**; exact `重复 小时 添加` button; gen = `생성|生成|一代`; **after gen click modal 保存**; verify **时间段** compact line only. **count≠28/30 → fail, `process.exit(2)` — never exit 0.** Scripts: `fix-jinmao-times` / `fix-pearl-times` / `fix-top-shanghai-times` / `fix-tussauds` holidays 同门禁。
- China times controls: verify **end display = 21:30** and **interval = 30** in DOM **before** generate; never assume fill stuck.
- Create product: **never** fill list search box with product name (modal only + TRANSPORTATION).
- Thumbnail count after upload: if **>3**, delete extras (keep 代表); user gave 3 → keep 3.
- JS filters: use `||` not single `|` when combining boolean conditions (Top Shanghai times script bug).
- Calendar open on later cards: **scrollIntoView + mouse.click**; wait caption before `gotoMonth`.
- Resv modal: **scroll sheet** + **`label[for=id]`** mouse; verify **page summary** after `已选` (not only mid-modal checked dump).
- Kill leftover CDP node processes before a new phase; never trust delayed exit-0 from a script that logged `times {count:0}`.

## Product List Resume Pattern

Draft rows are clickable `div` cards (class often includes `slot___StyledContainer4`), not anchors. Click the card whose text matches the Korean product name. Confirm URL `id=` and title before editing.

## Shanghai scenic transfer references

| Product | Reference | Draft example / notes |
| --- | --- | --- |
| 豫园 | `references/shanghai-yuyuan-transfer.md` | 假日勿直接抄到明珠/Top/金茂 |
| **东方明珠** | **`references/shanghai-oriental-pearl-transfer.md`** | `f8d81d72-…`；7 去春节 **510** |
| **Top of Shanghai** | **`references/shanghai-top-of-shanghai-transfer.md`** | `7805362f-…`；同档售价；时段/日历踩坑全文 |
| **金茂 88 层** | **`references/shanghai-jinmao-tower-transfer.md`** | `6be1a050-…`；verify-before-next；第 4 卡日历滚动 |
| **杜莎夫人** | **`references/shanghai-tussauds-transfer.md`** | `4f20f9a8-…`；时段弹窗必保存；假日 510/500 |

## Final Check

Before saying the listing is ready, apply `references/fill-flow-checklist.md` **and** § **MANDATORY Verify-Before-Next**, plus:

- [ ] **Excel every sell/holiday cell** matches calendar (including asymmetric rows like **510** vs **500**) — read **cell container** `日\n价`, not day-button only
- [ ] Sell prices came from **Excel 售价列求值**, not re-derived `/0.8` when table already has sell columns
- [ ] `私人的` selected; theme `기사제공차량` / 司机提供车辆; language Korean; POI set (correct city)
- [ ] 썸네일 **≥3** images under 상품 이미지 (not only under 프로그램)
- [ ] 代表預約信息 summary non-empty for airport/transfer (flights on for airports)
- [ ] Include Korean text visible on regulations page after 撰写
- [ ] Four option cards with Korean price-type names; China times **时间段** = **28** × `08:00`…`21:30` (Japan hub = **30** × `07:00`…`21:30`)
- [ ] China times: **分钟 30 已选**、结束 **21:30**、生成后点了弹窗 **「保存」**（§40）
- [ ] Times re-verified by **re-opening each option** after save (not only mid-setTimes log / not only modal list)
- [ ] 创建时未把产品名放进列表搜索框；缩略图 **3** 张（无重复 6 张）；预约 **页面摘要** 非空
- [ ] Holiday segments each closed with **完成** after **listClean reopen** path; later cards used **scroll+mouse** on 销售日历管理
- [ ] Stopped on **option list** without clicking approval / 提交审核
- [ ] Explicit report: **`批准請求` / `提交审核` was not clicked**
- [ ] No claim of “done” for any step whose gate table cell is fail
