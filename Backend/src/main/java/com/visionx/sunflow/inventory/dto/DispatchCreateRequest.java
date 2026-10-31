package com.visionx.sunflow.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record DispatchCreateRequest(
        @NotBlank(message = "Sales Order ID is required")
        String orderId,

        String deliveryPerson,
        String deliveryPhone,

        @NotEmpty(message = "Dispatch items cannot be empty")
        List<DispatchItemEntry> items
) {
    public record DispatchItemEntry(
            @NotBlank(message = "Product ID is required")
            String productId,

            String serialNumber // Can be provided or scanned later
    ) {}
}

