# NOL Partner Browser Playbook

Use this playbook together with `nol-transfer-live-listing-workflow.md` when operating the live NOL partner center. It converts the learned live workflow into ready-to-use browser logic so Codex does not need to rediscover modal behavior, selectors, calendar quirks, or recovery steps.

## Non-Negotiable Stops

- **Verify-Before-Next (JinMao 2026-08-06):** do not advance phase or tell the user “done” until the **DOM gate** passes. Times: only **时间段 compact** with China `28/08:00/21:30` (or Japan `30/07:00/21:30`). **`times {count:0}` then `done` is forbidden.** After temp-save→next, **re-open each option** and re-read. See `SKILL.md` § MANDATORY Verify-Before-Next.
- Never click `批准請求`, `승인 요청`, `提交審核`, `提交审核`, or any approval-submission button unless the user explicitly requests approval submission in the same turn.
- If the user says a standing ban such as “坚决不允许点击批准请求”, treat it as session-wide. Temporary save only.
- Treat approval as a danger-zone control. If it is visible next to temp-save (`临时保存` / `臨時存儲`), do not click by coordinates. Resolve the intended button by exact text and DOM index.
- **Editing existing options (user 2026-08):** after any change, save with **`临时保存` → `下一个`** (not next alone). Full rules: `nol-draft-edit-save-playbook.md`.
- **Leave dialog** (`有变化…更改将丢失…`) means **not saved**. Click **消除** to stay; never **确定** to discard. Then run temp-save → next.
- UI may be **Simplified Chinese** (`临时保存`/`下一个`/`修改选项`/`已选`/`提交审核`/`重复 小时 添加`). Match 简+繁+韩; do not hardcode only 繁体.
- **Time slots (简体, post-Osaka-Station + 杜莎 2026-08-06):** open editor with time-field **⋯ (`더 보기`) → 编辑**; **重复 小时 添加** → set start/end/interval with **read-back** → **生成/一代** → **modal bottom 保存**（用户：*这里要点保存*）→ form **临时保存→下一个**.  
  **Never generate without modal 保存** (modal list shows 28 then closes → compact still 0).  
  **Never modal-save without generate** (leaves a single `21:00`).  
  China: end **21:30** not `00:30`; interval **30 必须选上**（用户：*分钟都没选到*）. Verify only **时间段** compact (`08:00…21:30` ×28 / Japan `07:00…21:30` ×30).
- Do not change product settings that are outside the active listing flow. Avoid unrelated switches, supplier settings, settlement settings, category changes after creation, or existing product drafts not named by the user.
- Use `臨時存儲` only when the workflow calls for preservation or the user requests final temporary save.
- For transfer workflows, preferred end state after options exist is the **option list page**. Optional `臨時存儲`. Do not infer that `批准請求` is needed. User standing rule (2026-08-05): **「以后就停在这里」** = stop on option list when four cards are done.
- Before typing a major section, state the exact values in Chinese. Keep a visible trail: field name, value, and save result.
- If a save would overwrite an already completed holiday segment, stop, verify visible calendar values, and repair only the wrong dates.
- **Strict Excel/CSV:** never invent prices or holiday tiers. Source only the user workbook (e.g. `NOL 待上架产品.xlsx` / `日本接送产品` / `国内接送`).  
  **Never assume go=return or 5-seat=7-seat holiday symmetry.** Live Pearl / Top of Shanghai table: 7座去程春节 **510** vs 7座返程 **500** (user 2026-08-06). Verify on **calendar cell containers** (`日\n价`), not day-button text alone. When Excel has 售价列: **do not recompute**.

## Page Gate Rules (User Corrections 2026-08-04~05)

These override older “skip ahead with URL” habits.

1. **No routine URL jump** across `properties` → `introduction` → `regulations` → `option`. Do not open a later step via `goto(.../option?id=...)` while earlier pages still have grey `保存然後` or red required errors. Advance with enabled **`保存然後`** or enabled **stepper** only.
2. **`保存然後` is the completeness gate.** A section is incomplete until that button is **enabled** and clicked. Grey = missing required fields.
3. **Attributes — 私人的:** under `團體/私人`, select `私人的` (`input[name=tourTypes][value="0"]`). Missing → red `請選擇旅遊類型。` and disabled save buttons. Prefer **visible label mouse click** (checkbox often off-screen at x≈-9999).
4. **Regulations — 代表預約信息:** must open the modal, set required checkboxes (airport includes flight ids), confirm with **`已選`**, verify summary text (電話/航班/飯店…). Red `您必須輸入代表預訂信息…` blocks `保存然後`. User screenshot callout: **「这些都还没选」**. Synthetic `checked=true` alone is unreliable — re-verify **summary after `已選`**.  
   **JinMao / 杜莎:** many required inputs sit at `y≈-9999` → scroll action-sheet body first → **`label[for="${id}"]` mouse.click** → read `aria-checked` (already true → do not click again) → **`已选`** → **page summary non-empty** (用户：*选了但没选上 / 每次选择要验收*).
5. **Option form — `下個`:** after price/times, click the wide blue **`下個`** to save the card. User: **「点这个不就好了」**. Edit path: **临时保存→下一个**.
6. **One automation process only.** Parallel Playwright CDP scripts freeze NOL and look “stuck”. Kill previous jobs before starting a new one; log per option. **Delayed exit-0 from a script that logged `times {count:0}` is not success** — re-verify DOM.
7. Direct option URL is **last resort** only after regulations truly complete and stepper still broken — not a shortcut past red reservation/private fields.
8. **Introduction images — 썸네일 only (ITM 2026-08-05):** upload to `썸네일 이미지` / `상품 이미지 등록(3개 이상)`, **not** `프로그램 이미지`. User: *上传错地方了* / *这里三张图要删掉*.

## Attributes: Private Tour Type

```js
// Prefer visible label — hidden input is often off-screen
const lab = document.querySelector('input[name="tourTypes"][value="0"]')?.closest('label');
const r = lab.getBoundingClientRect();
// page.mouse.click(r.x + 12, r.y + r.height/2)
// Then verify:
// document.querySelector('input[name="tourTypes"][value="0"]').checked === true
```

Do **not** rely on `getByText('私人的', { exact: true })` alone — label text may be multi-line (`私人的\n繼續保留方`) and exact match times out.

If `保存然後` dies after a fill pass, re-check that `tourTypes` value `0` is still `checked: true`.

## Browser Session Setup

### Preferred: Codex / Chrome plugin Browser skill

