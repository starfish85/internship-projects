# ShoppingCart 链路图

```mermaid
flowchart TD
    A[浏览器访问 /] --> B[index 首页路由]
    B --> C[get_all_products 查询商品]
    B --> D[get_cart_count 查询购物车数量]
    C --> E[(MySQL products 表)]
    D --> F[(MySQL cart 表)]
    B --> G[渲染 templates/index.html]
    G --> H[商品首页]

    H --> I[查看商品详情 /product/:id]
    I --> J[product_detail 路由]
    J --> K[get_product_by_id 查询商品]
    K --> E
    J --> L[get_cart_count 查询购物车数量]
    L --> F
    J --> M[渲染 templates/product_detail.html]

    H --> N[加入购物车 POST /cart/add/:id]
    M --> N
    N --> O[cart_add 路由]
    O --> P[add_to_cart]
    P --> Q[校验商品是否存在和库存是否足够]
    Q --> E
    P --> R{购物车已有该商品?}
    R -->|是| S[更新 cart.quantity]
    R -->|否| T[插入 cart 记录]
    S --> F
    T --> F
    O --> U{是否 AJAX 请求?}
    U -->|是| V[返回 JSON: success/message/cart_count]
    U -->|否| W[flash 消息并重定向]

    H --> X[进入购物车 /cart]
    X --> Y[cart 路由]
    Y --> Z[get_cart_items 联表查询]
    Y --> AA[get_cart_total 计算总价]
    Y --> AB[get_cart_count 统计数量]
    Z --> E
    Z --> F
    AA --> E
    AA --> F
    AB --> F
    Y --> AC[渲染 templates/cart.html]

    AC --> AD[修改数量 POST /cart/update]
    AD --> AE[cart_update 路由]
    AE --> AF[update_cart_quantity]
    AF --> AG[按库存校验数量]
    AG --> E
    AF --> AH[更新或删除 cart 记录]
    AH --> F
    AE --> AI[返回 JSON: subtotal/total/cart_count]

    AC --> AJ[移除商品 POST /cart/remove/:cart_id]
    AJ --> AK[cart_remove 路由]
    AK --> AL[remove_from_cart]
    AL --> F
    AK --> AM[返回 JSON 或重定向购物车]

    AC --> AN[清空购物车 POST /cart/clear]
    AN --> AO[cart_clear 路由]
    AO --> AP[clear_cart]
    AP --> F
    AO --> AQ[重定向购物车]

    H --> AR[进入后台 /admin]
    AR --> AS[admin 路由]
    AS --> AT[get_all_products 查询商品]
    AT --> E
    AS --> AU[渲染 templates/admin.html]

    AU --> AV[添加商品 /admin/add]
    AV --> AW[admin_add GET/POST]
    AW --> AX{表单校验通过?}
    AX -->|否| AY[flash 错误并返回添加页]
    AX -->|是| AZ{是否上传本地图片?}
    AZ -->|是| BA[save_uploaded_file 保存到 static/images]
    AZ -->|否| BB[读取 image_url 外链]
    BA --> BC[add_product 插入商品]
    BB --> BC
    BC --> E
    AW --> BD[重定向后台列表]

    AU --> BE[删除商品 POST /admin/delete/:id]
    BE --> BF[admin_delete 路由]
    BF --> BG[delete_product]
    BG --> E
    BF --> BD
```

## 链路说明

- 前台链路围绕商品首页、商品详情和购物车操作展开。
- 购物车核心数据来自 `cart` 表，并通过 `products` 表补齐名称、价格、库存、图片等展示字段。
- 加入购物车和修改数量都会做库存校验，避免购物车数量超过商品库存。
- 后台链路负责商品新增和删除，本地上传图片会写入 `static/images/`，数据库保存图片路径。
