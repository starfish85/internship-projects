# 酒店爬取流水线（分目的地 · 分酒店 · 断点 · 温控）

## 总流程

```text
1) 目的地酒店清单（区域文件夹）
2) 区域内酒店产品信息 + 图片
3) 已释放库存日期的日历价（分月表）
```

目的地优先级：**北上广深 → 其余 CN 目的地**（`config/pipeline.json`）。

## 数据根目录（外接盘）

```text
/Volumes/CodexArchive/hbx-hotel-crawl/hotel-pipeline/
├── 00-state/
│   ├── checkpoint.json          # 断点
│   ├── progress.jsonl           # 进度流水
│   └── probes/                  # 日历价探针
├── 01-destination-lists/        # 分区域酒店清单
│   ├── PEK-北京/
│   │   ├── hotel-list.csv
│   │   ├── hotel-list.jsonl
│   │   └── meta.json
│   ├── PVG-上海/
│   ├── CN1-广州市-广东/
│   └── SZX-深圳市-广东/
└── 02-hotel-products/           # 分目的地 / 分酒店
    └── PEK/
        ├── _hotel-index.jsonl
        └── {hotelCode}/
            ├── product.json
            ├── calendar.json
            ├── product.xlsx     # 表1=产品信息；其余表=日历价_YYYY-MM
            └── images/
```

本地镜像（薄）：`hotel-cn-crawl/hotel-data/`（清单 meta/csv + 状态 + 样例产品）。

## 命令

```bash
cd "/Users/mac/hbx产品爬取/hotel-cn-crawl"

# 0. 磁盘温度
npm run disk:monitor

# 1. 调试 Chrome（已存密码可自动/手动登录）
npm run chrome:launch

# 2. Phase1：北上广深酒店清单
npm run pipeline:list -- --tier=1
# 或只要北京：
npm run pipeline:list -- --only=PEK

# 3. 日历价探针（先探针再批量）
npm run pipeline:probe-calendar -- --dest=PEK

# 4. Phase2：产品信息 xlsx（可 limit 试跑）
npm run pipeline:products -- --dest=PEK --limit=20

# 5. Phase3：日历价（探针 HIT 后）
npm run pipeline:calendar -- --dest=PEK --limit=5
```

## 断点

- 文件：`hotel-pipeline/00-state/checkpoint.json`
- 记录：`progress.jsonl`（含 `pause` 原因：温度、登录失败、接口错误等）
- 已完成目的地 `listStatus=done` 会自动跳过

## 温控

| 温度 | 行为 |
|------|------|
| ≥55°C | 警告并短暂暂停写入 |
| ≥62°C | 暂停任务并写断点 |
| ≥68°C | 判定危险，停止 |

脚本：`lib/disk-guard.mjs` + `scripts/monitor-external-disk.sh`  
launchd 仍可每 30 分钟监控（`npm run disk:install-cron`）。

## 登录恢复

1. 优先复用调试 Chrome profile 中的 `darwinToken`
2. 失效时打开登录页，可用环境变量 `BEDSONLINE_USERNAME` / `BEDSONLINE_PASSWORD`
3. 或依赖 Chrome 已保存密码：聚焦密码框后人工点一次 / 自动填充

## Excel 约定

`product.xlsx`：

1. **酒店产品信息** — 字段/值两列，含中英名、目的地、区、探针备注等  
2. **日历价_YYYY-MM** — 有库存/报价日期按月分表  
3. 无价时：`日历价_暂无`

生成脚本：`scripts/write-hotel-workbook.py`

## 已知限制（推进中）

- 酒店清单目前以 **FTS + 目的地码过滤** 为主（覆盖会随关键词增强）
- 详情/图片/日历价真实 path 依赖探针 HIT；日历探针命令见上
- 全量 41 万需分多天；务必保持温控与断点