Use the in-app Browser skill. If using `node_repl`, initialize or claim the partner-center tab:

```js
if (globalThis.agent?.browsers == null) {
  const { setupBrowserRuntime } = await import('/Users/mac/.codex/plugins/cache/openai-bundled/browser/26.721.41059/scripts/browser-client.mjs');
  await setupBrowserRuntime({ globals: globalThis });
}
if (globalThis.browser == null) {
  globalThis.browser = await agent.browsers.getForUrl('https://tour.triple.partners/product-management/registration?lang=zh-tw');
}
await browser.nameSession('NOL上架-不提交审核');
var tabs = await browser.user.openTabs();
var tabInfo = tabs.find(t => (t.url || '').includes('tour.triple.partners/product-management/registration'));
var tab = tabInfo ? await browser.user.claimTab(tabInfo) : await browser.tabs.new();
if (!tabInfo) await tab.goto('https://tour.triple.partners/product-management/registration?lang=zh-tw');
await tab.playwright.waitForLoadState('domcontentloaded');
```

If a saved `tab`/`listingTab` handle becomes stale, claim the visible partner-center tab again by URL. Do not inspect cookies, local storage, or session stores.

### Fallback: Playwright over CDP (Grok / non-Codex)

When `setupBrowserRuntime` fails with `privileged native pipe bridge is not available` / `browser-client is not trusted`:

1. Chrome rejects remote debugging on the **default** user-data-dir. Copy a slim profile to a temp dir (exclude Cache/Code Cache/GPUCache).
2. Launch the Chrome binary with `--user-data-dir=/tmp/chrome-nol-debug-profile --remote-debugging-port=9222 --remote-allow-origins=*`.
3. Do not rely on `open -a "Google Chrome" --args --remote-debugging-port=9222` alone — the flag may appear in `ps` while port 9222 never listens.
4. Connect with Playwright: `chromium.connectOverCDP('http://127.0.0.1:9222')`.
5. AppleScript “Execute JavaScript” is often disabled; do not depend on it.

Session intent remains: list products, temporary-save only, never approval.

Useful inspection:

```js
async function pageText(limit = 12000) {
  const text = await tab.playwright.locator('body').innerText({ timeout: 10000 });
  nodeRepl.write(text.slice(0, limit));
  return text;
}

async function shot(label = 'nol-page') {
  return await tab.screenshot({ label });
}
```

## Start Or Resume Draft

When the user gives a new route, start from `新產品註冊`. When the URL has an existing `id=...` and the product name matches the active route, resume that draft.

New product creation modal:

1. Click `新產品註冊` / `新产品注册`.
2. **Hard rule (杜莎 用户「别放搜索框」):** fill the **modal** product-name input only. **Never** put the product name in the background list **search** box. If there are two visible text inputs, the modal product-name input is usually `input.nth(1)`.
3. Select `TRANSPORTATION` / transportation product type.
4. Click create confirm. **Live text may be 简繁混写 `开始創建产品`** (not pure `开始创建产品` / pure `開始創建產品`). Match loosely or enumerate buttons.
5. Verify the redirected URL contains `/registration/properties?id=...` and the page shows the Korean product name. **Record `id=` immediately.**

Safe creation snippet:

```js
async function createTransportationProduct(productName) {
  await tab.playwright.getByText(/新产品注册|新產品註冊/).click();
  await tab.playwright.waitForTimeout(800);
  const inputs = tab.playwright.locator('input');
  const count = await inputs.count();
  await inputs.nth(count > 1 ? 1 : 0).fill(productName);
  await tab.playwright.getByText('TRANSPORTATION').click();
  // 简繁混写: 开始創建产品
  const createBtn = tab.playwright.locator('button').filter({
    hasText: /开始.*产品|開始.*產品|創建产品|创建產品/,
  });
  await createBtn.last().click();
  await tab.playwright.waitForURL(/registration\/properties/, { timeout: 30000 });
  await tab.playwright.waitForTimeout(1500);
}
```

## Field-Fill Discipline

For each page:

1. Announce all values before entry.
2. Fill fields using labels first, then placeholders, then nearby text selectors.
3. Read back the section with `pageText()` or targeted locators.
4. Save or move next only after visible values match the source.
5. Report the section result to the user.

Use exact values from the active route data. For Beijing attraction transfers, generate Korean text from the template in `nol-transfer-live-listing-workflow.md`.

## Product Attributes Page

Expected values:

- Product name: `베이징 시내 호텔 ↔ {destination_ko} 단독 차량 편도 이동 서비스`.
- Partner/internal name: Chinese route name.
- Subtitle: blank.
- Usage type: date specified at booking.
- Category: `運輸貨物`.
- Theme: `기사제공차량`.
- People limit: yes.
- Travel type: private.
- Participants: min `1`, max `6`.
- Nationality: no restriction.
- Language: Korean.
- POI: real destination POI.

POI rule:

- Search the Korean destination first, for example `천단` / `이타미 공항` / `간사이 국제공항`.
- Submit search with **Enter or the search button** — typing alone may return an empty map with no list.
- If multiple POIs appear, choose the official attraction/airport/park **관광지** POI rather than a hotel (`숙소`), ticket product, or manual text-only entry.
- After selecting a result: click **`添加地點`**, then in the second dialog choose type **`旅遊地` / `TRAVEL_PLACE`**, keep `nameTag`, click the lower **`添加`**. Upper add alone often only opens the type dialog.
- If the exact POI is unclear, inspect the visible list. Do not invent a coordinate-less location.

Save rule:

- Use `保存然後` / next-save button only after the current page displays the expected product name, internal name, category/theme, language, and POI.

## Images

Before asking the user for images, search Downloads for basename matches to the Chinese destination. Keep originals intact. The current platform accepts suffix-only copies, so do not spend time converting image content unless upload fails.

### Critical: two upload zones (ITM 2026-08-05 user corrections)

| UI block | Purpose | Product listing requirement |
| --- | --- | --- |
| **`썸네일 이미지` → `상품 이미지 등록(3개 이상)`** | Product listing thumbnails | **Required ≥3** |
| **`프로그램 이미지`** | Optional program / long-description images | **Do not** put product photos here by mistake |

User corrections:

- *「上传错地方了，应该上传在这里」* — empty 상품 이미지 with red `必須至少註冊 3 個縮略圖。`
- *「这里三张图要删掉」* — three photos under 프로그램 이미지 must be removed via red **×**.

### Correct upload binding

