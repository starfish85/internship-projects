# CDP / listing helpers

## `cdp-session.mjs`（§52 / §53）

- `connectNolPage({ killPeers, forceViewport, viewport })`
- 默认 **不** `setViewportSize`；若设仅 `1440×900` / `1512×982`
- `innerWidth < 1280` → 停；`killPeerCdpScripts` 单 CDP
- 默认 action timeout 30s / nav 60s

## China times（§40 唯一）

| 文件 | 用途 |
| --- | --- |
| **`set-times-china.mjs`** | **唯一** `setTimesChina` / `setTimesChinaOnOption` / `readTimesCompact` / `tempSaveNext` |
| `../pek-fix-times.mjs` | PEK 入口 — 只 import lib |
| `../hq-fix-times.mjs` | 虹桥入口 — 只 import lib |
| `../hq-fix-times2.mjs` | **@deprecated** LIVE 禁用 |

**规则：** 任一步读回失败抛 `SetTimesStepError` → 改 **本 lib** 再跑；禁止在 list-/fix- 脚本内手搓第二套或 `retry once`。

**8 步：** open → repeat → start → end → interval → generate → modalSave → compact。

详见 skill §40「已验证路径」。
