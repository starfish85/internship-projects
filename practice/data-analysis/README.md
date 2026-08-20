# DataAnalysis 订单数据看板

这是一个基于 `MySQL + Matplotlib` 的桌面数据分析小工具，用来从订单库里读取统计数据并渲染成可交互看板。

## 功能

- 统计今日订单量
- 统计本月已支付销售额
- 统计累计用户数
- 统计近 7 天订单量趋势
- 统计近 7 天销售额趋势
- 统计商品销售占比
- 支持按钮刷新数据
- 支持 `R` 刷新，`Esc` / `Q` 关闭窗口

## 项目结构

```text
DataAnalysis/
├─ app
├─ README.md
├─ data-analysis-flow.md
├─ data-analysis-flow.mmd
└─ .gitignore
```

## 链路图

```mermaid
flowchart TD
    A["启动数据分析看板<br/>python app"] --> B["draw_dashboard<br/>创建 Matplotlib 窗口"]
    B --> C["get_dashboard_data<br/>读取最新看板数据"]

    C --> D1["get_today_orders<br/>统计今日订单量"]
    C --> D2["get_monthly_sales<br/>统计本月销售额"]
    C --> D3["get_total_users<br/>统计总用户数"]
    C --> D4["get_last_7_days_orders<br/>统计近7天每日订单量"]
    C --> D5["get_last_7_days_sales<br/>统计近7天每日销售额"]
    C --> D6["get_product_sales_share<br/>统计各商品销售占比"]

    D1 --> E["get_db_connection<br/>连接 MySQL shop_db"]
    D2 --> E
    D3 --> E
    D4 --> E
    D5 --> E
    D6 --> E

    E --> F1[("orders 表<br/>订单主表")]
    E --> F2[("order_items 表<br/>订单明细")]
    E --> F3[("users 表<br/>用户余额")]

    F1 --> G1["COUNT 今日订单"]
    F1 --> G2["SUM 已支付本月销售额"]
    F1 --> G3["GROUP BY DATE<br/>近7天订单量"]
    F1 --> G4["GROUP BY DATE<br/>近7天已支付销售额"]
    F1 --> G5["JOIN order_items<br/>商品销售额占比"]
    F2 --> G5
    F3 --> G6["COUNT DISTINCT 用户"]

    G1 --> H["dashboard data<br/>统计结果字典"]
    G2 --> H
    G3 --> H
    G4 --> H
    G5 --> H
    G6 --> H

    H --> I["render_dashboard<br/>重绘看板"]
    I --> J1["draw_cards<br/>顶部指标卡片"]
    I --> J2["draw_orders_chart<br/>近7天订单量柱状图"]
    I --> J3["draw_sales_chart<br/>近7天销售额折线图"]
    I --> J4["draw_product_pie<br/>各商品销售占比饼图"]

    J1 --> K["Matplotlib Figure<br/>订单数据看板"]
    J2 --> K
    J3 --> K
    J4 --> K

    K --> L1["刷新数据按钮 / R 键<br/>重新查询数据库并更新图表"]
    K --> L2["关闭按钮 / Esc / Q<br/>关闭窗口"]
    L1 --> C
```

更多细节可查看 [data-analysis-flow.md](./data-analysis-flow.md) 与 [data-analysis-flow.mmd](./data-analysis-flow.mmd)。

## 运行环境

- Python 3.10+
- MySQL 8.x
- `mysql-connector-python`
- `matplotlib`

## 安装依赖

```bash
pip install mysql-connector-python matplotlib
```

## 数据库配置

在 `app` 中修改数据库连接信息：

```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'port': 3307,
    'database': 'shop_db'
}
```

项目依赖以下核心表：

- `orders`
- `order_items`
- `users`

## 启动方式

```bash
python app
```

## 说明

- 图表数据每次都从数据库实时读取。
- 如果没有已支付订单，销售额和商品占比图会显示空状态。
- 如果数据库连接失败，程序会在控制台输出错误信息。
