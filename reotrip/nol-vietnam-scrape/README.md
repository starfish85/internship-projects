# NOL / Viator 越南单门票与纯接送采集

从 NOL（야놀자 / `tour.yanolja.com`）和 Viator 公开页采集越南「单门票」「纯接送」，导出中文表头的对照表。

本目录不含爬取结果。`data/` 和生成的 xlsx 只在本机运行时出现。

## 运行

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python3 scrape_nol_vietnam.py
python3 scrape_viator_vietnam.py
```

只要重新导出 Excel：

```bash
python3 scrape_nol_vietnam.py --xlsx-only
```

## 文件

| 文件 | 说明 |
| --- | --- |
| `scrape_nol_vietnam.py` | NOL 列表 / 详情 / 套餐价 |
| `scrape_viator_vietnam.py` | Viator 越南同类产品 |
| `export_xlsx.py` | 中文表头与样式 |
| `ko_zh.py` | 韩中词表 |
| `skill/` | 采集步骤和接口说明 |

请求公开接口，不登录。
