package com.visionx.sunflow.auth.controller;

import com.visionx.sunflow.auth.dto.AuthResponse;
import com.visionx.sunflow.auth.dto.LoginRequest;
import com.visionx.sunflow.auth.dto.RegisterRequest;
import com.visionx.sunflow.auth.service.AuthService;
import com.visionx.sunflow.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * =============================================================================
 * CONTROLLER: AuthController
 * =============================================================================
 * REST endpoints for authentication and user self-profile.
 * 
 * Judge Walkthrough:
 * - POST /api/v1/auth/login    -> Authenticate any of the 7 hackathon roles.
 * - POST /api/v1/auth/register -> Self-registration for portal customers.
 * - GET  /api/v1/auth/me       -> Identify the current authenticated actor.
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Endpoints for user login, registration, and session info")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticates user and returns JWT token with role claims")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    @Operation(summary = "User registration", description = "Creates a new user account and returns JWT token")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @GetMapping("/me")
    @Operation(summary = "Current user profile", description = "Returns profile details of the authenticated caller")
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(authService.getCurrentUser(userDetails.getUsername()));
    }
}

