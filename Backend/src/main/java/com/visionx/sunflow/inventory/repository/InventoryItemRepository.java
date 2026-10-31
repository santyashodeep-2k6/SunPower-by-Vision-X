package com.visionx.sunflow.inventory.repository;

import com.visionx.sunflow.inventory.entity.InventoryItem;
import com.visionx.sunflow.inventory.entity.InventoryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, String> {
    Optional<InventoryItem> findBySerialNumber(String serialNumber);
    List<InventoryItem> findByProductIdAndStatus(String productId, InventoryStatus status);
    List<InventoryItem> findByStatus(InventoryStatus status);
}

