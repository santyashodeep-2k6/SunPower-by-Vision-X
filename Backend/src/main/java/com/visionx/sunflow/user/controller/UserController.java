package com.visionx.sunflow.user.controller;

import com.visionx.sunflow.common.security.Role;
import com.visionx.sunflow.user.dto.UserResponse;
import com.visionx.sunflow.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * =============================================================================
 * CONTROLLER: UserController
 * =============================================================================
 * Staff management and team assignment endpoints.
 */
@RestController
@RequestMapping({"/api/users", "/api/v1/users"})
@Tag(name = "Users & Staff", description = "Endpoints for employee directory and assignment")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    @Operation(summary = "List all active users", description = "Used by CRM dropdowns to assign salespersons, surveyors, and crew")
    public ResponseEntity<List<UserResponse>> listUsers(@RequestParam(required = false) Role role) {
        List<UserResponse> users;
        if (role != null) {
            users = userRepository.findByRoleAndActiveTrue(role).stream()
                .map(UserResponse::fromEntity)
                .toList();
        } else {
            users = userRepository.findAll().stream()
                .filter(u -> u.isActive())
                .map(UserResponse::fromEntity)
                .toList();
        }
        return ResponseEntity.ok(users);
    }
}

