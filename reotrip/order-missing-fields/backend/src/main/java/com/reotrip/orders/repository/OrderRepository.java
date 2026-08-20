package com.reotrip.orders.repository; // 声明订单仓库接口所在包。

import com.reotrip.orders.model.TravelOrder; // 引入旅游订单实体。

import java.util.List; // 引入列表类型，用于返回批量订单。
import java.util.Optional; // 引入 Optional 类型，用于表达可能不存在的订单。

public interface OrderRepository { // 定义订单仓库接口，后续可由内存或 MySQL 实现。
    TravelOrder save(TravelOrder order); // 保存或更新一条订单。
    List<TravelOrder> saveAll(List<TravelOrder> orders); // 批量保存或更新订单。
    Optional<TravelOrder> findByOrderNo(String orderNo); // 根据订单编号查询单条订单。
    List<TravelOrder> findAll(); // 查询全部订单。
} // 结束订单仓库接口。
