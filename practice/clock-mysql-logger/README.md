# Clock

一个命令行实时电子时钟程序，可将时间记录写入 MySQL 数据库。

## 功能

- 在终端居中显示当前日期、时间和星期
- 每隔约 0.5 秒向 MySQL 写入一条时间记录
- 启动时自动检查并创建 `clock_db` 数据库和 `clock_log` 表
- 提供 `clock_log.sql` 用于手动初始化数据库表
- 提供 `test.py` 用于测试 MySQL 连接

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
database = "clock_db"
```

如果你的 MySQL 用户名、密码或端口不同，请在 `clock` 和 `test.py` 中同步修改对应配置。

## 初始化数据库

程序启动时会自动创建数据库和表。也可以手动执行：

```bash
mysql -u root -p -P 3307 < clock_log.sql
```

数据库表结构：

```sql
CREATE TABLE IF NOT EXISTS clock_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    time_now_datetime DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 运行

先测试数据库连接：

```bash
python test.py
```

启动时钟：

```bash
python clock
```

按 `Ctrl+C` 退出程序。

## 文件说明

- `clock`：主程序，显示实时钟并写入数据库记录
- `clock_log.sql`：数据库和表初始化脚本
- `test.py`：MySQL 连接测试脚本
- `.gitignore`：Git 忽略规则
