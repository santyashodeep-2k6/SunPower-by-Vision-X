package com.visionx.sunflow.customer.dto;

import com.visionx.sunflow.customer.entity.Site;
import com.visionx.sunflow.lead.PropertyType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SiteResponse(
    UUID id,
    UUID customerId,
    PropertyType propertyType,
    String address,
    String city,
    String pinCode,
    BigDecimal sanctionLoadKw,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public static SiteResponse fromEntity(Site site) {
        return new SiteResponse(
            site.getId(),
            site.getCustomerId(),
            site.getPropertyType(),
            site.getAddress(),
            site.getCity(),
            site.getPinCode(),
            site.getSanctionLoadKw(),
            site.getCreatedAt(),
            site.getUpdatedAt()
        );
    }
}

