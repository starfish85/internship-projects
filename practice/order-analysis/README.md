# OrderAnalysis 订单数据分析

这是一个基于 `MySQL + Pandas` 的订单分析脚本，用来从数据库读取已支付订单，完成筛选导出、用户消费统计和补充分析，并把结果输出到本地 CSV。

## 功能

- 读取 `shop_db.orders` 中已支付订单
- 筛选金额大于 100 的订单并导出 CSV
- 按用户分组统计消费情况并导出 CSV
- 生成订单金额分布和总体统计信息
- 输出结果到 `exports/` 目录

## 处理链路

```mermaid
flowchart TD
    A["启动脚本<br/>python order_analysis.py"] --> B["main<br/>打印运行信息"]
    B --> C["load_all_orders<br/>读取已支付订单"]

    C --> D["get_db_connection<br/>连接 MySQL shop_db"]
    D --> E[("orders 表<br/>订单主表")]
    E --> F["筛选 status = 1<br/>按 created_at 倒序读取"]
    F --> G["Pandas DataFrame<br/>订单数据集"]

    G --> H{"数据是否为空?"}
    H -->|是| I["输出无数据可处理<br/>结束程序"]
    H -->|否| J["export_filtered_orders<br/>任务1: 筛选高金额订单"]

    J --> J1["筛选 total_amount > 100"]
    J1 --> J2["统计筛选数量、占比、均值、总额"]
    J2 --> J3["格式化金额与创建时间"]
    J3 --> J4[("orders_amount_gt_100_时间戳.csv")]

    G --> K["export_user_stats<br/>任务2: 用户消费统计"]
    K --> K1["按 user_id 分组"]
    K1 --> K2["统计订单数、总消费、均值、最小值、最大值"]
    K2 --> K3["按 total_spent 降序排序并添加排名"]
    K3 --> K4[("user_spending_stats_时间戳.csv")]

    G --> L["additional_analysis<br/>任务3: 补充分析"]
    J1 --> L
    K3 --> L
    L --> L1["pd.cut 金额分段<br/>1-100 / 101-500 / 501-1000 / ..."]
    L --> L2["打印总订单数、总消费、均值、中位数、最高单、最低单"]

    J4 --> M["exports 目录<br/>保存 CSV 报表"]
    K4 --> M
    L2 --> N["控制台输出分析结果"]
    M --> O["所有任务完成"]
    N --> O
```

更多细节见 [order-analysis-flow.md](./order-analysis-flow.md)。

## 运行环境

- Python 3.10+
- MySQL 8.x
- `mysql-connector-python`
- `pandas`

## 安装依赖

```bash
pip install mysql-connector-python pandas
```

## 数据库配置

在 `order_analysis.py` 中修改连接参数：

```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'port': 3307,
    'database': 'shop_db'
}
```

## 输出目录

脚本会自动创建 `exports/` 目录，用于保存导出的 CSV 文件。

## 启动方式

```bash
python order_analysis.py
```

## 说明

- 只处理 `orders.status = 1` 的已支付订单。
- 如果数据库里没有符合条件的数据，脚本会直接退出。
- 所有统计结果都以当前数据库内容为准。