```js
// Prefer FIRST image file input under 상품 이미지 / 썸네일 — never .last() blindly
const fileInputs = page.locator('input[type=file][accept*="image"]');
// Verify ancestor text includes 상품 이미지 등록 before setInputFiles
await fileInputs.first().setInputFiles([img1, img2, img3]); // multi=true supported
// Success = three imgs inside 썸네일 section + red error gone
// Counting document.querySelectorAll('img') alone is NOT enough (program section may have previews)
```

Local search command pattern:

```bash
find "$HOME/Downloads" -maxdepth 1 -type f \( -iname '*天坛*' -o -iname '*天壇*' \)
```

Upload rules:

- Need at least three destination-matching images **in 썸네일**.
- Prefer files numbered `1`, `2`, `3` whose basename contains the destination Chinese name.
- Create upload-ready copies in the workspace or `upload-ready-images/` by changing only the copy suffix to `.jpg` or `.png`. This is allowed even when the source suffix is `.avif`, `.webp`, missing, or otherwise unsupported.
- Only convert the actual image format if the platform rejects the suffix-only copy during upload.
- If fewer than three usable files exist, stop and ask the user to upload the missing images.
- For the Tian Tan draft, the authorized files were `/Users/mac/Downloads/天坛1.jpg`, `/Users/mac/Downloads/天坛2.jpg`, and `/Users/mac/Downloads/天坛3.jpg`.
- For ITM: `upload-ready-images/itami-airport/itami-1.jpg` … `itami-3.jpg`.
- Upload all three, then wait until thumbnails are visible **under 상품 이미지**. If a representative image must be chosen, choose a clear destination image, usually the first uploaded image unless the user indicates otherwise.
- If the user supplies exact image files in the prompt, use those files and upload all relevant supplied images. For the Osaka Station run this meant all 11 files `/Users/mac/Downloads/大阪站1.jpg` through `/Users/mac/Downloads/大阪站11.jpg`, copied into `upload-ready-images/osaka-station/`.
- **杜莎 2026-08-06:** user gave **3** images → 썸네일 must show **exactly 3**. Double-upload produced **6** → user rejected; delete bottom duplicates, **keep thumbs with 代表**.
- If photos landed in 프로그램 이미지: scroll there, click each red ×, re-upload to 썸네일.
- In this browser runtime, `locator.setInputFiles()` may be unavailable. Use the upload button plus a file chooser **scoped to the 썸네일 button**:

```js
var chooserPromise = tab.playwright.waitForEvent('filechooser');
// Prefer the 이미지 등록 under 상품 이미지 등록, not the lower 프로그램 one
await tab.playwright.getByText('이미지 등록').first().click();
var chooser = await chooserPromise;
await chooser.setFiles(imagePaths);
```

Suffix preparation shell pattern:

```bash
mkdir -p upload-ready-images
cp "$HOME/Downloads/圆明园 1.avif" "upload-ready-images/圆明园1.png"
cp "$HOME/Downloads/圆明园 2.avif" "upload-ready-images/圆明园2.png"
cp "$HOME/Downloads/圆明园 3.avif" "upload-ready-images/圆明园3.png"
```

Use the active destination name in place of `圆明园`. If the Downloads filenames have no spaces, keep the same pattern without spaces. Do not rename unrelated originals.

## Product Rules Page

Critical include/exclude rule:

- Customer-facing include/exclude typed values must be Korean. Do not paste Chinese snippets such as `1. 接送服务 2. 停车费` unless the task explicitly says the field is internal-only.
- In Japanese transport-hub option include popups, a reliable Korean include is `運輸(도쿄 시내 호텔 ↔ 도쿄항 편도 전용 차량 이동 및 주차비 포함)`. If `其他` is needed to make the row persist, use `其他(픽업/샌딩 서비스 및 주차비 포함)`.
- Verify the text remains visible under the selected include category before saving the popup. A checked category with a blank text field is incomplete.
- Exclude remains `가이드 / 팁 / {destination_ko} 티켓`.

Critical cancellation rule:

- For `是否需合作方确认`, select `是（手动取消）`.
- Do not select `否（自动取消）`.
- Set the normal cancellation term to `2` business days before use, `0%` fee deducted, `100%` refund; after cutoff non-refundable.
- Before saving the rules page, read back the visible page/modal text and confirm it contains the manual-cancellation choice, not the automatic-cancellation choice.
- After clicking `添加` for the cancellation policy, NOL may create a saved rule row plus a new blank rule row. Delete the blank row; otherwise `保存然后` can remain disabled even though the real `2` business days / `0%` rule is present.

Reservation-info checkbox recovery:

- The representative reservation-info dialog can render visible row labels through a virtualized list. Do not rely on global `label` indexes after scrolling or after prior partial clicks.
- Inspect the actual checkbox ids with DOM, then set required fields by id/meaning. For transfer/station products the useful required ids are typically:
  - `CELLPHONE-required`
  - `EMAIL-required`
  - `ENGLISH_LAST_NAME-required`
  - `ENGLISH_FIRST_NAME-required`
  - `DEPARTURE_DATE_TIME-required` when the product requires the use/departure date and time as a standard field
  - `HOTEL_NAME-required`
  - `HOTEL_ADDRESS-required`
  - `PICKUP_AREA-required`
  - `PICKUP_TIME-required`
  - `SENDING_AREA-required`
  - `BOOKED_TIME-required`
  - `MESSAGING_APP_ID-required`
  - `NUMBER_OF_PEOPLE-required`
  - `NUMBER_OF_SUITCASES-required`
- For station/transport-hub transfers, ask for train information in copy or additional request if no standard train-info field exists.
- Turn off airport-specific ids (`PNR-required`, `DEPARTURE_FLIGHT_NUMBER-required`, `ARRIVAL_FLIGHT_NUMBER-required`, `ARRIVAL_DATE_TIME-required`) unless it is actually an airport transfer.
- The page summary may mistranslate some selected fields after saving. Treat the checkbox ids as source of truth and preserve a visible booking-field sentence in the product copy.

Voucher/no-exchange recovery:

- For no-voucher transfer products, choose a template whose visible method is `与预订信息确认` / reservation-information confirmation, even if the template name references an older route.
- A warning such as voucher issue time `0小时` differing from product info `72小时` can be saved when the page allows it. Do not switch to separate-voucher issuance to silence the warning.

## Option Creation Order

Create and save options one at a time:

1. 5-seat outbound.
2. 7-seat outbound.
3. 5-seat return.
4. 7-seat return.

For each option:

