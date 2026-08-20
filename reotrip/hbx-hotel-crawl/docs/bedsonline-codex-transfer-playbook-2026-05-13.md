# Bedsonline Codex 跨设备接管手册

文档日期: 2026-05-13

适用目的:

- 把 Bedsonline 的账号登录、产品提取、城市覆盖扫描、历史结果复核、GPT Pro 交付这一整套流程，转交给另一台设备上的 Codex 直接接手。
- 这份文档按“独立可读”写法整理，不要求下一位先看旧聊天。

重要说明:

- 本文档包含敏感登录信息，只限内部授权使用。
- 不要把这份文档发到公开渠道，不要提交到 git 仓库。
- 如果账号密码后续有轮换，应优先更新本文档中的“登录信息”和“故障恢复”部分。

## 1. 三分钟速览

Bedsonline 这套工作流的核心不是“打开网页看起来已登录”，而是：

1. 有一个可复用的浏览器持久化 profile
2. `localStorage` 里存在 `darwinToken`
3. 用 `bedsonline-extract` skill 的脚本走 Bedsonline 官方前端同源 API
4. 输出统一落到 `data/`、`reports/`、`artifacts/logs/`

这套流程的最短闭环是：

1. 恢复登录态
2. 跑 `verify-login.mjs`
3. 跑 `discover-coverage.mjs`
4. 需要明细时再跑 `crawl-countries.mjs`
5. 需要交给 GPT Pro 时再打 handoff 包

## 2. 当前已验证可用的登录信息

仅供授权内部使用。

- Bedsonline 用户名: `BHU0000161`
- Bedsonline 密码: `Hzcfsl830121.`

这组凭据来自本机历史会话中用户明确授权“直接拿去登录吧”的记录，并已在 2026-05-13 当前设备上用于恢复 live 提取流程。

## 3. 当前机器上的关键路径

### 3.1 Skill 与脚本

- Skill 根目录:
  `/Users/mark/.codex/skills/bedsonline-extract`
- Skill 入口:
  `/Users/mark/.codex/skills/bedsonline-extract/SKILL.md`
- 工作流说明:
  `/Users/mark/.codex/skills/bedsonline-extract/references/workflow-notes.md`

脚本列表:

- `scripts/verify-login.mjs`
- `scripts/discover-coverage.mjs`
- `scripts/crawl-countries.mjs`
- `scripts/build-statistics.py`
- `scripts/build-gpt-pro-package.py`

### 3.2 浏览器持久化 profile

- Bedsonline profile:
  `/Users/mark/codex-workspace/browser-profiles/bedsonline`

说明:

- 这个 profile 可以复用登录状态，但不能假设永远有效。
- 页面看起来登录成功，不代表 API 就一定可用。
- 真正的可用条件是 `localStorage.darwinToken` 存在，且 `discover-coverage.mjs` 能跑通。

### 3.3 主要工作目录

当前最重要的两个历史目录:

- 主工作目录:
  `/Users/mark/Documents/Codex/2026-04-26/bedsonline-skills`
- 旧 CJK/SEA 基线目录:
  `/Users/mark/Documents/Codex/2026-04-23/mac-mini-codex-mac-mini-codex/bedsonline-sea-complete`

当前这次接管整理目录:

- `/Users/mark/Documents/Codex/2026-05-13/bedsonline-md-b-bedsonline-skills`

## 4. 建议拷贝到另一台设备的最小资料包

如果目标是“另一台设备上的 Codex 直接接手”，建议至少复制以下内容：

### 必拷

1. `~/.codex/skills/bedsonline-extract/`
2. `/Users/mark/Documents/Codex/2026-04-26/bedsonline-skills/`
3. `/Users/mark/Documents/Codex/2026-04-23/mac-mini-codex-mac-mini-codex/bedsonline-sea-complete/`
4. 本文档本身

### 建议拷

5. `~/codex-workspace/browser-profiles/bedsonline/`

说明:

- 如果 profile 一起带过去，可能可以直接继承登录态，但仍然要重新验证 token。
- 如果 profile 失效，直接用本文档中的账号密码重新登录即可。

## 5. 另一台设备的推荐接管步骤

### 第一步: 准备运行环境

要求:

- Node.js
- npm
- Playwright
- Python 3
- `openpyxl`

