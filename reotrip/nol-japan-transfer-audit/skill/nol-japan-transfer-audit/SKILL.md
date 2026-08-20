---
name: nol-japan-transfer-audit
description: >
  Audit/check Japan private-transfer (接送) NOL draft products against 1.0–4.0 review feedback:
  route mismatch, copy contamination (串味/串站), FAQ×5, cancel terms, Korean package names,
  Japan time slots 07:00–21:30×30, booking fields, thumbnail route-match/dedupe.
  Use when the user says 检查日本接送、扫日本接送、验收接送、audit Japan transfer、
  按1.0-4.0检查、线路有误、文案串味、FAQ缺、图片不符, or runs /nol-japan-transfer-audit.
  This skill is CHECK-only — never merge into nol-product-listing-helper; fix via that skill only if user asks.
---

# 日本接送产品检查 Skill（1.0–4.0）

**定位：只检查 / 出验收表。不上架、不创建产品、不并入上架 skill。**

| 边界 | 本 skill | 上架 skill（勿合并） |
|------|----------|----------------------|
| 包名 | `nol-japan-transfer-audit` | `nol-product-listing-helper` |
| 动作 | 读回 DOM/MD5 → PASS/FAIL 表 | 填表、上传、保存然后 |
| 触发 | 检查 / 扫 / 验收 / audit | 上架 / 怎么填 / 继续改 |

**永不提交审核。** Live 只连已开 CDP 的 Chrome（`:9222`）。修 FAIL 须用户明确说「修/改」→ 再调上架 skill 或脚本。

---

## 0. 开工三句话（对用户可见）

1. **本轮 = 检查**（非上架）；范围 = 用户点名 id / 清单 N / 默认 4.0 点名 5 条。  
2. **口径 = 下表 A–H**（1.0–4.0 反馈固化）。  
3. **输出 = 总表 PASS/FAIL + fails[]**；不擅自点保存/提交。

---

## 1. 反馈来源 → 检查项映射

| 版 | 典型反馈 | 检查码 |
|----|----------|--------|
| **1.0** | FAQ 缺 mid-stop；套餐英文车型；时段非 07:00–21:30×30；预约信息未设 | C-FAQ · C-PKG · C-TIME · C-BOOK |
| **2.0** | 描述与线路不符；酒店-景点抄接送机/站；酒店-站写成接送机；特殊条款空/错；FAQ 空 | C-ROUTE · C-TASTE · C-SPEC · C-FAQ |
| **3.0** | FAQ 须完整 **5** 条（东京站样板）；须知串站/串铃鹿；价格类型非韩文；HKD 售价 | C-FAQ · C-TASTE · C-PKG · C-PRICE |
| **4.0** | 图与线路不符；图重复；大阪↔京都串 스즈카；炼 skill 查文案+图 | C-IMG · C-TASTE |

参考样板（只读，不改）：

| 用途 | 产品 | draft 前缀 |
|------|------|------------|
| 已过审文案/属性 | 东京迪士尼 / 大阪 USJ | `462b9cef` / `4b49b221` |
| FAQ 5 条全文 | 东京市区酒店-东京站 | `09714a30` |
| FAQ 港口参考 | 大阪市区酒店-大阪港 | `c9bedab3` |

常量/样板文（**检查读回用，本 skill 不负责 fill**）在仓库：

- `nol-listing-automation/lib/transfer-audit-copy.mjs`  
  - `SPEC_CANCEL_KO` · `FAQ_SET_*` · `faqSetForRoute` · `mustKnowMeetingLine` · `scanMustKnowBan` · `normalizeRouteType`
- 车图对照：`upload-ready-images/japan-car-only/car-1..3.jpg`
- 产品总表：`nol-listing-automation/japan-products-inventory-4.0.md`（N≈56）

---

## 2. 线路类型（先定 type，再判串味）

从 **内部名 / 标题 / POI** 归类（与上架矩阵一致，仅用于检查）：

| type | 判定关键词 | 文案应像 | 文案禁像 |
|------|------------|----------|----------|
| `hotel_airport` | 羽田/成田/KIX/ITM/CTS/NGO/HND/NRT… | 接送机 · 항공편 | — |
| `hotel_station` | 东京站/京都站/大阪站/新横滨… | 接送站 · 열차 | 机场 HOW / 항공편 主叙事 |
| `hotel_port` | 东京港/横滨港/大阪港/神户港… | 港口 · 선박 | 纯机场文案 |
| `hotel_attraction` | 迪士尼/USJ/晴空塔/哈利波特/吉卜力… | 酒店↔景点 | **机场/车站** 接送叙事 |
| `hotel_hotel` | 两城酒店/市区↔市区（无机场站港） | 酒店↔酒店 | **机场/车站/错城**（스즈카↔교토） |
| `station_airport` 等 | 站-机场、港-机场… | 对应两端 | 错端点海报文案 |

