package com.visionx.sunflow.inventory.dto;

import com.visionx.sunflow.inventory.entity.InventoryItem;
import com.visionx.sunflow.inventory.entity.InventoryStatus;

import java.time.Instant;

public record InventoryItemResponse(
        String id,
        String productId,
        String productName,
        String sku,
        String serialNumber,
        String warehouseLocation,
        InventoryStatus status,
        Instant createdAt
) {
    public static InventoryItemResponse fromEntity(InventoryItem i) {
        return new InventoryItemResponse(
                i.getId(),
                i.getProduct().getId(),
                i.getProduct().getName(),
                i.getProduct().getSku(),
                i.getSerialNumber(),
                i.getWarehouseLocation(),
                i.getStatus(),
                i.getCreatedAt()
        );
    }
}

