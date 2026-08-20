---
name: viator-enterprise-locations
description: >
  Collect Reotrip Viator live products and Tripadvisor UK syndication plus
  enterprise-location pages. Slow resumable Chrome-CDP collection. Writes dated
  xlsx and date-to-date comparison. Use when the user asks to crawl Viator or
  Tripadvisor, check 透传, 企业位置, 已上线产品, product code match, rating
  changes, /viator-enterprise-locations, or to compare two collection dates.
when-to-use: >
  Viator 后台、Tripadvisor 透传、企业位置、reotrip 搜索、按日期对比 xlsx、
  /viator-enterprise-locations
argument-hint: "[full | viator | tripadvisor | compare | resume]"
---

# Viator 企业位置与 Tripadvisor 透传

在项目根执行。先读并遵守：

- [references/pace.md](references/pace.md)
- [references/schema.md](references/schema.md)
- [references/ui-landmarks.md](references/ui-landmarks.md)

脚本目录：本 SKILL.md 所在目录的 `scripts/`。

未明确要求采集时，不要打开 Viator / Tripadvisor。用户说「只做 skill / 目录 / 先不要爬」时直接停。

## 参数

按顺序匹配，命中即停：

| 参数 | 模式 |
|---|---|
| 空 / `full` / `采集` / `全量` | `full` |
| `viator` | 只跑 Viator 已上线列表 + 企业详情 + 评分 |
| `tripadvisor` | 用已有 snapshot 核透传 + 拉完整企业位置 |
| `resume` / `继续` | 恢复未完成 run |
| `compare [日A] [日B]` | 按日期对比；缺日期则取最近两个采集日 |

「只更新 Viator」「只核透传」「对比 v1 v2」等自然语言按上表归类。

`tripadvisor` 模式若没有可用的 Viator 产品列表：停，让用户先跑 `viator` 或 `full`。

## 固定规则

- 已上线产品约 130 条。企业位置 = 产品详情里的 **Tripadvisor 企业详情**。
- 透传 = Tripadvisor 页上 product code 与后台 code **字符串完全一致**。标题像不算。
- 企业位置要 **完整列表**：Viator 企业详情 ∪ `reotrip` 搜索 ∪ 用企业详情名称补搜。**不要**按名称是否以 Reotrip 开头丢弃。酒店 / 餐厅 / Things to do 都留。
- 每个企业位置必须有：名称、评分、网页链接、其下展示产品数量、每一条展示产品、产品评分。翻完分页。
- Tripadvisor 固定 `tripadvisor.co.uk`。
- 对比 **按日期**。同日多份 snapshot 取当天最晚 `run_id`。
- 本机登录后跑：用独立 Chrome + CDP，不要用无 cookie 的 `web_fetch` 打供应商后台。

## 步骤 0 — 路径与模式

1. 项目根 = 含 `data/` 的工作区。不确定就问用户。
2. `run_id`：`python3 -c "from datetime import datetime; print(datetime.now().strftime('%Y%m%d_%H%M'))"`（`resume` 除外）。
3. 脚本：

```
SCRIPTS=<SKILL_DIR>/scripts
python3 "$SCRIPTS/write_xlsx.py" --snapshot data/raw/<run_id>/snapshot.json
python3 "$SCRIPTS/compare_runs.py" --project <PROJECT_ROOT> [--from-date YYYYMMDD] [--to-date YYYYMMDD]
```

## 步骤 1 — 登录浏览器（采集类模式才做）

`compare` 不做这一步。

1. 执行 `"$SCRIPTS/launch_chrome.sh"`。独立档案在 `browser-profile/`，端口 **9222**。
2. 用 Playwright `chromium.connect_over_cdp("http://127.0.0.1:9222")` 连上已有 Chrome。未装则 `pip install playwright`，**不要** `install chromium` 来爬登录态，必须连用户刚打开的 Chrome。
3. 看当前 URL：已在 `supplier.viator.com` 且能看到产品列表 → 继续。否则请用户在该窗口登录，等用户回复「已登录」。
4. 不要要密码，不要替用户填登录表单。

## 步骤 2 — snapshot 与 checkpoint

新 run：建 `data/raw/<run_id>/`，按 schema 写空 `snapshot.json` + `checkpoint.json`。

`resume`：找 `data/raw/*/checkpoint.json` 里 `phase != done` 的最新一份。没有未完成项就停并说明。

每完成 **1 个产品** 或 **1 个企业位置** 就写盘 snapshot 和 checkpoint。被风控打断时 `status=blocked`，`finished_at` 留空。

## 步骤 3 — Viator（`full` / `viator` / 对应 resume phase）

按 [ui-landmarks.md](references/ui-landmarks.md) 收已上线产品。列表能拿到的字段不要再点详情。企业详情没有的才进详情。间隔遵守 pace.md。

`viator` 模式到此后直接步骤 6 出表，透传列填 `未核验`。

## 步骤 4 — 按产品核透传（`full` / `tripadvisor`）

对 snapshot 里每个已上线产品，按 ui-landmarks 搜索并判定 `已透传` / `未透传`。写回该产品的 `ta_*` 字段。

## 步骤 5 — 完整企业位置（`full` / `tripadvisor`）

并集去重后，逐个打开位置页，收齐评分、链接、产品数量、产品明细、产品评分。`product_count` 必须等于 `products` 数组长度。

## 步骤 6 — 写 xlsx

```
python3 "$SCRIPTS/write_xlsx.py" --snapshot data/raw/<run_id>/snapshot.json
```

检查两个 xlsx 都生成。然后 `checkpoint.phase=done`，`snapshot.status=done`。

## 步骤 7 — 按日期对比

`compare` 模式，或 `full`/`tripadvisor` 成功结束且 `data/raw/` 里已有更早日期的 snapshot 时自动跑：

```
python3 "$SCRIPTS/compare_runs.py" --project <PROJECT_ROOT>
```

指定日期则加 `--from-date` `--to-date`。对比 xlsx 必须把新增、消失、透传翻转、评分升降单独成表并用颜色标出。

只有一天的数据：写出当日两份业务 xlsx，说明还不能对比。

## 中断与汇报

被挡：保存 checkpoint，用中文告诉用户停在哪个 phase、完成件数、checkpoint 路径，等 `resume`。

正常结束时汇报：run_id、已上线条数、已透传/未透传、企业位置数、位置下产品总数、两个 xlsx 路径、若有对比则对比路径。

## 禁止

- 并行爬、暴力刷新、验证码绕过、把日常 Chrome 用户档案当 `--user-data-dir`
- 手改 xlsx 表头（改 schema 和 `write_xlsx.py`）
- 用产品标题模糊匹配代替 code 判定透传
- 只保留名称以 Reotrip 开头的企业位置
