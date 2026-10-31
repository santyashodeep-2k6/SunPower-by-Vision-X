package com.visionx.sunflow.quotation.dto;

import com.visionx.sunflow.quotation.entity.Quotation;
import com.visionx.sunflow.quotation.entity.QuotationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record QuotationResponse(
        String id,
        String quoteNumber,
        String leadId,
        String siteId,
        String surveyId,
        BigDecimal capacityKw,
        String systemType,
        BigDecimal baseAmount,
        BigDecimal gstRate,
        BigDecimal gstAmount,
        BigDecimal grossAmount,
        BigDecimal subsidyAmount,
        BigDecimal netPayable,
        QuotationStatus status,
        String notes,
        Instant sentAt,
        Instant createdAt,
        List<QuotationItemResponse> items
) {
    public static QuotationResponse fromEntity(Quotation q) {
        List<QuotationItemResponse> itemResponses = q.getItems().stream()
                .map(QuotationItemResponse::fromEntity)
                .toList();

        return new QuotationResponse(
                q.getId(),
                q.getQuoteNumber(),
                q.getLeadId(),
                q.getSiteId(),
                q.getSurveyId(),
                q.getCapacityKw(),
                q.getSystemType(),
                q.getBaseAmount(),
                q.getGstRate(),
                q.getGstAmount(),
                q.getGrossAmount(),
                q.getSubsidyAmount(),
                q.getNetPayable(),
                q.getStatus(),
                q.getNotes(),
                q.getSentAt(),
                q.getCreatedAt(),
                itemResponses
        );
    }
}

