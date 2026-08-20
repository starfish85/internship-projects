# Contact App with Redis

这是一个带 Redis 缓存的通讯录项目。

## 查询链路图

```mermaid
sequenceDiagram
    autonumber
    actor U as 用户
    participant A as 通讯录应用
    participant R as Redis
    participant M as MySQL

    U->>A: 发起查询（同步）
    A->>R: 读取缓存（同步）
    alt 缓存命中
        R-->>A: 返回结果（同步）
        A-->>U: 返回数据
    else 缓存未命中
        R-->>A: 未命中
        A->>M: 查询数据库（同步）
        M-->>A: 返回结果（同步）
        A-->>U: 返回数据
        A-->>R: 异步回写缓存
    end
```

## 相关文件

- [Mermaid 原图](docs/contact-redis-flow.md)
- [主程序](ContactApp.py)

