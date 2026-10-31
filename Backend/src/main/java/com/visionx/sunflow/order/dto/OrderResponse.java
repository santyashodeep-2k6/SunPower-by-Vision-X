package com.visionx.sunflow.order.dto;

import com.visionx.sunflow.order.entity.OrderStatus;
import com.visionx.sunflow.order.entity.SalesOrder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponse(
        String id,
        String orderNumber,
        String quotationId,
        String customerId,
        String siteId,
        BigDecimal totalAmount,
        BigDecimal advanceRequired,
        BigDecimal advancePaid,
        BigDecimal outstandingAmount,
        OrderStatus status,
        String notes,
        Instant createdAt,
        List<PaymentResponse> payments
) {
    public static OrderResponse fromEntity(SalesOrder o) {
        List<PaymentResponse> paymentResponses = o.getPayments().stream()
                .map(PaymentResponse::fromEntity)
                .toList();

        return new OrderResponse(
                o.getId(),
                o.getOrderNumber(),
                o.getQuotationId(),
                o.getCustomerId(),
                o.getSiteId(),
                o.getTotalAmount(),
                o.getAdvanceRequired(),
                o.getAdvancePaid(),
                o.getOutstandingAmount(),
                o.getStatus(),
                o.getNotes(),
                o.getCreatedAt(),
                paymentResponses
        );
    }
}

