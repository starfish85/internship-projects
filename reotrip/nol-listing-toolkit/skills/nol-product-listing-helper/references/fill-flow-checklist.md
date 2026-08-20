# Fill Flow Checklist

Use this checklist before saying a NOL product or option is ready.

## ⛔ Verify-Before-Next（金茂 2026-08-06 起强制）

用户：*「先检查是不是真做好了再做下一个」*。  
**任一未勾 = 不得进入下一阶段，不得向用户说「已做好」。**  
主卡点顺序见 `SKILL.md` **§ 执行优先级卡点**。

- [ ] 当前页推进靠 **`保存然后` / 临时保存→下一个**，不是跨步 `goto` URL
- [ ] 创建：产品名只进 **弹窗**，**没进列表搜索框**
- [ ] 属性：主题 + 语言 + 私人的 + POI 齐 → **`保存然后` 曾 enabled**
- [ ] 缩略图：썸네일 **正好 3**（无重复 6 张；有「代表」）
- [ ] 预约：点 **已选** 后 **页面摘要非空**（不是只靠弹窗 checked 中间态）
- [ ] 时段：间隔 **分钟 30 读回确认**；结束 **21:30**（非 00:30 / 21:00）
- [ ] 时段：生成后点了弹窗底部 **「保存」**（用户：*这里要点保存*）
- [ ] 时段：读过 **`时间段` compact 行**，China = **28 / 08:00 / 21:30**（或 Japan **30 / 07:00 / 21:30**）
- [ ] 时段：**没有**出现脚本 log `times { count: 0 }` 仍宣称 done / **exit 0**
- [ ] 时段：四卡 **临时保存→下一个 之后又逐卡重开** 再读一遍仍正确
- [ ] 价格类型名称 = 韩文 `N인승 가는/오는`（**无** `5seat go` 英文码）
- [ ] 假日：读过日历容器 **`日\n价`**（含 7 去 **510** / 7 返 **500** 若表内如此）
- [ ] 假日：后几卡 `销售日历管理` 用了 **scrollIntoView + mouse**（防 caption=null）
- [ ] 同时只跑 **一个** CDP 脚本；残留 node 已杀
- [ ] 未点 **提交审核 / 批准请求**

## Product Attributes

- Product name is Korean and route-specific.
- Partner/internal name is filled if available (from Excel Chinese route name).
- Usage type is date-specified.
- Product category is `运输货物`; theme/category is `기사제공차량`.
- Person limit, private/group, min/max people, nationality, language, and location are set.
- **`私人的` is selected** under 團體/私人 (`tourTypes` value `0`). Red `請選擇旅遊類型` means it is missing. Prefer visible-label click when the checkbox is off-screen.
- Theme `기사제공차량`, progress language Korean, min/max people (airport often 1/9), and destination POI (with `旅遊地` type) are set.
- This page’s **`保存然後` was enabled and clicked** before moving to introduction (no URL skip).

## Copy And Media

- One-line marketing copy is Korean and benefit-focused.
- 3-line summary has exactly three lines.
- Product introduction explains what is included and how the customer uses the product.
- If the source notes say no voucher/ticket is needed, driver contacts by WhatsApp/SMS, route/time/address changes require advance notice, or booking transport details must be supplied, those points are visible in customer-facing Korean copy.
- If the product is a hotel/attraction transfer like Tokyo city hotel ↔ Tokyo Disney Resort, the copy asks customers to enter hotel name/address, attraction pickup/drop-off or pickup place, use time, and reachable mobile phone number.
- If the product is a port transfer like Osaka city hotel ↔ Osaka Port, the copy asks customers to enter hotel name/address, port pickup/drop-off point, use time, reachable mobile phone number, ship name, and boarding/disembarking information.
- At least three relevant images are uploaded under **`썸네일 이미지` / `상품 이미지 등록(3개 이상)`**; representative image is set when required.
- Images were **not** only placed under **`프로그램 이미지`**. If that happened, program images were deleted and re-uploaded to 썸네일.
- Red text `必須至少註冊 3 個縮略圖。` is gone (authoritative), not merely “some img tags exist on the page”.
- **杜莎/用户给 3 图：** 썸네일 **正好 3**。若出现 6 张重复 → 删底部 3 张，**保留带「代表」的 3 张**（用户截图否决重复图）。
- If the user supplied exact images, those supplied files were used once (no double upload) unless instructed otherwise.
- Uploaded images came from destination-similar files in `~/Downloads` when available, for example `天坛1.jpg`, `天坛2.jpg`, and `天坛3.jpg` for Tian Tan, or `圆明园1.avif`, `圆明园2.avif`, `圆明园3.avif` for Yuanmingyuan.
- Upload-ready copies were created by changing only the copied files' suffixes to `.jpg` or `.png`; the original Downloads files and unrelated files were not altered.
- For ITM, workspace copies live under `upload-ready-images/itami-airport/itami-1..3.jpg`.

