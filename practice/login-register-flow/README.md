# 注册登录系统

这是一个基于 Tkinter 的注册登录系统，包含注册、登录、“记住我”、输错次数统计和账号锁定功能。

## 功能说明

- 注册时同步校验用户名、密码、确认密码和邮箱格式。
- 后台线程使用 bcrypt 哈希密码，并写入 MySQL。
- 登录前异步查询 Redis 锁定状态，避免阻塞 Tkinter 界面。
- 密码错误或用户名不存在时记录失败次数。
- 连续输错 3 次后锁定账号 120 秒，界面显示倒计时并暂时禁用登录按钮。
- 勾选“记住我”后，将用户名保存到本地 `login_cache.json`，下次启动时尝试自动登录。
- 退出登录时清除本地登录缓存。

## 项目文件

| 文件 | 说明 |
| --- | --- |
| `login_system.py` | 注册登录系统主程序 |
| `requirements.txt` | Python 依赖 |
| `docs/login_register_lock_flow.mmd` | Mermaid 链路图源文件 |
| `docs/login_register_lock_flow.png` | Mermaid 链路图图片 |
| `docs/login_system.md` | 链路图与实现说明 |
| `login_system_package.zip` | 登录系统及配套资料压缩包 |

## 环境要求

- Python 3
- MySQL，默认连接 `localhost:3307`
- Redis，默认连接 `localhost:6379`
- Tkinter，通常随 Python 一起安装

安装依赖：

```text
pip install -r requirements.txt
```

运行前请启动 MySQL 和 Redis，并根据本机环境修改 `login_system.py` 顶部的 `DB_CONFIG` 和 `REDIS_CONFIG`。

```text
python login_system.py
```

程序首次启动时会自动创建 `user_db` 数据库和 `users` 表。

## 链路图说明

- 红色节点表示 Tkinter 主线程中的同步操作。
- 蓝色节点表示后台线程中的异步操作。
- 黄色菱形表示条件判断。
- 锁定流程使用 Redis `SETEX` 保存 120 秒锁定状态。

完整图示请查看 [`docs/login_register_lock_flow.png`](docs/login_register_lock_flow.png)，源文件请查看 [`docs/login_register_lock_flow.mmd`](docs/login_register_lock_flow.mmd)。