- Option name and description first.
- Sale period and normal price second.
- Price type third.
- Time slots fourth.
- Option purchase quantity and sale switch last.
- Save the option card before moving to the next option.
- To create the second, third, and fourth options, click `註冊/添加選項`. This opens a fresh option form and does not overwrite prior saved option cards.
- Do not click `옵션 수정하기` unless intentionally editing an existing saved option card.
- After every option form is saved, inspect that a new option card exists before creating the next one.
- In the custom price-type popup, the textbox selectors can accidentally include the parent option-name field and option min/max fields. Fill by exact placeholders: price type name placeholder `輸入的名稱將顯示在銷售渠道上。`; price type description placeholder `例) 滿 19 歲以上`; then fill the last two tel inputs in the active price-type dialog as `1` and `10`.
- **Price-type name must be Korean** (audit 2026-08): e.g. `5인승 가는` / `7인승 오는`. Do **not** enter English `5seat go` / `7seat rtn` in 價格類型名稱. Description remains `N인승 차량`.
- After completing the custom price-type popup, re-read the option name. NOL can overwrite the option name with the price-type description. Refill the full option route name before setting sales/time and again before clicking `下個`.

Safe option-form save:

```js
var candidateNext = await tab.playwright.evaluate(() => {
  return Array.from(document.querySelectorAll('button')).map((b, i) => {
    const r = b.getBoundingClientRect();
    return {
      i,
      text: (b.innerText || '').trim(),
      disabled: b.disabled || b.getAttribute('aria-disabled'),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height)
    };
  }).filter(o => o.text === '下個' && o.w > 500 && !o.disabled);
});
if (candidateNext.length !== 1) throw new Error('Inspect before clicking 下個: ' + JSON.stringify(candidateNext));
await tab.playwright.locator('button').nth(candidateNext[0].i).click({ timeout: 5000 });
await tab.playwright.waitForTimeout(1500);
```

Representative/required checkbox recovery:

- After saving, inspect the option card. It must visibly show required-purchase and representative-price status.
- If absent, reopen the price-type popup, tick both checkboxes, save the price type, then save the option again.
- In the price-type popup, select `기타 가격 타입 (직접 입력)`. Fill **Korean** type name (`N인승 가는` / `N인승 오는`) and Korean description (`N인승 차량`), set min/max `1~10`, click both actual square checkboxes for `必需品购买` and `대표가`, verify both are checked, then click popup `완료`.
- English short codes (`5seat go`, `7seat return`) are **deprecated** after 2026-08 review. Prefer Korean within the ~10 character name limit.

## Time Slot Helper

Expected valid slots are 28, from `08:00` through `21:30`.

```js
const expectedSlots = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30',
  '20:00','20:30','21:00','21:30'
];
```

For routes whose source specifies `07:00` through `21:30`, such as the Tokyo Disney Resort hotel-transfer run, expected valid slots are 30:

```js
const expectedSlots0700 = [
  '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00','20:30','21:00','21:30'
];
```

If the generated popup has 29 rows, delete the empty duplicate `选择` row, then verify the 28 values remain.
If the generated popup has 31 delete buttons for a `07:00 ~ 21:30` run, delete the final blank `选择` row, then verify 30 unique time values remain.

Hard operation sequence (China scenic default; Japan hub uses `07:00` / 30 slots — same save rules):

1. Open `设置时间` / `設定時間` (or ⋯ → **编辑** if slots already exist).
2. Delete old rows if any.
3. Choose exact button `重复 小时 添加` / `반복 시간 추가` (not parent).
4. Set first start `08:00` (China) or `07:00` (Japan). **Read back** the displayed value.
5. Set last start **`21:30`**. **Read back** — reject UI showing `00:30` / `21:00` / `00:00` (杜莎：结束分钟列点错).
6. Set interval **`分钟` → `30`**. **Read back** interval is 30 — user 杜莎: *「分钟都没选到」*. Do not generate while interval is default/empty.
7. Wait until `生成` / `一代` / `생성` is **enabled**, then click.
8. Verify generated list is exactly `expectedSlots` (28 China / 30 Japan).
9. **★ Click modal-level `保存` / `節省`.** User 杜莎: *「这里要点保存」* = **this button**, not form `临时保存` alone. Skip → form compact stays 0 after close.
10. On option form, read **时间段** compact only (`08:00 · … · 21:30`, count 28). Fail if count≠28.
11. Form footer: **临时保存 → 下一个**. Never 提交审核.

Do **not** skip step 7 or 9. Fields-only without generate fails; **generate without modal save also fails** (杜莎 live).

Dropdown quirks:

- Two-column picker: hour = **left** list, minute = **right** list. A global `option "00"` can set hour `00` instead of minute — start becomes `00:00`. Read back before generate.
- **End `21:30`:** left `21` + right `30`. Wrong order produced end **`00:30`** (杜莎).
- Interval `30` may auto-close the dropdown; do not click stale confirm (hits modal save early). Go to generate only after interval read-back is 30.
- If dropdown stays open, click `確定`, then generate.
- After selecting `21:30`, dropdown may already close; check DOM before extra `確定`.
- If selecting end time closes the whole modal before the generated list appears, time setup failed — reopen and retry; report unverified if you only temp-saved.
- Fallback start: ArrowDown to `08:00` + Enter. Fallback end: hour `21` + minute `30`.

Coordinate fallback only when DOM/text selectors fail:

- Repeat tab: around `x753 y366`.
- Start field: around `x405 y380`.
- Last field: around `x660 y380`.
- Interval dropdown: around `x500 y459`.
- `30` interval option: around `x480 y704`.
- Generate: around `x668 y460`.
- Modal save: around `x663 y750`.

## Sales Calendar Override Logic

Normal price is entered in the option form for the full sales period. Holiday overrides happen only after the option card is saved.

Normal-period setup inside the option form:

- Use `期間選擇`.
- Set `2026-08-01 ~ 2027-07-31`.
- If direct date inputs do not retain values, use the visible calendar:
  - From `7月 2026`, click next to `8月 2026` and select `1`.
  - Navigate to `7月 2027` and select `31`.
  - If clicking `31` resets the range, reselect start `2026-08-01` and then end `2027-07-31`.
