# Notepad Persistence

一个基于 Python Tkinter 的桌面记事本，支持新建、打开、保存、另存为、编辑、查找、字体调整，并在保存文件后把保存历史写入 MySQL。

## 功能

- 文本编辑：新建、打开、保存、另存为
- 常用编辑：撤销、剪切、复制、粘贴、删除、全选
- 查找与替换
- 字体大小调整和自动换行
- 保存文件时记录 MySQL 历史
- 查看最近 20 条保存历史

## 项目文件

- `notepad.py`：记事本主程序
- `docs/notepad_save_flow.mmd`：点击保存后的文件写入与数据库写入链路图
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
database = "note_db"
```

如果你的 MySQL 用户名、密码、端口或数据库名不同，请在 `notepad.py` 的 `DB_CONFIG` 中修改。

程序启动时会自动创建数据库 `note_db` 和表 `note_history`。

表结构核心字段：

```sql
CREATE TABLE IF NOT EXISTS note_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    content_summary VARCHAR(255) NOT NULL,
    content_length INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_file_name (file_name),
    INDEX idx_created_at (created_at)
);
```

## 运行

```bash
python notepad.py
```

启动后会打开桌面窗口。保存文件可以使用菜单、工具栏按钮或快捷键：

```text
Ctrl+S       保存
Ctrl+Shift+S 另存为
Ctrl+H       查看保存历史
```

## 保存链路

保存按钮的完整链路图见：

```text
docs/notepad_save_flow.mmd
```

当前实现中，文件写入和数据库写入都在 Tkinter 主线程同步执行。文件写入建议保持同步，确保用户看到“保存成功”时文件已经落盘；数据库历史记录写入可以改成后台线程或任务队列，避免 MySQL 连接慢时卡住界面。

## 注意事项

- 当前代码中的数据库密码是本地示例值，公开仓库建议改为环境变量或私有配置文件。
- 如果 MySQL 无法连接，记事本仍可编辑和保存文件，但历史记录功能不可用。
- Tkinter 的界面更新应在主线程执行；如果将数据库写入改为异步，后台任务完成后应把状态栏更新切回主线程。
