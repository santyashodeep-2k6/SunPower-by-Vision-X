package com.visionx.sunflow.order.dto;

import com.visionx.sunflow.order.entity.Payment;
import com.visionx.sunflow.order.entity.PaymentType;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResponse(
        String id,
        String orderId,
        BigDecimal amount,
        PaymentType paymentType,
        String paymentMethod,
        String paymentReference,
        String status,
        Instant receivedAt
) {
    public static PaymentResponse fromEntity(Payment p) {
        return new PaymentResponse(
                p.getId(),
                p.getOrder().getId(),
                p.getAmount(),
                p.getPaymentType(),
                p.getPaymentMethod(),
                p.getPaymentReference(),
                p.getStatus(),
                p.getReceivedAt()
        );
    }
}

