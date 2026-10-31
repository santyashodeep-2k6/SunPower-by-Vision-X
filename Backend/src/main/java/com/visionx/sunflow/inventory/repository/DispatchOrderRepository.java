package com.visionx.sunflow.inventory.repository;

import com.visionx.sunflow.inventory.entity.DispatchOrder;
import com.visionx.sunflow.inventory.entity.DispatchOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DispatchOrderRepository extends JpaRepository<DispatchOrder, String> {
    Optional<DispatchOrder> findByDispatchNumber(String dispatchNumber);
    List<DispatchOrder> findByOrderId(String orderId);
    List<DispatchOrder> findByStatus(DispatchOrderStatus status);
}

