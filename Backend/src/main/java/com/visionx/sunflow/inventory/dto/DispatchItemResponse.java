package com.visionx.sunflow.inventory.dto;

import com.visionx.sunflow.inventory.entity.DispatchItem;

import java.time.Instant;

public record DispatchItemResponse(
        String id,
        String productId,
        String productName,
        String serialNumber,
        Instant scannedAt
) {
    public static DispatchItemResponse fromEntity(DispatchItem item) {
        return new DispatchItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getSerialNumber(),
                item.getScannedAt()
        );
    }
}

