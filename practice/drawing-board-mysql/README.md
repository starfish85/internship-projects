# Drawing Board MySQL

一个基于 Python Tkinter 的桌面画板系统，支持画笔、直线、矩形、圆形、橡皮、清空、撤销、保存，并使用 MySQL 记录画板保存历史。

## 功能

- 画笔自由绘制
- 绘制直线
- 绘制矩形
- 绘制圆形
- 橡皮擦
- 颜色选择
- 画笔粗细调整
- 清空画布
- 撤销上一步绘制
- 保存画布为 PostScript 文件
- 保存历史写入 MySQL
- 查看最近 20 条保存历史

## 项目文件

- `DrawingApp.py`：画板系统主程序
- `draw_history_schema.sql`：数据库和保存历史表初始化脚本
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
database = "draw_db"
```

如果你的 MySQL 用户名、密码、端口或数据库名不同，请在 `DrawingApp.py` 的 `DB_CONFIG` 中修改。

程序启动时会自动创建数据库 `draw_db` 和数据表 `draw_history`。也可以手动执行 `draw_history_schema.sql` 初始化。

## 运行

```bash
python DrawingApp.py
```

启动后会打开画板窗口，可以使用工具栏切换画笔、直线、矩形、圆形、橡皮等工具。

常用快捷键：

```text
Ctrl+S  保存画布
Ctrl+Z  撤销
```

## 保存说明

保存时会将当前画布导出为 PostScript 文件，并在 MySQL 的 `draw_history` 表中记录：

- 文件名
- 文件路径
- 画布宽度
- 画布高度
- 保存时间

## 数据表结构

```sql
CREATE TABLE IF NOT EXISTS draw_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    canvas_width INT DEFAULT 0,
    canvas_height INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_file_name (file_name),
    INDEX idx_created_at (created_at)
);
```

## 注意事项

- 当前代码中的数据库密码是本地示例值，公开仓库建议改为环境变量或私有配置。
- 如果 MySQL 连接失败，画板仍可绘图和保存文件，但保存历史不可用。
- 导出的 `.ps` / `.eps` 图片文件默认不纳入 Git 管理。
