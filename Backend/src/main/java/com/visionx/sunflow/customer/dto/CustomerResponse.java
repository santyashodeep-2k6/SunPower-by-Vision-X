package com.visionx.sunflow.customer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.visionx.sunflow.customer.entity.Customer;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CustomerResponse(
    UUID id,
    String name,
    String email,
    String phone,
    String companyName,
    String gstNumber,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    @JsonProperty("customerId")
    public String customerId() {
        return id != null ? id.toString() : null;
    }

    public static CustomerResponse fromEntity(Customer customer) {
        return new CustomerResponse(
            customer.getId(),
            customer.getName(),
            customer.getEmail(),
            customer.getPhone(),
            customer.getCompanyName(),
            customer.getGstNumber(),
            customer.getCreatedAt(),
            customer.getUpdatedAt()
        );
    }
}