- Scroll to the price input and replace the value with normal price (`219` for 5-seat, `313` for 7-seat in the Beijing Tian Tan table).
- Verify visible calendar cells show the normal price before saving the option form.
- If both hidden date inputs and visible date textboxes reject direct filling, use the `1年` radio as a fallback to enable the price input. Record the retained visible period honestly; on 2026-08-03 it produced `2026-08-03 ~ 2027-08-03`.
- List-page option cards usually do not show prices or time slots. Verify prices/time slots while inside each option form before saving; after returning to the list, the card-level checks are limited to option names, descriptions, selling switches, and calendar buttons.
- After an option has been saved, reopening the option can show the price textbox `請輸入價格` as disabled and blank even though prices are present on the calendar. Do not call the price missing from that blank input alone. Verify by checking visible calendar-cell numbers or by opening `销售日历管理`; repair only if the calendar cells are blank or wrong.

Current one-year holiday windows:

- `2026-10-01` to `2026-10-10`: Labor/National Day price.
- `2027-02-01` to `2027-02-15`: Spring Festival price.
- `2027-05-01` to `2027-05-10`: Labor/National Day price.

Critical rule:

- Open calendar, set one window, verify visible cells, click `완료`, wait for save/return.
- Reopen the calendar for the next window.
- Never leave October, February, and May in one unsaved popup.

Reason:

- In live use, the price input can stay bound to previously selected dates. Setting February after October in one unsaved popup caused October dates to inherit the February price.

Reusable helpers:

```js
async function calendarCaptionText() {
  return await tab.playwright.evaluate(() => {
    const els = Array.from(document.querySelectorAll('div,span'));
    const hit = els.find(el => /^\d{1,2}\s*月\s*20\d{2}$/.test((el.innerText || '').trim()) && el.getBoundingClientRect().width > 0);
    return hit ? hit.innerText.trim() : null;
  });
}

function parseCalendarCaption(caption) {
  const m = String(caption || '').match(/^(\d{1,2})\s*月\s*(20\d{2})$/);
  if (!m) throw new Error('Cannot parse calendar caption: ' + caption);
  return { month: Number(m[1]), year: Number(m[2]) };
}

async function gotoCalendarMonth(year, month) {
  for (let guard = 0; guard < 30; guard++) {
    const cur = parseCalendarCaption(await calendarCaptionText());
    if (cur.year === year && cur.month === month) return `${cur.year}-${String(cur.month).padStart(2, '0')}`;
    const delta = (year - cur.year) * 12 + (month - cur.month);
    const cls = delta > 0 ? 'custom-caption__NextButton' : 'custom-caption__PreviousButton';
    await tab.playwright.locator(`button[class*="${cls}"]`).click({ timeout: 6000 });
    await tab.playwright.waitForTimeout(220);
  }
  throw new Error(`Cannot reach ${year}-${month}`);
}

async function openCalendarForOption(optionIndex) {
  await tab.playwright.getByRole('button', { name: '판매 캘린더 관리', exact: true }).nth(optionIndex).click({ timeout: 10000 });
  await tab.playwright.waitForTimeout(900);
  await tab.playwright.getByRole('tab', { name: '단일 날짜 선택 (다중 선택 가능)', exact: true }).click({ timeout: 10000 });
  await tab.playwright.waitForTimeout(300);
}

async function clickCalendarDay(day) {
  await tab.playwright.locator('button[class*="custom-day__PlainDayButton"]').filter({ hasText: new RegExp('^' + day + '$') }).first().click({ timeout: 6000 });
  await tab.playwright.waitForTimeout(35);
}

async function fillCalendarPrice(price) {
  await tab.playwright.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[placeholder="請輸入價格"]'));
    inputs.at(-1)?.scrollIntoView({ block: 'center' });
  });
  await tab.playwright.waitForTimeout(150);
  const input = tab.playwright.locator('input[placeholder="請輸入價格"]').last();
  await input.click({ timeout: 6000 });
  await input.fill(String(price), { timeout: 6000 });
  await tab.playwright.waitForTimeout(150);
  return await tab.playwright.evaluate(() => Array.from(document.querySelectorAll('input[placeholder="請輸入價格"]')).at(-1)?.value || '');
}

async function isCalendarModalVisiblyOpen() {
  return await tab.playwright.evaluate(() => Array.from(document.querySelectorAll('*')).some(el => {
    const r = el.getBoundingClientRect();
    const text = (el.innerText || '').trim();
    return r.width > 300 && r.height > 300 && r.x >= 200 && r.x < 300 && text.includes('판매 캘린더 관리') && text.includes('판매기간 선택') && text.includes('완료');
  }));
}

async function saveCalendarModal() {
  await tab.playwright.getByRole('button', { name: '완료', exact: true }).click({ timeout: 10000 });
  await tab.playwright.waitForTimeout(1700);
  if (await isCalendarModalVisiblyOpen()) throw new Error('Calendar modal still visibly open after 완료');
}

async function setHolidaySegment(optionIndex, year, month, startDay, endDay, price, label) {
  await openCalendarForOption(optionIndex);
  const reached = await gotoCalendarMonth(year, month);
  for (let d = startDay; d <= endDay; d++) await clickCalendarDay(d);
  const val = await fillCalendarPrice(price);
  if (String(val) !== String(price)) throw new Error(`Price not filled for ${label}: ${val}`);
  await saveCalendarModal();
  nodeRepl.write(`applied ${label} ${reached} ${startDay}-${endDay} ${price}\n`);
}
```

If several calendar buttons are visible or card order is uncertain, list buttons first and choose by visible card context/index, not by approximate coordinates:

```js
var calendarButtons = await tab.playwright.evaluate(() => {
  return Array.from(document.querySelectorAll('button')).map((b, i) => {
    const r = b.getBoundingClientRect();
    return { i, text: (b.innerText || '').trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  }).filter(o => o.text.includes('판매 캘린더 관리'));
});
nodeRepl.write(JSON.stringify(calendarButtons, null, 2));
```

Per option, run:

```js
// 5-seat option: holiday 313, spring festival 438
await setHolidaySegment(optionIndex, 2026, 10, 1, 10, 313, '5seat Oct');
await setHolidaySegment(optionIndex, 2027, 2, 1, 15, 438, '5seat Spring');
await setHolidaySegment(optionIndex, 2027, 5, 1, 10, 313, '5seat May');

// 7-seat option: holiday 446, spring festival 625
await setHolidaySegment(optionIndex, 2026, 10, 1, 10, 446, '7seat Oct');
await setHolidaySegment(optionIndex, 2027, 2, 1, 15, 625, '7seat Spring');
await setHolidaySegment(optionIndex, 2027, 5, 1, 10, 446, '7seat May');
```

Use source-table prices instead when they differ from the Beijing template.

