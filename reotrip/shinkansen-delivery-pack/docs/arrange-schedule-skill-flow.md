# Arrange Schedule Skill 链路图

```mermaid
flowchart TD
    A[用户输入行程需求] --> B{输入类型}
    B -->|文本| C[读取自然语言需求]
    B -->|截图| D[工作台上传图片]
    D --> E[tesseract.js OCR 识别文字]
    E --> F{是否识别出有效文本?}
    F -->|否| G[提示改用清晰截图或补充文本]
    F -->|是| C

    C --> H[tripcom_select_request.cjs 提取需求字段]
    H --> I[解析日期/出发地/目的地/时间/乘客数]
    I --> J{日期/出发地/目的地是否完整?}
    J -->|否| K[要求补问缺失字段]
    J -->|是| L{是否只做字段提取?}
    L -->|是| M[返回 request JSON]
    L -->|否| N[打开 Trip.com 公共查询页]

    N --> O[确认币种优先 USD]
    O --> P{USD 可用?}
    P -->|否| Q[尝试 HKD]
    Q --> R{HKD 可用?}
    R -->|否| S[停止并说明无法取得指定币种价格]
    P -->|是| T[填写出发地/目的地/日期/时间/乘客数]
    R -->|是| T

    T --> U{目标日期是否可选/已开售?}
    U -->|否| V[选择已放票参考日期]
    V --> W[标注参考日期和原因]
    U -->|是| X[提交公共搜索]
    W --> X

    X --> Y[读取公共结果列表]
    Y --> Z{结果页是否公开显示可购买车次和价格?}
    Z -->|否| AA[停止并说明未在合规边界取得价格]
    Z -->|是| AB[收集车次/时间/站点/座席/展示价格]
    AB --> AC[排除售罄/不可预订/候补结果]
    AC --> AD[生成 JSON 结果]
    AC --> AE[生成 HTML 展示页]
    AD --> AF[examples 或 workbench-runs 输出]
    AE --> AF

    N -.备用探测.-> AG[open_klook_public_page.cjs]
    AG --> AH{Klook 公共页是否可访问?}
    AH -->|403/验证码/限制| AI[记录限制并停止]
    AH -->|可访问| AJ[仅打开公开页, 不进入下单流程]

    subgraph Workbench[本地 HTML 工作台]
        BA[request_workbench_server.cjs] --> BB[GET / 展示 request-workbench.html]
        BA --> BC[POST /api/extract 字段提取]
        BA --> BD[POST /api/query 查询并生成报告]
        BD --> H
    end
```

## 链路说明

- `SKILL.md` 定义使用边界：只读查价，不登录、不下单、不锁票、不支付。
- `scripts/request_workbench_server.cjs` 提供本地 HTML 工作台，支持文本输入和截图 OCR。
- `scripts/tripcom_select_request.cjs` 是当前主要自动化链路，负责字段提取、Trip.com 页面操作、结果采集和报告生成。
- `scripts/open_klook_public_page.cjs` 只用于 Klook 公共页访问探测，当前不作为稳定查价结果来源。
- 输出结果会写为 JSON 和 HTML，便于复核、展示和交付。
