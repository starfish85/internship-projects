# Snake Game MySQL

一个基于 Python Pygame 的贪吃蛇游戏，支持难度选择、暂停、重新开始，并使用 MySQL 保存每局得分和读取历史最高分。

## 功能

- 贪吃蛇基础玩法
- 简单、中等、困难三档难度
- 方向键控制移动
- 空格键暂停和继续
- 游戏结束后保存本次得分
- 从 MySQL 查询历史最高分
- 菜单、顶部信息栏和结束界面显示最高分

## 项目文件

- `SnakeGame.py`：游戏主程序
- `snake_scores_schema.sql`：数据库和分数表初始化脚本
- `docs/snake_score_flow.mmd`：用户操作到最高分显示的 Mermaid 链路图
- `requirements.txt`：Python 依赖
- `.gitignore`：Git 忽略规则

## 环境要求

- Python 3
- MySQL
- Python 依赖：`pygame`、`mysql-connector-python`

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
database = "game_db"
```

如果你的 MySQL 用户名、密码、端口或数据库名不同，请在 `SnakeGame.py` 的 `DB_CONFIG` 中修改。

程序启动时会自动创建数据库 `game_db` 和数据表 `snake_scores`。也可以手动执行：

```bash
mysql -u root -p -P 3307 < snake_scores_schema.sql
```

## 运行

```bash
python SnakeGame.py
```

操作方式：

```text
方向键  控制蛇移动
空格键  暂停/继续
R       游戏结束后返回菜单
```

## 分数链路

游戏的“用户操作 -> 游戏逻辑 -> 得分写入 -> 数据库查询 -> 显示最高分”链路图见：

```text
docs/snake_score_flow.mmd
```

当前实现中，游戏循环、碰撞判断、得分写入和最高分查询都在 Pygame 主线程同步执行。游戏逻辑和界面渲染必须保持同步；MySQL 写入和最高分查询可以改成异步任务，以减少数据库慢响应导致的画面卡顿。

## 数据表结构

```sql
CREATE TABLE IF NOT EXISTS snake_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    score INT NOT NULL,
    playtime DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 注意事项

- 当前代码中的数据库密码是本地示例值，公开仓库建议改为环境变量或本机私有配置。
- 如果 MySQL 连接失败，游戏仍可运行，但不会保存得分，也无法读取历史最高分。
- Pygame 窗口需要本机图形界面环境运行。
