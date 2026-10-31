package com.visionx.sunflow.auth.dto;

import com.visionx.sunflow.user.dto.UserResponse;

public record AuthResponse(
    String token,
    String tokenType,
    UserResponse user
) {
    public static AuthResponse of(String token, UserResponse user) {
        return new AuthResponse(token, "Bearer", user);
    }
}

