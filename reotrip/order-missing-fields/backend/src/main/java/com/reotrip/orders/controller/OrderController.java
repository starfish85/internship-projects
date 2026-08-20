package com.reotrip.orders.controller; // 声明订单接口控制器所在包。

import com.reotrip.orders.common.ApiResponse; // 引入统一 JSON 返回结构。
import com.reotrip.orders.dto.OrderQueryRequest; // 引入订单查询请求 DTO。
import com.reotrip.orders.dto.OrderStatistics; // 引入订单统计 DTO。
import com.reotrip.orders.dto.OrderValidationResult; // 引入订单校验结果 DTO。
import com.reotrip.orders.dto.PageResult; // 引入分页结果 DTO。
import com.reotrip.orders.model.TravelOrder; // 引入订单实体。
import com.reotrip.orders.service.OrderService; // 引入订单业务服务。
import org.springframework.web.bind.annotation.GetMapping; // 引入 GET 请求映射注解。
import org.springframework.web.bind.annotation.PathVariable; // 引入路径变量注解。
import org.springframework.web.bind.annotation.PostMapping; // 引入 POST 请求映射注解。
import org.springframework.web.bind.annotation.RequestBody; // 引入请求体注解。
import org.springframework.web.bind.annotation.RequestMapping; // 引入控制器基础路径注解。
import org.springframework.web.bind.annotation.RestController; // 引入 REST 控制器注解。

import java.util.List; // 引入列表类型。
import java.util.Map; // 引入 Map 类型，用于健康检查返回。

@RestController // 标记该类为 REST 接口控制器。
@RequestMapping("/api") // 设置该控制器下所有接口的基础路径为 /api。
public class OrderController { // 定义订单接口控制器。
    private final OrderService orderService; // 保存订单业务服务依赖。

    public OrderController(OrderService orderService) { // 定义构造方法注入业务服务。
        this.orderService = orderService; // 保存订单业务服务。
    } // 结束构造方法。

    @GetMapping("/health") // 声明健康检查接口路径。
    public ApiResponse<Map<String, String>> health() { // 定义健康检查接口。
        return ApiResponse.ok("服务正常", Map.of("status", "UP")); // 返回服务正常状态。
    } // 结束健康检查接口。

    @PostMapping("/orders/import") // 声明订单导入接口路径。
    public ApiResponse<List<TravelOrder>> importOrders(@RequestBody List<TravelOrder> orders) { // 定义导入爬虫订单数据接口。
        return ApiResponse.ok("订单导入成功", orderService.importOrders(orders)); // 调用服务导入订单并返回结果。
    } // 结束订单导入接口。

    @GetMapping("/orders") // 声明订单分页查询接口路径。
    public ApiResponse<PageResult<TravelOrder>> queryOrders(OrderQueryRequest request) { // 定义订单查询接口，Spring 会从 URL 参数绑定查询条件。
        return ApiResponse.ok("查询成功", orderService.queryOrders(request)); // 调用查询服务并返回分页结果。
    } // 结束订单查询接口。

    @GetMapping("/orders/{orderNo}") // 声明订单详情接口路径。
    public ApiResponse<TravelOrder> getOrderDetail(@PathVariable String orderNo) { // 定义根据订单编号查询详情接口。
        return ApiResponse.ok("查询成功", orderService.getOrderDetail(orderNo)); // 调用详情查询服务并返回订单。
    } // 结束订单详情接口。

    @GetMapping("/orders/{orderNo}/validation") // 声明单条订单缺失字段和异常原因接口路径。
    public ApiResponse<OrderValidationResult> validateOrder(@PathVariable String orderNo) { // 定义单条订单校验接口。
        return ApiResponse.ok("校验成功", orderService.validateOrder(orderNo)); // 调用校验服务并返回结果。
    } // 结束单条订单校验接口。

    @GetMapping("/orders/statistics") // 声明订单统计接口路径。
    public ApiResponse<OrderStatistics> statistics() { // 定义订单统计接口。
        return ApiResponse.ok("统计成功", orderService.statistics()); // 调用统计服务并返回统计结果。
    } // 结束订单统计接口。

    @GetMapping("/orders/export-source") // 声明 Excel 导出数据源接口路径。
    public ApiResponse<List<TravelOrder>> exportSource(OrderQueryRequest request) { // 定义导出数据源接口。
        return ApiResponse.ok("导出数据源查询成功", orderService.exportSource(request)); // 调用导出数据源服务并返回订单列表。
    } // 结束导出数据源接口。
} // 结束订单接口控制器。
