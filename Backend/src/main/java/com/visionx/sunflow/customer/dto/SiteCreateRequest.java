package com.visionx.sunflow.customer.dto;

import com.visionx.sunflow.customer.entity.Site;
import com.visionx.sunflow.lead.PropertyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record SiteCreateRequest(
    @NotNull(message = "Customer ID is required")
    UUID customerId,

    @NotNull(message = "Property type is required")
    PropertyType propertyType,

    @NotBlank(message = "Site address is required")
    String address,

    @NotBlank(message = "City is required")
    String city,

    String pinCode,

    BigDecimal sanctionLoadKw
) {}

