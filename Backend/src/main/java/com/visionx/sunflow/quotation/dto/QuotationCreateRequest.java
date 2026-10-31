package com.visionx.sunflow.quotation.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.math.BigDecimal;

public record QuotationCreateRequest(
        @JsonAlias({"leadId", "lead"})
        String leadId,

        @JsonAlias({"siteId", "site"})
        String siteId,

        @JsonAlias({"surveyId", "survey"})
        String surveyId,

        @JsonAlias({"packageId", "package"})
        String packageId,

        @JsonAlias({"capacityKw", "capacity", "kw"})
        BigDecimal capacityKw,

        @JsonAlias({"systemType", "type"})
        String systemType,

        @JsonAlias({"propertyType", "propType"})
        String propertyType,

        String notes
) {
    public QuotationCreateRequest(
            String leadId,
            String siteId,
            String surveyId,
            BigDecimal capacityKw,
            String systemType,
            String propertyType,
            String notes
    ) {
        this(leadId, siteId, surveyId, null, capacityKw, systemType, propertyType, notes);
    }
}
