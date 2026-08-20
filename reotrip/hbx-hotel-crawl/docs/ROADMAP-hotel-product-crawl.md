# 后续：HBX 酒店产品信息爬取（规划占位）

状态: **框架已建**（2026-07-27）— 正式实现落点改为 `../hotel-cn-crawl/`  
早期草稿: `../future/hotel-product-crawl/`（仅历史探测）

---

## 背景

现有流程（playbook + workspaces）主要覆盖 Bedsonline/HBX 的 **Activities（活动/门票类）** 提取与登录/覆盖探测。  
业务下一步需要在同一供应商体系下增加 **酒店（Hotel）产品信息** 爬取。

---

## 建议复用

1. **登录与 token 模型**  
   - 同一 Bedsonline 前端 / `darwinToken` 体系（以 skill 与 probe 为准）  
   - 先 `verify-login` → API 探测，再爬取

2. **本机可参考的实现风格**  
   - `workspaces/bedsonline-2026-05-31/scripts/run-city-activities.mjs`：按城市拉活动列表、落 JSON/CSV、写 process log  
   - `workspaces/bedsonline-2026-05-14/scripts/extract-beijing-activities.mjs`：单城市更早版本

3. **mark skill 中可能已有的通用能力**（补齐后优先读）  
   - `discover-coverage.mjs` / `crawl-countries.mjs` 的参数、限速、落盘约定  
   - `workflow-notes.md` 中的 API 路径与坑

---

## 建议新增目录结构（实现时）

```text
future/hotel-product-crawl/
├── README.md                 # 本阶段说明与运行方式
├── docs/
│   └── field-mapping.md      # 酒店字段与 activities 字段对照
├── scripts/
│   ├── discover-hotel-coverage.mjs
│   ├── crawl-hotels-by-city.mjs
│   └── export-hotel-csv.py
├── data/                     # 原始 JSON
├── reports/                  # CSV / 汇总
└── artifacts/logs/           # 运行日志
```

---

## 待确认问题（开工前）

1. 酒店查询 API 是否与 activities 同源域名 / 同一 token？  
2. 主键：酒店 code、合同、board、rate plan 粒度如何定义？  
3. 目标市场：国家/城市列表是否与 SEA/CJK 活动基线一致？  
4. 输出给谁：运营表、上架管道、还是 GPT Pro handoff？  
5. 限速与合规：与现有 activities 爬取是否共用同一配额？

---

## 与本包其他模块的边界

| 模块 | 是否酒店产品 |
|------|----------------|
| `workspaces/bedsonline-*` | 否（活动样例） |
| `related/reotaxis-hbx-port` | 否（港口接送成本） |
| `future/hotel-product-crawl` | **是（新工作）** |
