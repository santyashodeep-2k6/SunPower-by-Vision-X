package com.visionx.sunflow.quotation.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record QuotationCreateRequest(
        String leadId,
        String siteId,
        String surveyId,

        @NotNull(message = "Capacity kW is required")
        @DecimalMin(value = "0.5", message = "System capacity must be at least 0.5 kW")
        BigDecimal capacityKw,

        @NotBlank(message = "System type is required (ON_GRID, OFF_GRID, HYBRID)")
        String systemType,

        String propertyType, // RESIDENTIAL, COMMERCIAL, INDUSTRIAL
        String notes
) {}

