# 数据形态

一次采集只写一份 snapshot，再由脚本生成两份业务 xlsx。对比只按 **日期**（run_id 的日期部分 `YYYYMMDD`）。

## 目录与文件名

项目根：包含 `data/` 的工作区。

```
data/raw/<run_id>/snapshot.json      # 权威原始数据
data/raw/<run_id>/checkpoint.json    # 未完成时可恢复
data/raw/<run_id>/run_log.md
data/viator/viator_products_<run_id>.xlsx
data/tripadvisor/tripadvisor_locations_<run_id>.xlsx
data/comparisons/compare_<from_date>_to_<to_date>.xlsx
```

`run_id` = 开始采集时的本地时间 `YYYYMMDD_HHMM`，例 `20260820_1430`。

同日多次采集保留不同 `HHMM`。按日期对比时：某日若有多份，用该日 **最晚** 一份。

## snapshot.json

```json
{
  "run_id": "20260820_1430",
  "started_at": "2026-08-20T14:30:00+08:00",
  "finished_at": null,
  "status": "running",
  "tripadvisor_host": "https://www.tripadvisor.co.uk",
  "viator_products": [],
  "enterprise_locations": []
}
```

`status`：`running` | `paused` | `blocked` | `done`

### viator_products[]

| 字段 | 说明 |
|---|---|
| product_code | 后台 code，主键 |
| product_name | |
| viator_status | 已上线 等 |
| viator_url | 后台详情 URL |
| viator_rating | 数字或 null |
| viator_review_count | 整数或 null |
| enterprise_name | Tripadvisor 企业详情名称 |
| enterprise_location_text | Tripadvisor 企业详情位置 |
| syndication_status | `已透传` / `未透传` / `未核验` |
| ta_product_url | |
| ta_product_name | |
| ta_product_code_found | 页面读到的 code |
| ta_product_rating | |
| ta_product_review_count | |
| ta_review_type | 如 `operator reviews` |
| notes | |

### enterprise_locations[]

| 字段 | 说明 |
|---|---|
| name | |
| url | 主键；没有 URL 时用 `name + geo` 暂存，核到链接后改回 URL |
| rating | |
| review_count | |
| geo | |
| category | Things to do / Hotels / Restaurants 等，原样记录 |
| product_count | 本页实际列出的产品数 |
| sources | 数组：`viator_企业详情` / `tripadvisor_search_reotrip` / `tripadvisor_search_名称` |
| products | 见下 |

`products[]`：`name`, `url`, `rating`, `review_count`, `product_code`, `position`（1 起，页上顺序）

## checkpoint.json

```json
{
  "run_id": "20260820_1430",
  "phase": "viator_list",
  "completed_product_codes": [],
  "completed_location_urls": [],
  "blocked_reason": null
}
```

`phase`：`viator_list` → `viator_details` → `syndication` → `locations` → `xlsx` → `done`

## 两份业务 xlsx

列名必须与 `scripts/write_xlsx.py` 一致，不要手改表头。

Viator 视角一份，文件在 `data/viator/`。Tripadvisor 视角一份，两个 sheet：`企业位置`、`位置下产品`，文件在 `data/tripadvisor/`。
