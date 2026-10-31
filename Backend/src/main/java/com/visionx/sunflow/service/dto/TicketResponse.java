package com.visionx.sunflow.service.dto;

import com.visionx.sunflow.service.entity.ServiceTicket;

import java.math.BigDecimal;
import java.time.Instant;

public record TicketResponse(
        String id,
        String ticketNumber,
        String customerId,
        String serialNumber,
        String issueDescription,
        Boolean warrantyCovered,
        BigDecimal chargeableAmount,
        Boolean customerConfirmed,
        String status,
        String resolutionNotes,
        Instant closedAt,
        Instant createdAt
) {
    public static TicketResponse fromEntity(ServiceTicket t) {
        return new TicketResponse(
                t.getId(),
                t.getTicketNumber(),
                t.getCustomerId(),
                t.getSerialNumber(),
                t.getIssueDescription(),
                t.getWarrantyCovered(),
                t.getChargeableAmount(),
                t.getCustomerConfirmed(),
                t.getStatus(),
                t.getResolutionNotes(),
                t.getClosedAt(),
                t.getCreatedAt()
        );
    }
}

