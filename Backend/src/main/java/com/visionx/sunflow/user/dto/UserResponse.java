package com.visionx.sunflow.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.visionx.sunflow.common.security.Role;
import com.visionx.sunflow.user.entity.User;

import java.util.UUID;

/**
 * Safe user transfer DTO without password hash.
 */
public record UserResponse(
    UUID id,
    String username,
    String email,
    String fullName,
    String phone,
    Role role,
    boolean active
) {
    @JsonProperty("name")
    public String name() {
        return fullName;
    }

    @JsonProperty("title")
    public String title() {
        if (role == null) return "Staff";
        return switch (role) {
            case ADMIN -> "Director & Administrator";
            case SALES -> "Solar Sales Consultant";
            case SURVEYOR -> "Technical Site Surveyor";
            case INVENTORY -> "Warehouse & Inventory Manager";
            case INSTALLER -> "Solar Installation Technician";
            case SERVICE -> "Field Service Engineer";
            case CUSTOMER -> "Customer";
        };
    }

    public static UserResponse fromEntity(User user) {
        return new UserResponse(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getFullName(),
            user.getPhone(),
            user.getRole(),
            user.isActive()
        );
    }
}

