package com.reotrip.orders.service; // 声明订单校验服务所在包。

import com.reotrip.orders.dto.OrderValidationResult; // 引入订单校验结果 DTO。
import com.reotrip.orders.model.TravelOrder; // 引入旅游订单实体。
import org.springframework.stereotype.Service; // 引入服务注解，让 Spring 管理该类。

import java.util.ArrayList; // 引入 ArrayList，用于收集缺失字段和异常原因。
import java.util.List; // 引入 List 类型。

@Service // 标记该类为业务服务组件。
public class OrderValidationService { // 定义订单字段完整性和异常识别服务。

    public OrderValidationResult validate(TravelOrder order) { // 校验单条订单并返回缺失字段与异常原因。
        List<String> missingFields = new ArrayList<>(); // 创建缺失字段列表。
        List<String> abnormalReasons = new ArrayList<>(); // 创建异常原因列表。
        boolean missingPhone = isBlank(order.getPhone()); // 判断手机号是否缺失。
        if (missingPhone) { missingFields.add("手机号 / phone"); } // 如果缺失手机号，则加入缺失字段列表。
        boolean missingAddress = isMissingAddress(order); // 判断地址信息是否缺失。
        if (missingAddress) { missingFields.add("地址 / address"); } // 如果缺失地址，则加入缺失字段列表。
        collectTransferMissingFields(order, missingFields); // 按接送订单规则补充缺失字段。
        collectAbnormalReasons(order, abnormalReasons); // 收集行程异常原因。
        boolean abnormalItinerary = !abnormalReasons.isEmpty(); // 如果异常原因不为空，则认为行程异常。
        return new OrderValidationResult(order.getOrderNo(), missingPhone, missingAddress, abnormalItinerary, missingFields, abnormalReasons); // 返回完整校验结果。
    } // 结束订单校验方法。

    private void collectTransferMissingFields(TravelOrder order, List<String> missingFields) { // 收集接送订单缺失字段。
        if (!isTransfer(order)) { return; } // 如果不是接送订单，则不执行接送字段检查。
        if (order.getTravelDate() == null) { missingFields.add("行程日期 / travelDate"); } // 如果行程日期为空，则记录缺失。
        if (isBlank(order.getPickupTime())) { missingFields.add("接送时间 / pickupTime"); } // 如果接送时间为空，则记录缺失。
        if (isBlank(order.getPickupAddress())) { missingFields.add("上车地址 / pickupAddress"); } // 如果上车地址为空，则记录缺失。
        if (isBlank(order.getDropoffAddress())) { missingFields.add("下车地址 / dropoffAddress"); } // 如果下车地址为空，则记录缺失。
        if (isBlank(order.getPassengerCount())) { missingFields.add("乘客人数 / passengerCount"); } // 如果乘客人数为空，则记录缺失。
        if (isBlank(order.getLuggageInfo())) { missingFields.add("行李信息 / luggageInfo"); } // 如果行李信息为空，则记录缺失。
        if (isBlank(order.getHotelAddress()) && looksLikeHotelRelated(order)) { missingFields.add("酒店完整地址 / hotelAddress"); } // 如果酒店相关但缺少酒店地址，则记录缺失。
    } // 结束接送缺失字段收集方法。

    private void collectAbnormalReasons(TravelOrder order, List<String> abnormalReasons) { // 收集行程异常原因。
        if (isBlank(order.getOrderType())) { abnormalReasons.add("订单类型为空，需要人工确认"); } // 如果订单类型为空，则记录异常。
        if (order.getTravelDate() == null) { abnormalReasons.add("行程日期为空"); } // 如果行程日期为空，则记录异常。
        if (isTransfer(order) && Boolean.FALSE.equals(order.getRouteClear())) { abnormalReasons.add("接送路线方向不清楚"); } // 如果接送路线不清楚，则记录异常。
        if (isTransfer(order) && isBlank(order.getPickupTime())) { abnormalReasons.add("接送订单缺少接送时间"); } // 如果接送订单缺少时间，则记录异常。
        if (isTransfer(order) && isBlank(order.getPickupAddress())) { abnormalReasons.add("接送订单缺少上车地址"); } // 如果接送订单缺少上车地址，则记录异常。
        if (isTransfer(order) && isBlank(order.getDropoffAddress())) { abnormalReasons.add("接送订单缺少下车地址"); } // 如果接送订单缺少下车地址，则记录异常。
    } // 结束异常原因收集方法。

    private boolean isMissingAddress(TravelOrder order) { // 判断订单是否缺失关键地址。
        if (isTransfer(order)) { return isBlank(order.getPickupAddress()) || isBlank(order.getDropoffAddress()); } // 接送订单必须同时有上车和下车地址。
        return isBlank(order.getHotelAddress()) && isBlank(order.getPickupAddress()) && isBlank(order.getDropoffAddress()); // 非接送订单如果所有地址字段都为空，则视为缺失地址。
    } // 结束缺失地址判断方法。

    private boolean looksLikeHotelRelated(TravelOrder order) { // 判断订单是否涉及酒店信息。
        return !isBlank(order.getHotelName()) || containsIgnoreCase(order.getItinerary(), "hotel"); // 如果有酒店名或行程包含 hotel，则认为酒店相关。
    } // 结束酒店相关判断方法。

    private boolean isTransfer(TravelOrder order) { // 判断订单是否为接送订单。
        return "接送".equals(order.getOrderType()); // 当前以中文订单类型“接送”为准。
    } // 结束接送订单判断方法。

    private boolean containsIgnoreCase(String text, String keyword) { // 定义忽略大小写包含判断。
        return text != null && text.toLowerCase().contains(keyword.toLowerCase()); // 文本不为空且小写后包含关键词则返回 true。
    } // 结束忽略大小写判断方法。

    private boolean isBlank(String value) { // 判断字符串是否为空白。
        return value == null || value.trim().isEmpty(); // 如果为 null 或去空格后为空，则返回 true。
    } // 结束空白判断方法。
} // 结束订单校验服务。