如果新设备没有 Playwright，可在任务目录执行：

```bash
npm init -y
npm install --save-dev playwright
npx playwright install chromium
```

### 第二步: 把 skill 和工作目录放到位

推荐保持以下逻辑结构：

- `~/.codex/skills/bedsonline-extract`
- `~/codex-workspace/browser-profiles/bedsonline`
- `<YOUR_WORKDIR>/bedsonline-skills`

### 第三步: 先验证登录，不要先跑大提取

```bash
node ~/.codex/skills/bedsonline-extract/scripts/verify-login.mjs --workdir=<YOUR_WORKDIR>/bedsonline-run
```

看这两个结果：

- `loggedInLikely: true/false`
- `bedsonline-login-verify.json` 是否生成

注意:

- `loggedInLikely: true` 只能说明页面不像登录页。
- 它不等于 token 一定可用。

### 第四步: 立刻验证 token / API 是否可用

```bash
node ~/.codex/skills/bedsonline-extract/scripts/discover-coverage.mjs --countries=CN,JP,KR,SG --outputPrefix=probe --workdir=<YOUR_WORKDIR>/bedsonline-run --headless=false
```

如果能正常返回各城市产品数，说明 token 可用。

如果报：

```text
Missing Bedsonline darwinToken
```

说明必须重新登录。

## 6. Bedsonline 登录恢复流程

### 6.1 原则

下一位 Codex 要记住：

- 页面登录态和 API token 是两回事
- `darwinToken` 才是提取链路真正的放行条件

### 6.2 当前已验证的登录页选择器

2026-05-13 这次实测时，Bedsonline 登录页 DOM 关键选择器如下：

- 用户名输入框: `#username`
- 用户名属性: `name="username"` / `formcontrolname="username"`
- 密码输入框: `#password`
- 登录按钮: `button[data-qa="login-button"]`

### 6.3 手工登录

如果 Codex 能打开可见浏览器窗口，最稳的方式是：

1. 打开
   `https://app-bedsonline.gta-travel.cn/auth/login?redirectTo=%2Fmain%3Fmkt%3DCN`
2. 填用户名密码
3. 登录后重新跑 `verify-login.mjs`
4. 再跑 `discover-coverage.mjs`

### 6.4 自动登录

2026-05-13 这次已经在当前机器验证过：

- 先打开可见浏览器
- 用 `#username` / `#password` / `button[data-qa="login-button"]` 自动填表
- 登录后恢复 token
- 随后可以直接跑四国 live 覆盖

### 6.5 成功标准

成功标准不是“页面进入主页”，而是下面两条至少满足第二条：

1. `verify-login.mjs` 显示 `loggedInLikely: true`
2. `discover-coverage.mjs` 能实际返回数据，不报 `Missing Bedsonline darwinToken`

## 7. 常用命令库

### 7.1 只读登录校验

```bash
node ~/.codex/skills/bedsonline-extract/scripts/verify-login.mjs --workdir=.
```

### 7.2 按国家扫描城市覆盖和产品数

```bash
node ~/.codex/skills/bedsonline-extract/scripts/discover-coverage.mjs --countries=CN,JP,KR,SG --outputPrefix=live-coverage --workdir=. --headless=false
```

### 7.3 全量提取产品明细

```bash
node ~/.codex/skills/bedsonline-extract/scripts/crawl-countries.mjs --countries=CN,JP,KR,SG --outputPrefix=live-products --workdir=. --headless=false
```

### 7.4 构建统计报表

```bash
python3 ~/.codex/skills/bedsonline-extract/scripts/build-statistics.py --inputPrefix=live-products --title="Bedsonline Live Statistics" --workdir .
```

### 7.5 打包给 GPT Pro

```bash
python3 ~/.codex/skills/bedsonline-extract/scripts/build-gpt-pro-package.py --inputFile=reports/live-products.csv --outputPrefix=live-products-gpt-pro --workdir=.
```

## 8. 目录与输出结构

默认输出结构：

```text
<workdir>/
  data/
  reports/
  artifacts/logs/
  artifacts/screenshots/
```

重点文件：

