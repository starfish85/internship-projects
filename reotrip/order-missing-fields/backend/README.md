# 订单自动化系统后端接口模块

## 模块说明

该模块使用 Spring Boot 开发，为旅游订单自动化系统提供后端数据能力。

当前版本使用简易内存存储，后续可以替换为 MySQL Repository。

## 已实现能力

- 爬虫订单数据导入
- 根据订单编号、手机号、行程日期筛选订单
- 查询单条订单详情
- 统计缺失手机号订单数量
- 统计缺失地址订单数量
- 统计行程异常订单数量
- 统计每日订单总量
- 给 Excel 导出模块提供数据源
- 统一 JSON 返回格式
- 统一异常友好提示

## 启动方式

```powershell
cd backend
mvn spring-boot:run
```

如果本机没有 Maven，需要先安装 Maven，或后续补充 Maven Wrapper。

## 接口列表

```text
GET  /api/health
POST /api/orders/import
GET  /api/orders
GET  /api/orders/{orderNo}
GET  /api/orders/{orderNo}/validation
GET  /api/orders/statistics
GET  /api/orders/export-source
```

## 查询示例

```text
GET /api/orders?orderNo=BR-1417501241
GET /api/orders?phone=13800000000
GET /api/orders?travelDate=2026-07-04
GET /api/orders?dateFrom=2026-07-04&dateTo=2026-07-05
```

## 统一返回格式

```json
{
  "success": true,
  "code": "OK",
  "message": "查询成功",
  "data": {}
}
```

## 异常返回格式

```json
{
  "success": false,
  "code": "ORDER_NOT_FOUND",
  "message": "未找到对应订单，请检查订单编号",
  "data": null
}
```

## MySQL 扩展方向

后续需要接 MySQL 时，建议新增：

- `TravelOrderEntity`
- `TravelOrderJpaRepository`
- `MysqlOrderRepository`

并让 `MysqlOrderRepository` 实现当前的 `OrderRepository` 接口。