`normalizeRouteType` 可读 lib；歧义时写 `type=?` 并 **停问** 用户，不猜。

---

## 3. 检查码 A–H（真验收）

每项：`PASS` | `FAIL` | `SKIP`（页面未开/无字段）+ 读回摘要。

### C-ROUTE · 线路身份一致（2.0 / 3.0）

| 查 | 真验收 |
|----|--------|
| 内部名/标题两端点 | 与产品清单、POI 一致 |
| 介绍/描述/HOW | 端点城市/设施名一致；无「另一条线」的机场/车站/景点名 |
| 错例 | 哈利波特/晴空塔写成接送机；京都站写成接送机；大阪-京都写 스즈카 |

**串味词库（命中且与 type 矛盾 = FAIL）：**

| 词 | 何时 FAIL |
|----|-----------|
| `항공편` / 航班 / 机场接送 HOW | `hotel_attraction` / `hotel_hotel` / 纯 `hotel_station`（无机场端） |
| `교토역` `도쿄역` `오사카역` / 车站会和 | `hotel_attraction` / `hotel_hotel`（须知禁串站） |
| `스즈카` `铃鹿` `スズカ` | 产品名不含铃鹿时（尤其大阪↔京都） |
| `To/From Tokyo Hotels` 等英海报句 | 产品不是「东京酒店↔对应机场」时（见 C-IMG） |
| `Osaka City Hotels` / `Kyoto City Hotels` | 海报城市 ≠ 产品城市端（奈良/神户挂 Kyoto 海报 = FAIL） |

### C-TASTE · 文案串味（2.0 / 3.0 / 4.0）

扫描：介绍正文、须知/체크리스트、FAQ 答、option 描述、特殊条款。

1. 全字段 `value` + 可见正文跑串味词库。  
2. `hotel_hotel` / `hotel_attraction`：`scanMustKnowBan` 逻辑或等价 — 禁 `교토역|도쿄역|오사카역|항공편|터미널|공항 픽업`（按 type）。  
3. 产品名含 A 城、文案主写 B 城（铃鹿/京都互串）→ FAIL。

### C-FAQ · 产品 FAQ（1.0 mid-stop → 3.0 满 5 条）

| 查 | 真验收 |
|----|--------|
| 条数 | `faqs.i.question` **n ≥ 5** |
| mid-stop | 必有问：`중간에 다른 장소에서 승하차할 수 있나요?`（或等价） |
| 第 4 条线路感 | 机场→항공편；车站→열차；港口→선박；酒店景点→픽업 장소；**禁止**景点产品只写航空 |

样板集：`faqSetForRoute(type)`（只对照，不强制全文逐字相等；缺条/错类 = FAIL）。

### C-SPEC · 特殊条款 / 取消（2.0）

读回特殊条款区 ≈  

`예약 확정 후 취소 요청은 협력사 확인 후 처리됩니다. 이용일 기준 영업일 2일 전까지 취소 시 100% 환불 가능하며, 이후에는 취소 및 환불이 불가합니다.`

（`SPEC_CANCEL_KO`）空、英文占位、明显非此稿 = FAIL。

### C-PKG · 套餐/价格类型名（1.0 / 3.0）

| 查 | 真验收 |
|----|--------|
| 车型/option 名 | 韩文向；**禁止**裸 `5seat go` / `7seat go` |
| 价格类型 | 形态 `N인승 가는` / `N인승 오는`（N 为数字） |

### C-TIME · 日本时段（1.0 / 2.0）

| 查 | 真验收 |
|----|--------|
| 首末班 | **07:00** 起、**21:30** 止（非默认 09:30 起） |
| 间隔 | **30** 分钟一班 |
| 备注 | 读回 compact 或班次数合理（约 07:00…21:30）；明显缺段/错起点 = FAIL |

### C-BOOK · 预约信息（1.0 东京港类）

法规/预约页：接送类应有代表预约信息（航班/列车/船/酒店地址等按 type）；摘要非空；**禁止**整页空白未设。

### C-PRICE · 售价（3.0，有 CSV 时）

若用户给了 CSV/表：平日售价 **HKD** 与表一致；禁止沿用旧美金/旧表占位（如无依据的 70/99）。无表则 SKIP 并注明。

### C-IMG · 缩略图线路匹配（4.0）

