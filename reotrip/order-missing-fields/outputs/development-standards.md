# 开发规范

## 适用范围

本文档约定本项目的代码注释、文档维护、Git 提交和交付规范。

项目当前包含静态 HTML 前端和 Spring Boot 后端接口模块。

前端主要代码位于：

```text
outputs/three-panel-page.html
```

后端主要代码位于：

```text
backend/src/main/java/com/reotrip/orders
```

## 代码组织

`outputs/three-panel-page.html` 同时包含：

- HTML 结构
- CSS 样式
- JavaScript 逻辑
- 内嵌订单数据 `orders`

后续如果功能持续增加，可以再拆分为独立 CSS/JS 文件；当前版本优先保持单文件交付，方便运营同事直接打开使用。

## 注释规范

注释使用中文为主，必要时保留英文业务字段名。

后端 Java 代码当前按“教学交接版”编写，用户要求每一行代码增加详细中文注释；后续新增 Java 代码也应保持同等注释密度，便于非后端同事理解。

建议添加注释的场景：

- 缺失字段判断规则。
- ReoTrip 字段和本地字段的映射。
- 邮件生成中容易误改的字段展开逻辑。
- 兼容或兜底逻辑，例如 `Manual review required`。

不建议添加注释的场景：

- 简单 DOM 赋值。
- 一眼能看懂的变量声明。
- 与代码重复的空泛说明。

注释示例：

```js
// 酒店只有中文名、简称或模糊地址时，仍按缺失处理。
if (isVagueHotel(order)) {
  // ...
}
```

## 命名规范

- JavaScript 变量和函数使用 `camelCase`。
- DOM id 保持语义清晰，例如 `orderList`、`missingList`、`mailOutput`。
- 中文展示文本直接使用中文，英文邮件字段使用自然英文。
- 订单字段保持简短稳定，例如 `pickup`、`dropoff`、`hotelNameEn`、`luggageQuantity`。

## 字段规则维护

接送订单字段规则集中维护在：

- `getMissingFields(order)`
- `getEmailFieldLines(missing)`
- `isVagueHotel(order)`

修改规则时需要同步验证：

- 中间栏缺失字段是否只显示真正缺失的信息。
- 英文邮件是否只询问缺失字段。
- 已存在字段不会被重复询问。
- 无法判断的订单会进入人工确认。

## UI 修改规范

页面风格应保持 ReoTrip 后台管理系统风格：

- 简洁
- 紧凑
- 信息密度适中
- 避免过度装饰
- 保持三栏横向布局

左侧订单列表只展示运营常用字段。完整信息放在订单详情弹窗中。

## 文档维护规范

修改功能、流程或规则时，需要同步检查：

- `README.md`
- `AGENTS.md`
- `outputs/project-handoff.md`
- `outputs/deployment-path.md`
- `outputs/user-guide.md`
- `outputs/development-standards.md`
- `backend/README.md`

如果只修复非常小的文案或样式，可以只更新相关文档。

## Git 提交规范

提交信息使用简短英文，推荐格式：

```text
Add ...
Update ...
Fix ...
Document ...
Refine ...
```

示例：

```text
Add deployment path and user guide
Update order card fields
Document ReoTrip transfer order filtering flow
Fix missing field email generation
```

每次提交尽量只包含一类变化：

- 页面功能修改
- 字段规则修改
- 文档修改
- 交付配置修改

## 提交前检查

提交前执行：

```powershell
git status --short
```

确认不要提交：

- `.agents/`
- `.codex/`
- `.git/`
- `work/`
- `*.zip`
- 日志或临时文件
- 任何密钥、Token、Cookie、账号密码

建议检查页面：

1. 打开 `outputs/three-panel-page.html`。
2. 切换日期。
3. 点击订单统计卡片。
4. 点击订单卡片，确认详情弹窗正常。
5. 查看缺失字段。
6. 点击 `邮件生成`。
7. 点击 `复制邮件内容`。

## 常用提交命令

```powershell
git add README.md AGENTS.md backend outputs/three-panel-page.html outputs/project-handoff.md outputs/deployment-path.md outputs/user-guide.md outputs/development-standards.md
git commit -m "Update project documentation"
git push
```

根据实际修改文件调整 `git add` 列表。

## 交付规范

交付包可生成到：

```text
outputs/reotrip-missing-fields-project-delivery.zip
```

交付包建议包含：

- `.gitignore`
- `README.md`
- `AGENTS.md`
- `backend/`
- `outputs/three-panel-page.html`
- `outputs/project-handoff.md`
- `outputs/deployment-path.md`
- `outputs/user-guide.md`
- `outputs/development-standards.md`

交付包不提交 Git，因为 `*.zip` 已被 `.gitignore` 排除。
