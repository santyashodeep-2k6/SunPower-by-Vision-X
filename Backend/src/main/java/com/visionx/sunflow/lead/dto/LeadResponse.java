package com.visionx.sunflow.lead.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.visionx.sunflow.lead.EnquiryChannel;
import com.visionx.sunflow.lead.Lead;
import com.visionx.sunflow.lead.LeadStatus;
import com.visionx.sunflow.lead.PropertyType;
import com.visionx.sunflow.lead.SystemType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record LeadResponse(
        UUID id,
        String fullName,
        String phone,
        String email,
        String address,
        String city,
        PropertyType propertyType,
        BigDecimal requestedCapacityKw,
        SystemType systemType,
        BigDecimal monthlyBill,
        BigDecimal roofAreaSqft,
        String preferredLanguage,
        Boolean subsidyInterest,
        EnquiryChannel channel,
        LeadStatus status,
        String qualificationNotes,
        String assignedTo,
        Instant createdAt,
        Instant updatedAt
) {
    @JsonProperty("leadId")
    public String leadId() {
        return id != null ? id.toString() : null;
    }

    @JsonProperty("reference")
    public String reference() {
        return id != null ? id.toString() : null;
    }

    @JsonProperty("name")
    public String name() {
        return fullName;
    }

    @JsonProperty("customerId")
    public String customerId() {
        return id != null ? id.toString() : null;
    }

    @JsonProperty("siteId")
    public String siteId() {
        return id != null ? "site-" + id.toString() : null;
    }

    @JsonProperty("roofArea")
    public BigDecimal roofArea() {
        return roofAreaSqft;
    }

    @JsonProperty("preferredCapacity")
    public BigDecimal preferredCapacity() {
        return requestedCapacityKw;
    }

    @JsonProperty("notes")
    public java.util.List<java.util.Map<String, String>> notes() {
        if (qualificationNotes != null && !qualificationNotes.isBlank()) {
            return java.util.List.of(java.util.Map.of(
                    "id", "note-init",
                    "text", qualificationNotes,
                    "author", "AI / System",
                    "at", createdAt != null ? createdAt.toString() : java.time.Instant.now().toString()
            ));
        }
        return java.util.Collections.emptyList();
    }

    public static LeadResponse from(Lead lead) {
        return new LeadResponse(
                lead.getId(),
                lead.getFullName(),
                lead.getPhone(),
                lead.getEmail(),
                lead.getAddress(),
                lead.getCity(),
                lead.getPropertyType(),
                lead.getRequestedCapacityKw(),
                lead.getSystemType(),
                lead.getMonthlyBill(),
                lead.getRoofAreaSqft(),
                lead.getPreferredLanguage(),
                lead.getSubsidyInterest(),
                lead.getChannel(),
                lead.getStatus(),
                lead.getQualificationNotes(),
                lead.getAssignedTo(),
                lead.getCreatedAt(),
                lead.getUpdatedAt()
        );
    }
}
