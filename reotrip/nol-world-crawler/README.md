# NOL World（原 Interpark Global）C 端 Tours & Activities 调研爬虫

对 [NOL World TNA 列表页](https://world.nol.com/en/tna/categories/all/products) 做**公开信息**竞品调研，重点判断北京/上海是否有可售「单门票」。

> 仅请求公开 API/页面；不登录、不绕过验证码。请求间隔 ≥0.5s；全部 HTTP 落盘 `raw/` + `logs/requests.jsonl`。

## 验收相关目录

| 路径 | 说明 |
|------|------|
| `output/raw/` | 列表/详情 API JSON、详情 HTML 原文 |
| `output/logs/requests.jsonl` | 每次请求的完整 URL、status、raw 相对路径 |
| `output/product_ids.json` | 本次 product_id 全集（重合率对比） |
| `output/verification_sample.json` | 随机详情页标题 vs API name |
| `output/nol_beijing_shanghai_tickets_YYYYMMDD.xlsx` | 结构化结果 |

Excel sheets：`products` / `exclusions` / `meta` / `field_dictionary` / `待人工确认` / `catalog_all` / `verification_sample` / `sample_fields_preview`

**字段溯源**：主表含 `field_sources_json`、`raw_list_path`、`raw_detail_*`。标注 `inferred` 的字段（如 `product_type`、`price_from`、`detail_url` 模板、`attraction_name` 去前缀）不得当作 API 原始事实。

## 公开 API

| 用途 | 方法 | 路径 |
|------|------|------|
| 列表分页 | GET | `https://world.nol.com/api/tna-product/products` |
| 详情 | GET | `https://world.nol.com/api/tna-product/products/{id}` |
| 详情 HTML | GET | `https://world.nol.com/{en\|zh-CN}/tna/products/{id}` |

列表参数：`startDate` `endDate` `language`(`EN`/`ZH_CN`) `page` `size` `currency` `withReview` `sortType` `categoryCodes`(`TG001`…`TG005`) `geotagKeys`（仅 Seoul/Busan/Jeju）

Header：`kint5-language: en` 或 `zh-CN`

## 安装与运行

```bash
cd "/Users/mac/nol C端爬取"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 全量爬取（写 raw/ + logs/ + Excel）
python -m src.main --currency USD --interval 0.6 --html-sample 12

# 第二次运行（对比重合率）
python -m src.main --currency USD --interval 0.6 --html-sample 5
python scripts/compare_runs.py output/runs/<run1> output/runs/<run2>
```

可选：`--max-pages N` 调试；`--also-zh` 追加中文语言列表；`--no-detail-api` 仅列表+HTML 样本。

## 过滤逻辑

1. **城市**：仅保留 Beijing/Shanghai；依据 `geotags` + 严格关键词（`\bbeijing\b`/`\bshanghai\b`/北京/上海）。无法判定进 `待人工确认`。  
2. **单门票**：Passes 下 Parks/Landmarks/Travel Pass 等；排除 tour/experience/transfer/esim/hotel package。  
3. **零结果**：不编造产品；`meta.zero_result_explanation` + `exclusions` + `raw/list/*` 为证据。

## 合规

- robots.txt：`Allow: /`  
- 间隔 ≥0.5–1s，失败指数退避 3 次  
- 仅公开调研
