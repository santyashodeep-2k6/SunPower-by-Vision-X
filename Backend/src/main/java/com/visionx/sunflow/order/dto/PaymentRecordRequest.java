package com.visionx.sunflow.order.dto;

import com.visionx.sunflow.order.entity.PaymentType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PaymentRecordRequest(
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "1.00", message = "Amount must be at least ₹1.00")
        BigDecimal amount,

        @NotNull(message = "Payment type is required (ADVANCE, STAGE_2, FINAL)")
        PaymentType paymentType,

        @NotBlank(message = "Payment method is required (UPI, NEFT, RTGS, CHEQUE, CASH)")
        String paymentMethod,

        @NotBlank(message = "Payment reference / transaction ID is required")
        String paymentReference
) {}

