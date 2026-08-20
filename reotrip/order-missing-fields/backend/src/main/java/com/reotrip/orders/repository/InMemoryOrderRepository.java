package com.reotrip.orders.repository; // 声明内存订单仓库所在包。

import com.reotrip.orders.model.TravelOrder; // 引入旅游订单实体。
import org.springframework.stereotype.Repository; // 引入仓库注解，让 Spring 管理该类。

import java.time.LocalDate; // 引入日期类型，用于初始化示例订单。
import java.time.LocalDateTime; // 引入日期时间类型，用于保存创建更新时间。
import java.util.ArrayList; // 引入 ArrayList，用于返回列表副本。
import java.util.Comparator; // 引入排序工具，用于按日期和订单号排序。
import java.util.List; // 引入列表类型。
import java.util.Map; // 引入 Map 类型。
import java.util.Optional; // 引入 Optional 类型。
import java.util.concurrent.ConcurrentHashMap; // 引入线程安全 Map，作为简易内存存储。

@Repository // 标记该类为订单仓库组件。
public class InMemoryOrderRepository implements OrderRepository { // 定义基于内存的订单仓库实现。
    private final Map<String, TravelOrder> storage = new ConcurrentHashMap<>(); // 使用线程安全 Map 按订单编号保存订单。

    public InMemoryOrderRepository() { // 定义构造方法，用于初始化示例数据。
        save(sampleTransferOrder()); // 保存一条接送订单示例，方便启动后直接测试接口。
        save(sampleMissingOrder()); // 保存一条缺失信息订单示例，方便测试统计接口。
    } // 结束构造方法。

    @Override // 声明实现接口方法。
    public TravelOrder save(TravelOrder order) { // 保存或更新一条订单。
        LocalDateTime now = LocalDateTime.now(); // 生成当前时间。
        if (order.getCreatedAt() == null) { order.setCreatedAt(now); } // 如果创建时间为空，则补充创建时间。
        order.setUpdatedAt(now); // 每次保存都刷新更新时间。
        storage.put(order.getOrderNo(), order); // 按订单编号写入内存存储。
        return order; // 返回保存后的订单。
    } // 结束保存方法。

    @Override // 声明实现接口方法。
    public List<TravelOrder> saveAll(List<TravelOrder> orders) { // 批量保存或更新订单。
        orders.forEach(this::save); // 遍历订单列表并逐条保存。
        return orders; // 返回保存后的订单列表。
    } // 结束批量保存方法。

    @Override // 声明实现接口方法。
    public Optional<TravelOrder> findByOrderNo(String orderNo) { // 根据订单编号查询单条订单。
        return Optional.ofNullable(storage.get(orderNo)); // 从 Map 中取订单，并用 Optional 包装。
    } // 结束单条查询方法。

    @Override // 声明实现接口方法。
    public List<TravelOrder> findAll() { // 查询全部订单。
        return storage.values().stream().sorted(Comparator.comparing(TravelOrder::getTravelDate, Comparator.nullsLast(Comparator.naturalOrder())).thenComparing(TravelOrder::getOrderNo)).toList(); // 返回按日期和订单号排序后的订单列表。
    } // 结束全部查询方法。

    private TravelOrder sampleTransferOrder() { // 构造一条完整接送订单示例。
        TravelOrder order = new TravelOrder(); // 创建订单对象。
        order.setOrderNo("BR-1417501241"); // 设置订单编号。
        order.setCustomerName("Moises ayala"); // 设置客户姓名。
        order.setPhone("13800000000"); // 设置客户手机号。
        order.setTravelDate(LocalDate.of(2026, 7, 4)); // 设置行程日期。
        order.setOrderStatus("已确认"); // 设置订单状态。
        order.setOrderType("接送"); // 设置订单类型。
        order.setItinerary("Haneda Airport Private Transfer To or From Tokyo Disney Resort"); // 设置行程描述。
        order.setPickupTime("16:00"); // 设置接送时间。
        order.setPickupAddress("Haneda Airport, Hanedakuko, Ota City, Tokyo 144-0041, Japan"); // 设置上车地址。
        order.setDropoffAddress("Tokyo DisneySea Fantasy Springs Hotel, 1-2 Maihama, Urayasu, Chiba 279-8526"); // 设置下车地址。
        order.setHotelName("Tokyo DisneySea Fantasy Springs Hotel"); // 设置酒店名称。
        order.setHotelAddress("1-2 Maihama, Urayasu, Chiba 279-8526"); // 设置酒店地址。
        order.setFlightNo("Air Canada Flight #1"); // 设置航班号。
        order.setPassengerCount("Adult: 5"); // 设置乘客人数。
        order.setLuggageInfo(""); // 设置行李信息为空，用于演示缺失行李。
        order.setRouteClear(true); // 设置路线清楚。
        order.setSource("sample"); // 设置数据来源。
        return order; // 返回示例订单。
    } // 结束完整接送订单示例方法。

    private TravelOrder sampleMissingOrder() { // 构造一条缺失字段较多的接送订单示例。
        TravelOrder order = new TravelOrder(); // 创建订单对象。
        order.setOrderNo("318-4359104"); // 设置订单编号。
        order.setCustomerName("CARLOS MANTUANO"); // 设置客户姓名。
        order.setPhone(""); // 设置手机号为空，用于测试缺失手机号。
        order.setTravelDate(LocalDate.of(2026, 7, 5)); // 设置行程日期。
        order.setOrderStatus("已取消"); // 设置订单状态。
        order.setOrderType("接送"); // 设置订单类型。
        order.setItinerary("Hong Kong Disneyland Ticket + Round Trip Private Transfer Service"); // 设置行程描述。
        order.setPickupTime(""); // 设置接送时间为空，用于测试缺失时间。
        order.setPickupAddress(""); // 设置上车地址为空，用于测试缺失地址。
        order.setDropoffAddress("Hong Kong Disneyland"); // 设置下车地址。
        order.setHotelName(""); // 设置酒店名称为空。
        order.setHotelAddress(""); // 设置酒店地址为空。
        order.setFlightNo(""); // 设置航班号为空。
        order.setPassengerCount("Adult: 4"); // 设置乘客人数。
        order.setLuggageInfo(""); // 设置行李信息为空。
        order.setRouteClear(false); // 设置路线不清楚。
        order.setSource("sample"); // 设置数据来源。
        return order; // 返回示例订单。
    } // 结束缺失字段示例方法。
} // 结束内存订单仓库实现。
