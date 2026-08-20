# 实习项目合集

ReoTrip 一期实习作品 + Python 练手项目。每个子目录是一个独立项目，进入对应文件夹看该项目的 README 即可运行。

原先用「一个分支一个项目」，已经整理成目录，默认分支为 `main`。

## 目录

```text
practice/     Python 练手（桌面应用 / 数据分析 / Web）
reotrip/      ReoTrip 实习业务工具
```

## ReoTrip 实习

| 目录 | 项目 | 说明 |
| --- | --- | --- |
| [reotrip/order-missing-fields](reotrip/order-missing-fields) | 订单缺失字段助手 | 静态页面展示接送订单、识别缺失字段、生成英文补件邮件 |
| [reotrip/shinkansen-price-skill](reotrip/shinkansen-price-skill) | 新干线查价插件 | 从文字/截图提取行程，在 Klook 公开页读取可售车次和价格 |
| [reotrip/shinkansen-delivery-pack](reotrip/shinkansen-delivery-pack) | 新干线 Skill 交付包 | 同一任务的正式提交材料（任务说明、过程记录、提交目录） |
| [reotrip/tokyo-ticket-collector](reotrip/tokyo-ticket-collector) | 东京影城门票采集 | 只读采集 Warner Bros. Studio Tour Tokyo 可售日期和时段 |
| [reotrip/nol-listing-toolkit](reotrip/nol-listing-toolkit) | NOL 上架工具包 | 门票/接送上架 Skills + 后台韩→简体翻译插件 |

## Python 练手

| 目录 | 项目 | 技术 |
| --- | --- | --- |
| [practice/login-register-flow](practice/login-register-flow) | 注册登录（锁定 / 记住我） | Tkinter, MySQL, Redis, bcrypt |
| [practice/contact-manager-mysql](practice/contact-manager-mysql) | 通讯录 | Tkinter, MySQL |
| [practice/contact-manager-redis-cache](practice/contact-manager-redis-cache) | 通讯录 + Redis 缓存 | Tkinter, MySQL, Redis |
| [practice/notepad-persistence](practice/notepad-persistence) | 记事本（保存历史） | Tkinter, MySQL |
| [practice/drawing-board-mysql](practice/drawing-board-mysql) | 画板 | Tkinter, MySQL |
| [practice/calculator-history](practice/calculator-history) | 命令行计算器 | Python, MySQL |
| [practice/clock-mysql-logger](practice/clock-mysql-logger) | 终端时钟打点 | Python, MySQL |
| [practice/snake-game-mysql](practice/snake-game-mysql) | 贪吃蛇（记分） | Pygame, MySQL |
| [practice/shopping-cart](practice/shopping-cart) | 购物车 | Flask, MySQL |
| [practice/data-analysis](practice/data-analysis) | 订单数据看板 | MySQL, Matplotlib |
| [practice/order-analysis](practice/order-analysis) | 订单分析导出 | MySQL, Pandas |

## 整理说明

- 去掉了内容重复的旧分支：时钟、ReoTrip 缺失字段、新干线文档分支、东京票务采集各只保留一份完整内容。
- 未纳入 Windows Redis 安装包、调试符号、以及通讯录分支里误放的新干线脚本。
- 各项目原始提交历史仍在 Gitee：https://gitee.com/liu-haixinha/internship-phase1-projects
