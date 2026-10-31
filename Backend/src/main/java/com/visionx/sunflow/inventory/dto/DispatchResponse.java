package com.visionx.sunflow.inventory.dto;

import com.visionx.sunflow.inventory.entity.DispatchOrder;
import com.visionx.sunflow.inventory.entity.DispatchOrderStatus;

import java.time.Instant;
import java.util.List;

public record DispatchResponse(
        String id,
        String dispatchNumber,
        String orderId,
        DispatchOrderStatus status,
        Instant dispatchedAt,
        Instant deliveredAt,
        String deliveryPerson,
        String deliveryPhone,
        Instant createdAt,
        List<DispatchItemResponse> items
) {
    public static DispatchResponse fromEntity(DispatchOrder d) {
        List<DispatchItemResponse> itemResponses = d.getItems().stream()
                .map(DispatchItemResponse::fromEntity)
                .toList();

        return new DispatchResponse(
                d.getId(),
                d.getDispatchNumber(),
                d.getOrderId(),
                d.getStatus(),
                d.getDispatchedAt(),
                d.getDeliveredAt(),
                d.getDeliveryPerson(),
                d.getDeliveryPhone(),
                d.getCreatedAt(),
                itemResponses
        );
    }
}