## Calendar Verification And Repair

After each `완료`, reopen the same option's calendar only if verification is needed or the UI looked suspicious.

Verification checks:

- October 1-10 show Labor/National Day price.
- February 1-15 show Spring Festival price.
- May 1-10 show Labor/National Day price.
- Other visible in-period dates still show normal price.

Repair wrong prices:

1. Reopen only that option calendar.
2. Switch to single-date multi-select.
3. Navigate only to the wrong month.
4. Select only the wrong dates.
5. Enter the correct price.
6. Verify visible cells.
7. Click `완료`.
8. Wait for return before continuing.

Do not repair by resetting the entire sales period unless the user explicitly approves, because that can wipe prior holiday overrides.

## Final Temporary Save

Use exact DOM selection for final temporary save:

```js
var saveCandidates = await tab.playwright.evaluate(() => {
  return Array.from(document.querySelectorAll('button')).map((b, i) => {
    const r = b.getBoundingClientRect();
    return {
      i,
      text: (b.innerText || '').trim(),
      disabled: b.disabled || b.getAttribute('aria-disabled'),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height)
    };
  }).filter(b => b.text === '臨時存儲' && !b.disabled);
});
if (!saveCandidates.length) throw new Error('No enabled 臨時存儲 button found');
var chosenSave = saveCandidates.sort((a, b) => b.y - a.y)[0];
await tab.playwright.locator('button').nth(chosenSave.i).click({ timeout: 5000 });
await tab.playwright.waitForTimeout(2000);
```

After clicking, verify a green temporary-save toast or page state indicating temporary save. Do not click `批准請求` afterward.

## Common UI Failures

NOL page opens as Chrome connection error:

- Symptom: a newly opened partner-center tab shows `ERR_CONNECTION_CLOSED`.
- Fix: try one normal reload before asking the user to intervene. In the Osaka Universal Studios Japan run, reload changed the error page into a valid logged-in registration page.

Wrong modal input got filled:

- Symptom: product name appears in list search, not creation modal.
- Fix: clear search if needed, reopen `新產品註冊`, fill modal input by choosing the later visible input (`input.nth(1)` when two inputs exist).

Checkbox was not selected:

- Symptom: user says `你还没勾选` or option card lacks required/representative labels.
- Fix: reopen the exact popup, click the missing checkbox, save that popup, then save/temporary-save the section.

Holiday price overwritten:

- Symptom: October cells show Spring Festival price or prior segment changed after setting a later segment.
- Fix: save current popup if correct for current month, reopen October only, set October dates back to the Labor/National Day price, verify, click `완료`.

Calendar month offset seems wrong:

- Symptom: helper lands on wrong month.
- Fix: read the visible month caption. Navigate one click at a time until the desired `YYYY년 M월` is visible. Do not select dates by index until the caption is correct.

Upload blocked:

- Symptom: image field requires files and no suitable Downloads matches exist.
- Fix: ask the user for product images. If suitable files were already supplied but direct file-input upload failed, retry with the file chooser flow instead of searching for substitutes.

Location modal does not close after POI selection:

- Symptom: clicking `添加地点` after choosing a POI keeps the place-search modal open.
- Fix: inspect the lower location-type form. Select the correct type such as `TRAVEL_PLACE`, keep the `nameTag`, then click the lower final `添加`. The upper add button can only expand the second-stage form.

Browser wrapper method unavailable:

- Symptom: `tab.playwright.goto`, `browser.tabs.new(url)`, `tab.playwright.mouse`, `locator.setInputFiles`, `window.location.assign`, DOM `el.click()`, synthetic `MouseEvent`, or Node `eval` fails.
- Fix: use `await tab.goto(url)` after claiming/creating a tab; use locators, role/text selectors, and DOM enumeration for clicks; use file chooser for uploads; write helper code explicitly with reusable `var` bindings.

Include `其他` text missing:

- Symptom: include popup shows `其他` checked but no text below it, or the product review says pickup/parking contents are missing.
- Fix: reopen the include popup, keep the relevant category checked, fill Korean include text such as `픽업/샌딩 서비스 및 주차비 포함`, save the popup, then save/temporary-save the page.

Include popup does not write back:

- Symptom: after clicking `節省`, the form still shows `包含/不包含项目을 请输入` or the `下個` button stays disabled even though the modal contained text.
- Fix: reopen the modal and verify the checkbox is visibly purple/checked and the Korean text is present. If locator-based `節省` does not persist it, click the visible dark `節省` button by coordinate once, then resnapshot the form area.
- If selecting only `運輸` still fails, select both `運輸` and `其他`; keep both typed values Korean. In the Tokyo Port run, `運輸(... 이동 및 주차비 포함) · 其他(픽업/샌딩 서비스 및 주차비 포함)` persisted and enabled `下個`.
- If an old saved option contains Chinese include text, open `more` -> `编辑`, replace it with Korean, save the modal, then click the option-form `下個` to persist the edit.

Cancellation mode wrong:

- Symptom: cancellation section shows `否（自动取消）` or automatic cancellation.
- Fix: change `是否需合作方确认` to `是（手动取消）`, keep the 2-business-day/100%-refund term, then save/temporary-save the rules page.

Save warning appears:

- Symptom: voucher issue time or similar warning appears but save remains available.
- Fix: report the warning, keep the current flow values, and save if the page allows. Do not alter policy settings to silence warnings.

Past sale-start date disabled:

- Symptom: the desired start date such as `2026-08-01` is greyed out because the current date is later.
- Fix: choose the first selectable date, keep the intended end date if possible, and report the actual visible period. Do not claim the disabled start date was selected.

Browser wrapper method mismatch:

- Symptom: `tab.playwright.url()` or `tab.content.snapshot()` fails.
- Fix: use `await tab.url()` / `await tab.title()` and `await tab.playwright.domSnapshot()`.

Node REPL redeclaration:

- Symptom: `Identifier 'snap' has already been declared`.
- Fix: use `var` for reusable scratch variables or unique names in repeated calls.

Option list not found right after saving:

- Symptom: a locator for `选项修改` briefly returns `0` even though the list is visible.
- Fix: wait for React to settle, resnapshot, then retry once. Do not assume options disappeared.

Option card appears but edit dialog still appears:

- Symptom: after clicking option-form `下個`, the saved card is visible behind a dialog, or the snapshot still contains `注册並添加选项`.
- Fix: wait a few seconds and resnapshot before retrying. In the Osaka Universal Studios Japan run, the dialog disappeared after a short delay; immediate retry could create duplicate options.