## Policies

- Confirmation method and required time are set.
- Voucher usage is selected (`예약정보로 확인` + `無需換貨` when no-voucher transfer).
- Include popup has the relevant include category checked and its text field is not blank. Customer-facing include text is Korean unless the product-specific reference explicitly marks the field internal-only.
- Must-know, how-to-use, FAQ, include/exclude, reservation info, and cancellation terms are filled.
- FAQ includes mid-stop denial (private transfer standard):
  - Q `중간에 다른 장소에서 승하차할 수 있나요?`
  - A point-to-point only / no intermediate stops (full Korean in skill).
- **代表預約信息** summary is non-empty (or 按數量 filled). Red `您必須輸入代表預訂信息…` means regulations incomplete — especially re-check port products.
- Customer-facing free-text values are Korean. No Chinese snippets such as `接送服务` or `停车费` remain in option include/exclude rows unless the field is explicitly internal-only.
- Cancellation uses `是（手动取消）`, not `否（自动取消）`.
- Required reservation fields are truly necessary; optional fields are not marked required unless needed.
- **代表預約信息** is filled and the summary shows selected fields (not red `您必須輸入代表預訂信息…`). Airport products include flight required ids. Modal saved via **`已選`**.
- **杜莎/预约验收：** 弹窗内 scroll + `label[for]` 点击 → 读 checked → **`已选`** → 再读 **页面摘要**。仅弹窗中间态 / 只 force input = **未完成**（用户：*选了但没选上 / 每次选择要验收*）。
- No blank cancel window row (`windows.1` empty) blocking save.
- Regulations **`保存然後` was enabled and clicked** before options (no routine URL jump to option).

## Options

- Each direction and vehicle size has its own option.
- New options were created with `註冊/添加選項`; existing option cards were not opened with `옵션 수정하기` unless intentionally editing.
- Option name and description match the route, vehicle, passenger cap, and luggage cap.
- Option include/exclude rows were checked after saving. For Japanese transport-hub products, included transfer and parking fee are visible in Korean, and ticket/child-seat/night-surcharge exclusions are Korean.
- Vehicle capacity text is normalized from the source table without preserving obvious typos, for example `10座：9人+9人+10个行李` should become maximum 9 passengers plus 10 luggage pieces when that is the intended capacity.
- Price type **name is Korean** (e.g. `7인승 가는` / `7인승 오는`), **not** English `7seat go` / `5seat go` / `10seat rtn`.
- Price type **description** is Korean vehicle text (e.g. `7인승 차량`).
- Representative price is set on exactly one applicable price type.
- Both the representative-price checkbox and required-purchase checkbox are visibly selected on the price type.
- Product and option purchase quantity are at least `1`.
- Each option card appeared after the option-form save path before starting the next option.
- **Edit existing option:** save with **`临时保存` → `下一个`** (not next alone). Leave dialog (`有变化…`) means unsaved — stay with 消除 and save. See `nol-draft-edit-save-playbook.md`.
- Price-type dialog **stored name** is Korean (`N인승 가는/오는`), verified by re-opening the dialog (list chip alone is not enough).
- Japan times: **时间段** line is `07:00 · … · 21:30` (30 slots). Not a lone `21:00`. Must have clicked **生成** before modal 保存.
- Osaka Station copy: no `신오사카역` anywhere customer-facing.
- Excel red-note fixes: one product at a time; report; wait for user check.

## Sales Calendar

