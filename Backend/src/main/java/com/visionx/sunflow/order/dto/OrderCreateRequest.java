package com.visionx.sunflow.order.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record OrderCreateRequest(
        String quotationId,
        
        @NotBlank(message = "Customer ID is required")
        String customerId,
        
        String siteId,

        @NotNull(message = "Total order amount is required")
        @DecimalMin(value = "1000.00", message = "Order amount must be at least ₹1,000")
        BigDecimal totalAmount,

        String notes
) {}