Price looks missing after save:

- Symptom: user sees an option edit form where the `請輸入價格` input is disabled/blank, or the option list shows no price.
- Fix: explain that saved option cards do not display prices and the disabled price input may not echo the value. Open the option/calendar and verify visible calendar cells show the expected HKD price for the selected period. If calendar cells show the expected values, the price is set; if they are blank/wrong, fill the sale period/price again, verify cells, save the option, then click final `臨時存儲`.

Option edit layer remains after saving:

- Symptom: the list shows the saved option card but a dialog titled `编辑选项信息` remains active.
- Fix: if edits were just made, use the dialog's form-level `下個` to persist and exit. If only inspecting, confirm leave only when an unsaved-change warning appears and no edits were made. Do not use the neighboring global approval-area buttons to close the layer.

Generated time count looks doubled:

- Symptom: raw text or regex extraction finds 60 `HH:MM` matches after generating `07:00 ~ 21:30` half-hour slots.
- Fix: count unique time values. Snapshots can include each generated time once on the button and again in nested generic text; the valid target is 30 unique slots from `07:00` through `21:30`.

Generic leave warning while inspecting option:

- Symptom: closing an option edit modal shows a warning that changes may be lost.
- Fix: if only inspecting and all intended changes were already saved, confirm leave. If edits were made, use the form `下個` button to save and return.

Mistaken risk of approval click:

- Symptom: bottom `臨時存儲` and `批准請求` buttons overlap with form footer buttons in the viewport.
- Fix: stop coordinate clicking, enumerate DOM button candidates, and click only exact text `臨時存儲` for final save or exact text `下個` with wide form-button geometry for option-form save.

## Haneda / Japanese Airport Live Pitfalls (2026-08-04)

Product-list resume:

- Draft rows are clickable `div` cards, not anchors. Click the card container whose text matches the Korean product name (class often includes `slot___StyledContainer4`). Confirm URL `id=` matches before editing.
- List text `修復` is often **not** a `<button>` — do not wait for `getByRole('button', { name: '修復' })`. Click the card.

Regulations stepper stuck:

- Symptom: `保存然後` stays disabled and `選項管理` has `aria-disabled=true`.
- Soft invalid on `minimumPurchaseDay` when intro mentions 2-day changes vs 3-day book cutoff — do **not** “fix” by changing the 3-day cutoff.
- First fix real blockers: 私人的, 代表預約信息, voucher, blank cancel `windows.1`, min/max qty, partner manual cancel.
- Only after regulations fields are truly complete: click enabled stepper `選項管理`. Direct option URL is last resort only (user forbids routine URL skip).

Reservation + voucher:

- Airport products: turn on flight-related required ids (arrival/departure flight number and times). Station/port products keep those off.
- Modal confirm may be button text `已選`, not `節省`.
- Select voucher template with `예약정보로 확인` + `無需換貨`. Prefer a small card match (e.g. text starts with `[5seat`), not the whole modal container.
- `0小时` vs `72小时` voucher warning is acceptable when save still works.
- Setting `el.checked = true` alone may not bind React. Click the row’s `[role=checkbox]` / label, then verify post-`已選` summary lists fields.

Cancel windows blank row:

- Clicking `添加` can create empty `windows.1.deadline` / `windows.1.penalty` → `aria-invalid` and disabled save. Delete the blank row, or fill only `windows.0` with `2` / `0` without extra `添加`.

Include modal (简体 live, Oriental Pearl 2026-08-06):

- After checking `TRANSPORTATION` / `PICK_UP`, fill `#inclusions_TRANSPORTATION_description` and `#inclusions_PICK_UP_description` (often **`input type=text`**, not textarea) + `#exclusions` with Korean.
- Footer confirm may be **`保存`** (not `节省`).
- **If `保存` does not close the modal or does not write back:** call React `AttributeFormPopup` **`onSave(values)`** with full `{ inclusions, exclusions, appliedToAllOptions }` so parent Formik field **`optionAttributeBase`** updates. Empty-arg `onSave()` can persist **empty** inclusions. Confirm page shows「包括 運輸…」before leaving.
- Checkbox/theme/language: **click once only** if unchecked (`x≈-9999` inputs — use visible label).

Sales calendar (简体) — Top of Shanghai / Pearl 2026-08-06:

- Tab **`选择单个日期（可多选）`**. Month caption like `8 月 2026`. Next/prev: `button[class*="custom-caption__NextButton"]` / `PreviousButton`.
- Days: `button[class*="custom-day__PlainDayButton"]` + **mouse click**. Price input **`请输入价格` stays disabled until ≥1 day selected**.
- One holiday range → fill → **`完成`**. Reopen for next range. Never batch Oct/Feb/May unsaved.
- **Reliability:** before **every** segment (not only every option), **listClean** = Escape/消除 + `goto` option list + assert 4×`销售日历管理`. Continuous segments without listClean → `caption=null` / month nav fail (Top Shanghai mid-run failure on 7go spring / entire 7rtn).
- **JinMao 4th card:** `销售日历管理` nth(3) often near viewport bottom → `force` click without scroll → `caption=null`. Fix: `scrollIntoView({block:'center'})` + **mouse.click** center; wait caption + PlainDayButtons before `gotoMonth`.
- **Verify price on cell container, not day button:**
  - `PlainDayButton.innerText` → only `"1"` (no price).
  - Parent container / `td.rdp-cell` → `"1\n510"`.
  - Price node class often includes `sale-period-day-content`.
  ```js
  function readDayPrice(day) {
    const cell = [...document.querySelectorAll('td.rdp-cell, [class*="custom-day___StyledContainer"]')]
      .find(el => (el.innerText || '').trim().split('\n')[0] === String(day));
    const lines = (cell?.innerText || '').trim().split('\n').map(s => s.trim()).filter(Boolean);
    return lines[1] || null; // e.g. "510"
  }
  ```
- Critical asymmetric check: 7 去 spring **510** ≠ 7 返 spring **500**.

China scenic times — Top of Shanghai / Pearl / **JinMao** / **杜莎 (Tussauds)**:

