package com.visionx.sunflow.service.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record TicketCreateRequest(
        String customerId,

        @NotBlank(message = "Serial number is required")
        String serialNumber,

        @NotBlank(message = "Issue description is required")
        String issueDescription,

        LocalDate faultDate // Optional; defaults to today if null
) {}

