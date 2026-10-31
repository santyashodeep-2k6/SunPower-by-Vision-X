package com.visionx.sunflow.customer.dto;

import com.visionx.sunflow.customer.entity.Customer;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record CustomerCreateRequest(
    @NotBlank(message = "Customer name is required")
    String name,

    String email,

    @NotBlank(message = "Customer phone number is required")
    String phone,

    String companyName,

    String gstNumber
) {}

