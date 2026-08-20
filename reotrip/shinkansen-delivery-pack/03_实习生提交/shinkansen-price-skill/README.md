# 新干线车票价格查询 Skill

这个 Skill 用于从客人文本或需求截图中识别日本新干线查价条件，并在公开查价页面中整理可购买车次和真实展示价格。它是只读查价工具，不是下单、锁票或支付工具。

## 用途

- 识别出行日期、出发地、目的地、期望出发时间和乘客人数。
- 使用 Trip.com 公开页面查询可购买新干线车次。
- 输出车次时间、站点、列车类型、坐席类别和页面真实展示价格。
- 目标日期未开售时，使用已释放库存中的参考日期，并明确标注参考原因。
- 生成 JSON 和 HTML 查询结果页，便于核查和展示。

## 输入

支持两类输入：

1. 文本需求，例如：`客人 2 位成人，想在 2026 年 7 月 20 日上午 10 点左右从东京站到大阪，帮忙查新干线票价。`
2. 需求截图，例如聊天记录、手写需求或截图中包含日期、路线、人数的信息。截图需要先由 Codex 视觉识别转写成文字，再按同一流程查价。

如果缺少日期、出发地或目的地，需要先补问。若只缺少时间，可按无时间限制查询。

## 输出

输出使用固定结构：

```text
需求识别：
日期：YYYY-MM-DD
出发地：...
目的地：...
期望时间：...
乘客人数：...

查询结果：
1. 车次或列车类型：以网站展示为准
   出发：HH:MM，出发站
   到达：HH:MM，到达站
   坐席价格：
   - 坐席类别或页面显示价格：USD xx.xx 或 HKD xx.xx

说明：
目标日期是否已开售；如未开售，说明参考日期和参考原因。
```

正式展示页由 `scripts/tripcom_select_request.cjs` 生成 HTML。页面会展示需求识别、查询结果、坐席价格和说明；来源网站、查询 URL 等过程信息保留在 JSON 或说明区中。

## 使用方式

在 Codex 中调用 `shinkansen-price-skill`，提供客人的自然语言需求或截图。Codex 按 `SKILL.md` 先提取条件，再打开公开查价页进行只读查询，最后按固定格式输出。

### HTML 查询工作台

入口：`scripts/request_workbench_server.cjs`

示例：

```powershell
& "C:\Users\starfish\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "D:\常用文件\reotrip\arrange schedule skill\03_实习生提交\shinkansen-price-skill\scripts\request_workbench_server.cjs"
```

启动后打开 `http://127.0.0.1:8787/`。页面支持在输入框粘贴客人需求，或上传包含需求文字的图片；服务端会先做需求识别，再调用 Trip.com 自动查询脚本，并把结果展示在页面中，同时写入 `examples/workbench-runs/` 下的 JSON 和 HTML。图片识别依赖本机 `tesseract.js` OCR，若 OCR 未能读出文字，页面会停止查询并提示补充文本，不会猜测需求。

首次在新的电脑或解压后的目录使用图片识别前，在 Skill 根目录执行 `pnpm install` 安装 `package.json` 中声明的 `tesseract.js`；首次 OCR 会下载并缓存中文语言数据。查询脚本在 Codex 的内置浏览器环境中运行，不需要登录或下单。

### Trip.com 自动选择脚本

入口：`scripts/tripcom_select_request.cjs`

示例：

```powershell
& "C:\Users\starfish\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "D:\常用文件\reotrip\arrange schedule skill\03_实习生提交\shinkansen-price-skill\scripts\tripcom_select_request.cjs" --text "客人一家 2 大 1 小，想在 2026 年 7 月 25 日下午从东京去京都，优先看可预订的新干线车次。" --output "D:\常用文件\reotrip\arrange schedule skill\03_实习生提交\shinkansen-price-skill\examples\trip-selection-result.json" --html-output "D:\常用文件\reotrip\arrange schedule skill\03_实习生提交\shinkansen-price-skill\examples\trip-selection-result.html"
```

脚本会打开 Trip.com 香港繁体中文火车入口，先确认右上角币种为 USD；USD 不可见时才尝试 HKD，两个币种都不可见则停止。随后按提取结果选择出发地、目的地、日期和时间并点击搜索。对“下午”默认按 15:00，“上午/早上”按 08:00，“中午”按 12:00。

## 支持渠道

- Trip.com：当前自动化脚本稳定优先支持的渠道，优先 USD，未能确认 USD 时停止。
- Klook：已提供公开页入口脚本，但当前自动化访问会收到 HTTP 403；未实现条件选择、车次或价格抓取，不作为基础自动化结果来源。

Klook 公开页入口：`scripts/open_klook_public_page.cjs`。该脚本默认打开任务中给出的 Klook 日本铁路搜索 URL，只检查页面能否加载，不选择行程、不提交搜索、不进入预订流程。加 `--headed` 可显示浏览器窗口；若 Klook 返回 403 或验证码等访问控制，脚本会如实记录并停止，不会绕过。Klook 的动态条件选择和价格提取仍未实现。

## 坐席价格说明

Trip.com 公开结果列表有时只显示一个可购买价格，不暴露 Non-reserved / Reserved / Green Car 等细分坐席。脚本会把公开列表真实展示价格写入 `seatPrices`，类别标为“Trip.com 公开列表显示价格（坐席类别未暴露）”；不会自行补造坐席类别或价格。若后续公开页面安全展开面板能看到坐席类别，才可记录具体坐席类别。

## 安全边界

- 不登录账号。
- 不加入购物车。
- 不点击进入会锁票、占座、生成订单或填写乘客信息的流程。
- 不提交订单。
- 不进入支付流程。
- 不绕过验证码、风控、地区限制或访问控制。
- 不高频批量请求网站。

如果价格只在下单或锁票流程后才出现，应停止并说明无法在合规边界内取得价格。

## 未开售日期处理

当目标日期未开售时，不得估价。脚本会优先在已释放库存日期中使用合适参考日：日期未定且要求热门参考时选已释放库存中的周六；明确目标日期未开售时选同星期几的参考日期。输出时必须说明参考日期和原因，不能把参考价说成目标日期真实价格。

## 已知限制

- Klook 自动化对比尚未实现。
- Trip.com 对部分反向路线可能不渲染公开车次卡片，脚本会记录“页面无可见车次”，不生成价格。
- 过去日期在 Trip.com 日期控件中不可选，脚本会停止，不用历史价格估算。
- 公开列表未暴露细分坐席时，只能展示页面真实价格，不能推断不同坐席类别。
