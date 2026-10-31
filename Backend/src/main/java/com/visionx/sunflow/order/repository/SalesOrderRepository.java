package com.visionx.sunflow.order.repository;

import com.visionx.sunflow.order.entity.OrderStatus;
import com.visionx.sunflow.order.entity.SalesOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalesOrderRepository extends JpaRepository<SalesOrder, String> {
    Optional<SalesOrder> findByOrderNumber(String orderNumber);
    List<SalesOrder> findByCustomerId(String customerId);
    List<SalesOrder> findByStatus(OrderStatus status);
}

