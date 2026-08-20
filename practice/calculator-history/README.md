# Calculator History

一个命令行交互式计算器，支持基础四则运算、括号、小数、负数，并可以把计算历史保存到 MySQL。

## 功能

- 支持 `+`、`-`、`*`、`/` 四则运算
- 支持括号表达式，例如 `(2 + 3) * 4`
- 支持小数和负数
- 支持 `history` 命令查看最近 10 条计算历史
- 支持 `clear` 命令清屏
- 支持 `q`、`quit`、`exit` 退出程序
- 可将表达式和计算结果保存到 MySQL 的 `calc_history` 表

## 项目文件

- `calculator.py`：计算器主程序
- `calc_history.sql`：计算历史表初始化脚本
- `.gitignore`：Git 忽略规则

## 环境要求

- Python 3
- MySQL
- Python 依赖：`mysql-connector-python`

安装依赖：

```bash
pip install mysql-connector-python
```

## 数据库配置

当前程序默认连接配置如下：

```python
host = "localhost"
user = "root"
password = "123456"
port = 3307
database = "calc_db"
```

如果你的 MySQL 用户名、密码、端口或数据库名不同，请在 `calculator.py` 中修改 `DB_CONFIG`。

## 初始化数据库

程序启动时会自动创建 `calc_history` 表，但需要提前创建并选好数据库 `calc_db`。

可以先登录 MySQL 创建数据库：

```sql
CREATE DATABASE IF NOT EXISTS calc_db;
USE calc_db;
```

然后执行表结构脚本：

```bash
mysql -u root -p -P 3307 calc_db < calc_history.sql
```

表结构如下：

```sql
CREATE TABLE IF NOT EXISTS calc_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expression TEXT NOT NULL,
    result VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 运行

启动程序：

```bash
python calculator.py
```

示例输入：

```text
>>> 1 + 2 * 3
= 7

>>> (8 - 3) / 2
= 2.5

>>> history
```

退出程序：

```text
>>> q
```

## 注意事项

- 当前代码中数据库密码是本地示例值，上传公开仓库前建议改为环境变量或本机私有配置。
- 如果 MySQL 连接失败，程序仍可继续计算，但不会保存历史记录。
