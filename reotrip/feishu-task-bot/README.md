# 飞书任务机器人

把飞书里派下来的任务落到本地目录，再交给本机助手处理。密钥只放 `.env`，不要提交。

## 运行

```bash
cp .env.example .env   # 填飞书应用 ID / Secret
npm install
node bot.mjs
```

默认会在上一级目录创建 `tasks/`，并在本目录 `data/state.json` 里记下当前任务。本仓库不包含任务内容和登录态。

`echo.mjs` 用来确认长连接和凭据是否可用。
