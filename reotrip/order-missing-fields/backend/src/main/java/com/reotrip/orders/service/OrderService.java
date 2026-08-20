package com.reotrip.orders.service; // 声明订单服务所在包。

import com.reotrip.orders.common.ErrorCode; // 引入统一错误码。
import com.reotrip.orders.dto.DailyOrderCount; // 引入每日订单统计 DTO。
import com.reotrip.orders.dto.OrderQueryRequest; // 引入订单查询条件 DTO。
import com.reotrip.orders.dto.OrderStatistics; // 引入订单统计 DTO。
import com.reotrip.orders.dto.OrderValidationResult; // 引入订单校验结果 DTO。
import com.reotrip.orders.dto.PageResult; // 引入分页结果 DTO。
import com.reotrip.orders.exception.BusinessException; // 引入业务异常。
import com.reotrip.orders.model.TravelOrder; // 引入订单实体。
import com.reotrip.orders.repository.OrderRepository; // 引入订单仓库接口。
import org.springframework.stereotype.Service; // 引入服务注解。

import java.util.Comparator; // 引入排序工具。
import java.util.List; // 引入列表类型。
import java.util.Map; // 引入 Map 类型。
import java.util.function.Predicate; // 引入断言函数类型，用于动态过滤。
import java.util.stream.Collectors; // 引入流收集工具。

@Service // 标记该类为订单业务服务。
public class OrderService { // 定义订单业务服务，承载查询、统计和导入能力。
    private final OrderRepository orderRepository; // 保存订单仓库依赖。
    private final OrderValidationService validationService; // 保存订单校验服务依赖。

    public OrderService(OrderRepository orderRepository, OrderValidationService validationService) { // 定义构造方法注入依赖。
        this.orderRepository = orderRepository; // 注入订单仓库。
        this.validationService = validationService; // 注入订单校验服务。
    } // 结束构造方法。

    public List<TravelOrder> importOrders(List<TravelOrder> orders) { // 导入爬虫抓取到的订单列表。
        if (orders == null || orders.isEmpty()) { throw new BusinessException(ErrorCode.PARAM_REQUIRED, "导入订单列表不能为空"); } // 如果导入列表为空，则抛出友好异常。
        orders.forEach(this::validateImportOrder); // 逐条校验导入订单的基础字段。
        return orderRepository.saveAll(orders); // 批量保存并返回保存结果。
    } // 结束导入方法。

    public PageResult<TravelOrder> queryOrders(OrderQueryRequest request) { // 根据查询条件分页查询订单。
        OrderQueryRequest safeRequest = request == null ? new OrderQueryRequest() : request; // 如果请求对象为空，则创建默认请求。
        int page = normalizePage(safeRequest.getPage()); // 规范化页码，避免小于 1。
        int size = normalizeSize(safeRequest.getSize()); // 规范化每页数量，避免过大或过小。
        List<TravelOrder> filtered = orderRepository.findAll().stream().filter(buildPredicate(safeRequest)).toList(); // 查询全部订单并按条件过滤。
        int fromIndex = Math.min((page - 1) * size, filtered.size()); // 计算当前页起始索引。
        int toIndex = Math.min(fromIndex + size, filtered.size()); // 计算当前页结束索引。
        List<TravelOrder> records = filtered.subList(fromIndex, toIndex); // 截取当前页数据。
        return new PageResult<>(records, filtered.size(), page, size); // 返回分页结果。
    } // 结束分页查询方法。

