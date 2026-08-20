# Contact Manager MySQL

一个基于 Python Tkinter 的桌面通讯录管理系统，使用 MySQL 保存联系人数据，适合作为第一段实习项目汇总中的个人信息管理小工具。

## 功能

- 添加联系人
- 修改联系人
- 删除联系人
- 按姓名或手机号搜索联系人
- 查看联系人列表
- 防止手机号重复添加
- 将全部联系人导出为 CSV 文件
- 启动时自动初始化 MySQL 数据库和联系人表

## 项目文件

- `ContactApp.py`：通讯录管理系统主程序
- `contacts_schema.sql`：数据库和联系人表结构脚本
- `requirements.txt`：Python 依赖
- `.gitignore`：Git 忽略规则

## 环境要求

- Python 3
- MySQL
- Python 依赖：`mysql-connector-python`

安装依赖：

```bash
pip install -r requirements.txt
```

## 数据库配置

当前程序默认连接配置如下：

```python
host = "localhost"
user = "root"
password = "123456"
port = 3307
database = "contacts_db"
```

如果你的 MySQL 用户名、密码、端口或数据库名不同，请在 `ContactApp.py` 的 `DB_CONFIG` 中修改。

程序启动时会自动创建数据库 `contacts_db` 和数据表 `contacts`。也可以手动执行 `contacts_schema.sql` 初始化表结构。

## 运行

```bash
python ContactApp.py
```

启动后会打开桌面窗口，可以在界面中完成联系人新增、搜索、修改、删除和导出。

## 数据表结构

联系人表 `contacts` 主要字段如下：

```sql
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_phone (phone)
);
```

## 注意事项

- 当前代码中的数据库密码是本地示例值，公开仓库建议改为环境变量或本机私有配置。
- 如果 MySQL 未启动或连接失败，程序会提示数据库初始化失败，联系人数据无法正常读写。
- 导出的 CSV 文件默认不纳入 Git 管理，避免把个人联系人数据提交到仓库。
