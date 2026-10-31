package com.visionx.sunflow.lead.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.visionx.sunflow.lead.EnquiryChannel;
import com.visionx.sunflow.lead.PropertyType;
import com.visionx.sunflow.lead.SystemType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record LeadCreateRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 200, message = "Full name must not exceed 200 characters")
        @JsonAlias({"name", "customerName", "contactName"})
        String fullName,

        @NotBlank(message = "Phone number is required")
        @Size(max = 20, message = "Phone number must not exceed 20 characters")
        String phone,

        @Size(max = 255)
        String email,

        @Size(max = 500)
        String address,

        @Size(max = 100)
        String city,

        PropertyType propertyType,

        @JsonAlias({"preferredCapacity", "capacity", "capacityKw"})
        BigDecimal requestedCapacityKw,

        SystemType systemType,

        BigDecimal monthlyBill,

        @JsonAlias({"roofArea", "areaSqft"})
        BigDecimal roofAreaSqft,

        @JsonAlias({"language"})
        @Size(max = 30)
        String preferredLanguage,

        Boolean subsidyInterest,

        @JsonAlias({"source"})
        EnquiryChannel channel,

        @JsonAlias({"requirements", "notes"})
        @Size(max = 500)
        String qualificationNotes
) {}