    public TravelOrder getOrderDetail(String orderNo) { // 根据订单编号查询订单详情。
        if (isBlank(orderNo)) { throw new BusinessException(ErrorCode.PARAM_REQUIRED, "订单编号不能为空"); } // 如果订单编号为空，则抛出友好异常。
        return orderRepository.findByOrderNo(orderNo).orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND)); // 查询订单，不存在则抛出订单不存在异常。
    } // 结束订单详情查询方法。

    public OrderStatistics statistics() { // 统计全部订单的缺失和每日数量。
        List<TravelOrder> orders = orderRepository.findAll(); // 查询全部订单。
        List<OrderValidationResult> validations = orders.stream().map(validationService::validate).toList(); // 对全部订单执行字段校验。
        long missingPhoneCount = validations.stream().filter(OrderValidationResult::missingPhone).count(); // 统计缺失手机号数量。
        long missingAddressCount = validations.stream().filter(OrderValidationResult::missingAddress).count(); // 统计缺失地址数量。
        long abnormalItineraryCount = validations.stream().filter(OrderValidationResult::abnormalItinerary).count(); // 统计行程异常数量。
        List<DailyOrderCount> dailyCounts = buildDailyCounts(orders); // 统计每日订单数量。
        return new OrderStatistics(orders.size(), missingPhoneCount, missingAddressCount, abnormalItineraryCount, dailyCounts); // 返回完整统计结果。
    } // 结束统计方法。

    public OrderValidationResult validateOrder(String orderNo) { // 查询单条订单的缺失字段和异常原因。
        TravelOrder order = getOrderDetail(orderNo); // 先查询订单详情。
        return validationService.validate(order); // 返回订单校验结果。
    } // 结束单条订单校验方法。

    public List<TravelOrder> exportSource(OrderQueryRequest request) { // 给 Excel 导出模块提供数据源。
        OrderQueryRequest safeRequest = request == null ? new OrderQueryRequest() : request; // 如果请求为空，则使用默认请求。
        safeRequest.setPage(1); // 导出数据源从第一页开始。
        safeRequest.setSize(10000); // 导出数据源默认最多返回一万条，避免无限制返回。
        return queryOrders(safeRequest).records(); // 复用查询逻辑并返回记录列表。
    } // 结束 Excel 数据源方法。

    private Predicate<TravelOrder> buildPredicate(OrderQueryRequest request) { // 根据查询请求构造过滤条件。
        return order -> matchesText(order.getOrderNo(), request.getOrderNo()) // 判断订单编号是否匹配。
                && matchesText(order.getPhone(), request.getPhone()) // 判断手机号是否匹配。
                && matchesText(order.getOrderType(), request.getOrderType()) // 判断订单类型是否匹配。
                && matchesText(order.getOrderStatus(), request.getStatus()) // 判断订单状态是否匹配。
                && matchesTravelDate(order, request); // 判断行程日期是否匹配。
    } // 结束过滤条件构造方法。

    private boolean matchesTravelDate(TravelOrder order, OrderQueryRequest request) { // 判断订单行程日期是否符合查询条件。
        if (request.getTravelDate() != null) { return request.getTravelDate().equals(order.getTravelDate()); } // 如果指定单日，则只匹配该日期。
        if (request.getDateFrom() != null && (order.getTravelDate() == null || order.getTravelDate().isBefore(request.getDateFrom()))) { return false; } // 如果订单日期早于开始日期，则不匹配。
        if (request.getDateTo() != null && (order.getTravelDate() == null || order.getTravelDate().isAfter(request.getDateTo()))) { return false; } // 如果订单日期晚于结束日期，则不匹配。
        return true; // 没有日期冲突则匹配。
    } // 结束日期匹配方法。

    private boolean matchesText(String actual, String expected) { // 判断文本字段是否匹配查询条件。
        if (isBlank(expected)) { return true; } // 如果查询条件为空，则不限制该字段。
        return actual != null && actual.toLowerCase().contains(expected.trim().toLowerCase()); // 采用忽略大小写的包含匹配。
    } // 结束文本匹配方法。

    private List<DailyOrderCount> buildDailyCounts(List<TravelOrder> orders) { // 构建每日订单数量统计。
        Map<java.time.LocalDate, Long> grouped = orders.stream().filter(order -> order.getTravelDate() != null).collect(Collectors.groupingBy(TravelOrder::getTravelDate, Collectors.counting())); // 按行程日期分组计数。
        return grouped.entrySet().stream().sorted(Map.Entry.comparingByKey()).map(entry -> new DailyOrderCount(entry.getKey(), entry.getValue())).toList(); // 转换为按日期排序的每日统计列表。
    } // 结束每日统计构建方法。

    private void validateImportOrder(TravelOrder order) { // 校验导入订单基础字段。
        if (order == null) { throw new BusinessException(ErrorCode.PARAM_REQUIRED, "订单数据不能为空"); } // 如果订单对象为空，则抛出异常。
        if (isBlank(order.getOrderNo())) { throw new BusinessException(ErrorCode.PARAM_REQUIRED, "订单编号不能为空"); } // 如果订单编号为空，则抛出异常。
    } // 结束导入订单校验方法。

    private int normalizePage(Integer page) { // 规范化页码。
        return page == null || page < 1 ? 1 : page; // 页码为空或小于 1 时使用第一页。
    } // 结束页码规范化方法。

    private int normalizeSize(Integer size) { // 规范化每页数量。
        if (size == null || size < 1) { return 20; } // 每页数量为空或小于 1 时使用默认 20。
        return Math.min(size, 1000); // 每页最多返回 1000 条，避免接口压力过大。
    } // 结束每页数量规范化方法。

    private boolean isBlank(String value) { // 判断字符串是否为空白。
        return value == null || value.trim().isEmpty(); // 如果为 null 或去空格后为空，则返回 true。
    } // 结束空白判断方法。
} // 结束订单业务服务。