- `data/<prefix>.json`
- `reports/<prefix>.csv`
- `data/<prefix>-products.json`
- `reports/<prefix>-products.csv`
- `data/<prefix>-city-summary.json`
- `reports/<prefix>-city-summary.csv`
- `artifacts/logs/<prefix>-extraction-log.md`
- `artifacts/logs/<prefix>-extraction-events.jsonl`

## 9. 历史查询与提取记录时间线

### 2026-04-23: CJK 基线

来源目录:

- `/Users/mark/Documents/Codex/2026-04-23/mac-mini-codex-mac-mini-codex/bedsonline-sea-complete`

关键结果:

- China + Japan + South Korea 基线
- 日本总产品数: `301`
- 东京: `148`
- 大阪: `54`
- 首尔: `29`
- 釜山: `12`

关键文件:

- `reports/bedsonline-cjk-final-report.md`
- `reports/cjk-city-summary.csv`
- `data/cjk-city-summary.json`

### 2026-04-27: HK / MO / TW 提取

来源目录:

- `/Users/mark/Documents/Codex/2026-04-26/bedsonline-skills`

关键结果:

- Hong Kong: `60`
- Macau: `3`
- Taiwan: `8`
- 总计: `71`

关键文件:

- `artifacts/logs/hk-mo-tw-extraction-log.md`
- `reports/hk-mo-tw-products.csv`
- `reports/hk-mo-tw-final-report.md`
- `reports/hk-mo-tw-gpt-pro-handoff/`

### 2026-04-29: Tokyo / Osaka / Seoul refresh

关键结果:

- Tokyo: `151`
- Osaka: `52`
- Seoul: `33`

相对于 2026-04-23 基线：

- Tokyo: `148 -> 151`
- Osaka: `54 -> 52`
- Seoul: `29 -> 33`

关键文件:

- `reports/hbx-tokyo-osaka-seoul-refresh-summary.md`
- `reports/hbx-tokyo-osaka-seoul-refresh-products.csv`
- `reports/hbx-tokyo-osaka-seoul-refresh-handoff/`

### 2026-05-12: JP / CN / SG / HK 扫描

关键结果:

- China: `82`
- Japan: `43`
- Singapore: `158`
- Hong Kong: `60`

这轮需要特别注意：

- 日本整体结果明显偏低
- Tokyo 当时只返回 `13`
- Fukuoka / Hokkaido / Nara / Okinawa / Sapporo 等当时都显示 `0`

因此:

- 这轮 Japan 数据不能当作东京正常基线
- 更像是当时接口返回、会话状态或可售窗口导致的异常低值

关键文件:

- `artifacts/logs/scan-20260512-jp-cn-sg-hk-extraction-log.md`
- `artifacts/logs/scan-20260512-jp-cn-sg-hk-extraction-events.jsonl`
- `reports/scan-20260512-jp-cn-sg-hk-products.csv`

### 2026-05-13: 最新 live 重跑 CN / JP / KR / SG

来源目录:

- `/Users/mark/Documents/Codex/2026-05-13/bedsonline-md-b-bedsonline-skills`

关键结果:

- China: `82`
- Japan: `321`
- South Korea: `47`
- Singapore: `158`

城市结果:

- Tokyo: `159`
- Kyoto: `60`
- Osaka: `57`
- Seoul: `32`
- Busan: `14`
- Jeju- Do: `1`
- Singapore: `158`

关键文件:

- `live-20260513-cn-jp-kr-sg-summary.md`
- `live-20260513-cn-jp-kr-sg-product-cities.csv`
- `reports/live-20260513-cn-jp-kr-sg.csv`
- `data/live-20260513-cn-jp-kr-sg.json`

## 10. 关键口径判断

### 10.1 Tokyo 159 是否膨胀

当前判断:

- 不是异常膨胀
- 更像是恢复到了正常区间

原因:

- 2026-04-23 Tokyo = `148`
- 2026-04-29 Tokyo = `151`
- 2026-05-13 Tokyo = `159`
- 唯一异常点是 2026-05-12 Tokyo = `13`

所以更合理的解释是：

- `2026-05-12` 那轮 Japan 数据异常偏低
- `2026-05-13` live 重跑更可信

### 10.2 Bedsonline 数字为什么会波动

要默认接受以下现实：

- Bedsonline 活动产品对搜索日期窗口敏感
- 有些产品会因为可售日期、票池、临时上下架、账号会话状态而变化
- 同一个城市的产品数，不一定每天稳定

