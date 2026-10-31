package com.visionx.sunflow.quotation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.visionx.sunflow.quotation.entity.Quotation;
import com.visionx.sunflow.quotation.entity.QuotationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public record QuotationResponse(
        String id,
        String quoteNumber,
        String customerId,
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
    @JsonProperty("customerId")
    public String customerId() {
        if (customerId != null && !customerId.isBlank()) return customerId;
        return leadId != null ? leadId : id;
    }

    @JsonProperty("capacity")
    public double capacity() {
        return capacityKw != null ? capacityKw.doubleValue() : 3.0;
    }

    @JsonProperty("labour")
    public double labour() {
        return 15000.0;
    }

    @JsonProperty("otherCharges")
    public double otherCharges() {
        return 5000.0;
    }

    @JsonProperty("validUntil")
    public String validUntil() {
        Instant date = createdAt != null ? createdAt : Instant.now();
        return date.plus(java.time.Duration.ofDays(15)).toString();
    }

    @JsonProperty("totals")
    public Map<String, Object> totals() {
        Map<String, Object> t = new HashMap<>();
        double equipment = baseAmount != null ? baseAmount.doubleValue() : 180000.0;
        double subtotal = equipment + 15000.0 + 5000.0;
        double gst = gstAmount != null ? gstAmount.doubleValue() : (subtotal * 0.138);
        double total = grossAmount != null ? grossAmount.doubleValue() : (subtotal + gst);
        double subsidy = subsidyAmount != null ? subsidyAmount.doubleValue() : 78000.0;
        double net = netPayable != null ? netPayable.doubleValue() : (total - subsidy);

        t.put("equipment", equipment);
        t.put("labour", 15000.0);
        t.put("other", 5000.0);
        t.put("subtotal", subtotal);
        t.put("gst", gst);
        t.put("total", total);
        t.put("subsidy", subsidy);
        t.put("netPayable", net);
        return t;
    }

    public static QuotationResponse fromEntity(Quotation q) {
        List<QuotationItemResponse> itemResponses = q.getItems().stream()
                .map(QuotationItemResponse::fromEntity)
                .toList();

        return new QuotationResponse(
                q.getId(),
                q.getQuoteNumber(),
                q.getCustomerId(),
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