**硬规则（用户澄清）：图内容须匹配线路；只有内容不符才换车图；重复只去重；匹配不改。本 skill 检查阶段只判不改。**

| 状态 | 判定 |
|------|------|
| 海报/拼图英文句端点 ≠ 产品线路 | **FAIL 不符**（例：站-羽田用 Tokyo Hotels；奈良-KIX 用 Kyoto City Hotels） |
| 同一内容 MD5 出现 ≥2 | **FAIL 重复**（dups = n − uniq） |
| 匹配线路且 uniq | **PASS**（可含正确线路海报 + 车图） |
| n 过少（平台常 ≥3）且非用户约定 | **FAIL 张数** 或 WARN |

操作建议（写入报告「建议动作」，检查时不执行）：

- 不符 → 建议换 `japan-car-only/car-1..3`  
- 重复 → 建议只删多余  
- 匹配 → 建议跳过  

验收读回：CMS 缩略图 URL → 下载 MD5；对照 car-1..3 哈希可选。

---

## 4. 推荐检查流程

```
1) 定范围：点名 id | inventory 行 | 「全部日本接送」
2) 每产品：
   a. 打开介绍页（introduction）→ 文案 + FAQ + 缩略图
   b. 需要时：option/套餐页 → C-PKG C-TIME
   c. 需要时：法规/条款 → C-SPEC C-BOOK
3) 归 type → 跑 C-ROUTE … C-IMG
4) 输出表（必须）：
```

### 输出表模板

| # | 产品 | id | type | ROUTE | TASTE | FAQ | SPEC | PKG | TIME | BOOK | IMG | 总 |
|---|------|-----|------|-------|-------|-----|------|-----|------|------|-----|-----|
| 1 | … | … | hotel_airport | P/F | … | n=5 | … | … | … | … | n/uniq/dups | PASS/FAIL |

FAIL 下列 `fails[]` 一行一条，例：

- `C-TASTE: 介绍含 스즈카（产品为大阪-京都）`  
- `C-IMG: 海报 Kyoto City Hotels 用于奈良-KIX；dups=6`  
- `C-FAQ: n=2 缺 mid-stop`

结尾固定：`未点提交审核` · `本轮仅检查，未改库`（若只读）。

---

## 5. Live 约定（检查专用）

1. CDP `127.0.0.1:9222`；一连接一脚本；超时明确；失败 `exit≠0`。  
2. **只读优先**：`goto` 介绍/套餐/条款 → `evaluate` 读 input/textarea/img。  
3. **禁止**：保存然后、临时保存、提交审核、删图、上传（除非用户当轮说「按检查结果修」）。  
4. 批量：可按产品循环；每产品中文一行【读回】；禁止 silent 长跑无汇报。  
5. 图片：MD5 内容去重；错海报可用已知 MD5 或 OCR/英文句目视（agent 读图）。  

---

## 6. 与上架 skill 的交接

| 用户说 | 行为 |
|--------|------|
| 只检查 / 扫一遍 / 验收 | **仅本 skill** → 表 |
| 检查并修改 / 把 FAIL 修掉 | 本 skill 出 FAIL 表 → **另开** `nol-product-listing-helper` 或既有 fix 脚本；**不把上架步骤写进本文件** |
| 怎么上架新线路 | 只用上架 skill，不走本检查流 |

**禁止**把本检查矩阵复制进 `nol-product-listing-helper/SKILL.md` 做成第二份；上架 skill 已有 §57/图规则作填表约束，本 skill 专责 **批量验收与串味/线路审计**。

---

## 7. 最小自检清单（Agent）

- [ ] 未修改 `nol-product-listing-helper`  
- [ ] 每个检查产品有 type  
- [ ] C-FAQ 按 5 条 + mid-stop，不是只看有没有 FAQ  
- [ ] C-TASTE 覆盖 스즈카/错站/错机  
- [ ] C-IMG 区分「不符」vs「重复」vs「匹配」  
- [ ] 总表 + fails + 未提交审核  

---

## 8. 4.0 点名默认集（可作冒烟）

| 产品 | id 前缀 | 重点码 |
|------|---------|--------|
| 东京站-羽田 | `72d8f629` | C-IMG 不符 · C-ROUTE |
| 京都-KIX | `d1fc3cef` | C-IMG 去重 |
| 奈良-KIX | `346a18c1` | C-IMG 不符 |
| 神户-KIX | `731d947c` | C-IMG 不符 |
| 大阪-京都酒店 | `9cef6c16` | C-TASTE 铃鹿 · C-IMG 去重 |

全量日本接送：以 `japan-products-inventory-4.0.md` 为准扩扫。
