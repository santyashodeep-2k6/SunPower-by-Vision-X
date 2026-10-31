package com.visionx.sunflow.customer.controller;

import com.visionx.sunflow.customer.dto.SiteCreateRequest;
import com.visionx.sunflow.customer.dto.SiteResponse;
import com.visionx.sunflow.customer.service.SiteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * =============================================================================
 * CONTROLLER: SiteController
 * =============================================================================
 * REST endpoints for rooftop site properties.
 */
@RestController
@RequestMapping({"/api/sites", "/api/v1/sites"})
@Tag(name = "Sites & Properties", description = "Endpoints for managing rooftop installation locations")
public class SiteController {

    private final SiteService siteService;

    public SiteController(SiteService siteService) {
        this.siteService = siteService;
    }

    @GetMapping
    @Operation(summary = "List all sites", description = "Retrieves all installation premises across customers")
    public ResponseEntity<List<SiteResponse>> listSites() {
        return ResponseEntity.ok(siteService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get site by ID", description = "Retrieves specific property site details")
    public ResponseEntity<SiteResponse> getSiteById(@PathVariable UUID id) {
        return ResponseEntity.ok(siteService.findById(id));
    }

    @GetMapping("/by-customer/{customerId}")
    @Operation(summary = "Get sites by customer", description = "Retrieves all sites belonging to a specific customer")
    public ResponseEntity<List<SiteResponse>> getSitesByCustomer(@PathVariable UUID customerId) {
        return ResponseEntity.ok(siteService.findByCustomerId(customerId));
    }

    @PostMapping
    @Operation(summary = "Create rooftop site", description = "Registers a new rooftop premises linked to a customer")
    public ResponseEntity<SiteResponse> createSite(@Valid @RequestBody SiteCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(siteService.create(request));
    }
}