- Sale period is correct.
- If the source workbook's sale-price cells are formulas and cached values are blank, prices were derived from the displayed formula or screenshot instead of treating blanks as missing.
- **User 2026-08-06:** when Excel already has **售价列** (even as formulas), use **evaluated sell values** — do **not** recompute with `/0.8` and overwrite.
- If the Japan transfer source notes say fleet cost is fixed and no holiday markup applies, no October/February/May holiday overrides were added.
- For China scenic (豫园 / 东方明珠 / **Top of Shanghai** / **JinMao 88F** / **杜莎** / 北京等), every holiday cell was taken from **that product’s Excel row** — not copied from a sibling product. Especially: **go≠return** and **5≠7** may differ (Pearl / Top / JinMao / Tussauds: 7-seat go spring **510**, return **500**).
- If the desired period was partially in the past or rejected by NOL, the visible retained period was recorded and reported honestly, for example quick `1年` became `2026-08-03 ~ 2027-08-03` on 2026-08-03.
- Normal price is entered first.
- Prices were verified from visible calendar cells or `销售日历管理`, not from the option list. Saved option cards usually do not show prices.
- **Cell DOM (Top Shanghai 2026-08-06):** day `button` only shows the day number; price is sibling / container text **`1\n510`**. Verify via `td.rdp-cell` / `[class*="custom-day___StyledContainer"]` second line, screenshot, or `sale-period-day-content` node — **not** `PlainDayButton.innerText` alone.
- If a reopened option shows a disabled blank `請輸入價格` textbox, do not mark price missing until the calendar cells are checked. The saved textbox can look empty even when the calendar has the correct price.
- Holiday/special date overrides are entered separately.
- For live NOL calendar work, each holiday segment was saved separately after visible-cell verification; October, February, and May were not left in one unsaved popup.
- **Per segment reopen (Top Shanghai):** before each Oct/Feb/May window, return to clean option list then open calendar again. Continuous multi-segment without listClean caused `caption=null` / month-nav fail on later options.
- If a later holiday month was edited after October, October was reopened or otherwise verified to ensure its price did not change.
- Override windows are correct for the active sales year, for example `2026-10-01~2026-10-10`, `2027-02-01~2027-02-15`, and `2027-05-01~2027-05-10` when sales period is `2026-08-01~2027-07-31`.
- Sale status is enabled.
- Time slots match operating rules and duplicates are removed.
- For live China scenic time setup, follow **SKILL §40 SOP** end-to-end:
  - start **08:00**, end **21:30** (hour left / minute right; reject **00:30** end),
  - interval **分钟 30 读回确认**（用户：*分钟都没选到*）,
  - `生成`/`一代` only when enabled,
  - **popup bottom 保存** after list shows 28（用户：*这里要点保存* — 弹窗保存，不是表单临时保存 alone）,
  - form **时间段** compact = **28 / 08:00 / 21:30**.
- **JinMao / 杜莎 / multi-option:** after all options saved, **re-open each card** and re-read 时间段 — mid-script `setTimes` / modal-list-only is not enough. `times {count:0}` then `done` is a **failed listing step**.
- Wait for `#name` filled before reading times (load race ≠ empty times).
- **Multi-option time edit:** each option opened from a **clean list** (`goto` list if `修改选项` count is 0). Exact button `重复 小时 添加` (not parent). Then **临时保存→下一个**.
- If the source specifies `07:00 ~ 21:30` every 30 minutes, exactly 30 slots are visible from `07:00` through `21:30`.
- **4th+ calendar button:** scroll into view + mouse click; if `caption=null`, do not mark holiday done.
- First slot is **`07:00`**, not `09:30` (USJ audit correction). Do not use park-open time as transfer start unless Excel says so.
- For Osaka Port-style 7-seat/10-seat transport-hub options, each of the four saved options has verified 30-slot time lists, not merely filled start/end/interval controls.
- After selecting end time or interval, no stale dropdown-confirm coordinate was clicked after the dropdown had already closed.
- If the time popup closed before the generated slot list was visible, time setup is not verified. Do not mark the listing complete without either repairing it or telling the user that time slots remain unverified/incomplete.

## Final Review

- No Korean or Chinese field is pasted into the wrong language field.
- Prices are HKD and match the source Excel/CSV table exactly (including **510** vs **500** where Excel is asymmetric).
- The visible option cards are toggled to selling/on sale.
- If the user asks whether prices are missing, reopen the relevant option/calendar immediately and verify visible calendar-cell values before answering.
- Optional `臨時存儲` / `临时保存` on the option list; green toast when used.
- `批准請求` / `提交审核` / approval submission was not clicked unless explicitly requested.
- For Japan hub/airport runs after user rule **「以后就停在这里」**: automation **stopped on the option list** once cards exist; no further auto-navigation. Same stop for China scenic after holidays verified.
- The final response clearly says whether `臨時存儲`/`临时保存` was clicked and confirms `批准請求`/`提交审核` was not clicked.
- The final response does not claim time slots were set unless the generated list was actually observed and saved (**时间段** line count).
- Did not run concurrent CDP automation scripts that freeze the partner center.
- Create-product confirm used a matcher that accepts mixed 简繁 **`开始創建产品`**.