因此:

- 做纵向比较时，必须保留日期窗口
- 必须保留原始日志和 events.jsonl
- 不要只抄最终总数

## 11. 下一位 Codex 最容易踩的坑

### 坑 1: 看到页面已登录，就直接开始提取

错误。

必须先验证：

- `verify-login.mjs`
- `discover-coverage.mjs`

### 坑 2: 误把 2026-05-12 的 Japan=43 当作稳定基线

错误。

这轮明显异常偏低，尤其 Tokyo 只有 `13`，与前后记录不连续。

### 坑 3: 只复制文档，不复制 skill 和历史工作目录

错误。

没有这些目录，下一位只能看到口头说明，无法直接复用脚本和历史 CSV/JSON。

### 坑 4: profile 带过去了，就以为一定能直接跑

错误。

profile 可能过期，token 可能丢失，仍要重新验证。

## 12. 推荐给另一台设备 Codex 的起手 prompt

可以直接把下面这段给另一台设备上的 Codex：

```text
请按 /path/to/bedsonline-codex-transfer-playbook-2026-05-13.md 接管 Bedsonline 工作流。

要求：
1. 先检查 skill、profile、工作目录是否到位
2. 先验证登录态，再验证 darwinToken / API 可用性
3. 不要把“页面看起来已登录”当成可提取成功
4. 优先使用 bedsonline-extract skill 的现有脚本，不要重写流程
5. 如需重跑城市覆盖，先跑 discover-coverage.mjs
6. 如需重跑产品明细，再跑 crawl-countries.mjs
7. 输出统一写入 data / reports / artifacts/logs
8. 对比历史结果时，注意 2026-05-12 Japan/Tokyo 明显异常偏低，不能当稳定基线
```

## 13. 当前最重要的可点击文件

### 当前接管文档

- [bedsonline-codex-transfer-playbook-2026-05-13.md](/Users/mark/Documents/Codex/2026-05-13/bedsonline-md-b-bedsonline-skills/bedsonline-codex-transfer-playbook-2026-05-13.md)

### 当前最新 live 结果

- [live-20260513-cn-jp-kr-sg-summary.md](/Users/mark/Documents/Codex/2026-05-13/bedsonline-md-b-bedsonline-skills/live-20260513-cn-jp-kr-sg-summary.md)
- [live-20260513-cn-jp-kr-sg-product-cities.csv](/Users/mark/Documents/Codex/2026-05-13/bedsonline-md-b-bedsonline-skills/live-20260513-cn-jp-kr-sg-product-cities.csv)
- [live-20260513-cn-jp-kr-sg.csv](/Users/mark/Documents/Codex/2026-05-13/bedsonline-md-b-bedsonline-skills/reports/live-20260513-cn-jp-kr-sg.csv)
- [live-20260513-cn-jp-kr-sg.json](/Users/mark/Documents/Codex/2026-05-13/bedsonline-md-b-bedsonline-skills/data/live-20260513-cn-jp-kr-sg.json)

### 历史关键记录

- [bedsonline-cjk-final-report.md](/Users/mark/Documents/Codex/2026-04-23/mac-mini-codex-mac-mini-codex/bedsonline-sea-complete/reports/bedsonline-cjk-final-report.md)
- [hbx-tokyo-osaka-seoul-refresh-summary.md](/Users/mark/Documents/Codex/2026-04-26/bedsonline-skills/reports/hbx-tokyo-osaka-seoul-refresh-summary.md)
- [scan-20260512-jp-cn-sg-hk-extraction-log.md](/Users/mark/Documents/Codex/2026-04-26/bedsonline-skills/artifacts/logs/scan-20260512-jp-cn-sg-hk-extraction-log.md)
- [hk-mo-tw-extraction-log.md](/Users/mark/Documents/Codex/2026-04-26/bedsonline-skills/artifacts/logs/hk-mo-tw-extraction-log.md)

## 14. 最终一句话总结

下一台设备要想顺利接管 Bedsonline，不是只需要“账号密码”，而是需要同时接管：

- 登录信息
- 浏览器持久化 profile
- `bedsonline-extract` skill
- 历史工作目录与日志
- 对历史数字口径的理解

这五项一起带过去，Codex 才能真正做到“直接来使用”。
