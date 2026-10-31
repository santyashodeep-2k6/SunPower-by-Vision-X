package com.visionx.sunflow.user.dto;

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