- Default **`08:00`–`21:30` / 30 min / 28 slots** (not Japan `07:00`/30). Generate control may label **`一代`**. Verify **时间段** compact line only.
- **Full SOP:** `SKILL.md` § **40** (杜莎用户连否：分钟未选 / 弹窗未保存 / 假验收).
- **Per option:** `goto` clean list first (if `修改选项` count is 0, form is stuck). Open `nth(i)` → set times → **临时保存→下一个**.
- Empty: button **`设置时间`**. Existing: ⋯ `더 보기` → **编辑**.
- Delete old rows (`删除`/`刪除`). Click button whose **exact** text is **`重复 小时 添加`** (not a parent that also contains「新增各别时间」).
- Time pickers: hour = **leftmost** matching option; minute = **rightmost**.  
  - Start **08:00**, end **21:30** — read back; **end `00:30` = fail**.  
  - **分钟→30 读回** — user: *分钟都没选到*.  
  - **生成/一代** only when enabled → modal list 28 rows → **弹窗「保存」**（*这里要点保存*）→ form compact.
- Do **not** claim success from page-wide `HH:MM` regex (clocks, other UI).
- **JinMao/杜莎 hard fail:** script logged `times { count: 0 }` + `done`, or modal list only without form compact → user rejected. Gate: after modal save, form line must be 28/08:00/21:30; then **re-open card** and read again. Wait `#name` before reading (load race). If count≠28 → retry or fail exit, never green-light.

Create / images / resv (杜莎 2026-08-06):

- **Search box ≠ product name** — modal only + TRANSPORTATION.
- **Thumbnail count = 3** when user gave 3; delete bottom duplicates if 6 appear; keep 代表.
- **Resv:** scroll action-sheet → `label[for]` → verify checked → `已选` → **page summary non-empty**.

Option price-type popup:

- Open `가격 타입 선택` → tab `기타 가격 타입 (직접 입력)`.
- Name placeholder: `輸入的名稱將顯示在銷售渠道上。` → fill **Korean** e.g. `7인승 가는` (**not** `7seat go`).
- Description placeholder: `例) 滿 19 歲以上` → `7인승 차량`.
- Required/representative are `role=checkbox` nodes:  
  `[aria-labelledby="ETC-required-label"]` and `[aria-labelledby="ETC-representative-label"]`.  
  Clicking only the text div does not reliably toggle.
- After `완료`, option name is often overwritten by the display description (`7인승 차량`). Re-fill the full route option name before period/price/time and again before `下個`.

Sale period and price:

- `請輸入價格` is **disabled** until a sale period exists. Select `1年` via `input[value="ONE_YEAR"]` or label `1年`.
- Fill price once with `fill('70')`. Typing digits on top of an existing value produced `7070` in the Haneda run.
- Verify with calendar cell text (`4\n70`), not list cards.

Time popup:

- Sequence: `設定時間` → `반복 시간 추가` → first start `07:00` → last start `21:30` → interval `分鐘`/`30` → `생성` → verify 30 unique times → `節省`.
- Hour/minute columns: pick leftmost `07` for hour and rightmost `00` for minute so hour does not reset to `00:00`.
- After end/interval selection the picker may auto-close; never click a stale `確定` that hits modal save.
- Unique-count filter may include page timestamps like `11:16`; prefer the compact line `07:00 · 07:30 · … · 21:30` when present.

Japan holiday pricing:

- When source notes say fleet cost is fixed / no holiday markup, skip October/February/May calendar overrides entirely.

Final report must state:

- Four options + prices + period + time slots.
- Whether `臨時存儲` was clicked.
- **`批准請求` was not clicked.**
- Automation stopped on **option list** when that is the user rule.

## Kansai / KIX + Automation Freeze Pitfalls (2026-08-04~05)

Full product data: `kansai-airport-live-notes.md` (prices 99/133).

Freeze / “卡住”:

- Multiple `connectOverCDP` scripts on one tab interleave clicks and waits → page looks frozen. Run **one** script; terminate leftovers before continue.
- Tool default timeouts background long option loops → chat goes quiet while work still runs (or is stuck mid-wait). Prefer one option per turn with progress logs.
- Option form may return `서비스 이용이 원활하지 않습니다` if opened while regulations were invalid — 돌아가기, complete regs gate, retry.

After `保存然後` on regulations:

- URL may remain on `/regulations` even when OK. Click stepper `選項管理` when `aria-disabled` is not true.

Stop:

- When four cards are on the list with `판매중`, stop. User: stop at option list; do not chase further clicks unless asked.

## Itami / ITM Live Pitfalls (2026-08-05)

Full product data: `itami-airport-live-notes.md` (prices **77/105**). Draft example: `88b3861b-e907-487b-bacb-5abcfc1a7988`.

Attributes:

- Theme modal must complete (`기사제공차량` + `已選`) or red `請選擇類別（主題）。`.
- 私人的: off-screen checkbox — mouse on visible multi-line label.
- Language: open `選擇你的语言` → `韓語` (modal title may show 選擇論文語言).
- POI: search needs Enter; pick **관광지 오사카 국제공항**, not 숙소 hotels with “이타미”; finish with **旅遊地** + final **添加**.

Introduction:

- **썸네일 vs 프로그램** image split — see Images section. Red thumbnail error is authoritative.
- Leaving intro mid-fix for image repair before regs `保存然後` can reset regulations fields — re-fill when returning.

Regulations / reservation:

- After mouse-ticking required flight/hotel fields, **summary must show** them; otherwise `保存然後` stays grey despite temporary `checked` dumps.
- Soft `aria-invalid` on `minimumPurchaseDay=3` can coexist with enabled buttons — do not “fix” by changing the 3-day book rule solely for soft invalid.

Operator mode:

- When user asks 边操作边展示 / 像真人鼠标: announce → one step → report. Do not silent full-product batch.

## Final Review Scriptlet

Before final response, read the page and verify:

```js
const finalText = await tab.playwright.locator('body').innerText({ timeout: 12000 });
// Price-type names must be Korean — do NOT look for English 5seat go
for (const needle of [
  '베이징 시내 호텔', // or 상하이 for Shanghai routes
  '5인승',
  '7인승',
  '판매 캘린더 관리',
  '销售日历管理',
  '可销售',
]) {
  nodeRepl.write(`${needle}: ${finalText.includes(needle)}\n`);
}
// Fail if deprecated English price-type codes appear in option cards
for (const bad of ['5seat go', '7seat go', '5seat return', '7seat rtn']) {
  if (finalText.includes(bad)) nodeRepl.write(`FAIL deprecated price-type: ${bad}\n`);
}
```

Final response must include:

- Route/product name.
- Four options completed.
- Normal period and prices.
- Holiday windows and override prices.
- Time slots.
- Whether `臨時存儲` was clicked.
- Explicitly state that `批准請求` was not clicked.
