package com.visionx.sunflow.analytics.controller;

import com.visionx.sunflow.analytics.dto.DirectorDashboardResponse;
import com.visionx.sunflow.analytics.service.ProfitabilityAnalyticsEngine;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * =============================================================================
 * CONTROLLER: DirectorDashboardController
 * =============================================================================
 * Acceptance Test 6: Director Executive Dashboard APIs.
 */
@RestController
@RequestMapping({"/api/analytics", "/api/v1/analytics"})
@Tag(name = "Director Analytics", description = "Executive dashboard, revenue, costs, margins, and operational metrics")
public class DirectorDashboardController {

    private final ProfitabilityAnalyticsEngine analyticsEngine;

    public DirectorDashboardController(ProfitabilityAnalyticsEngine analyticsEngine) {
        this.analyticsEngine = analyticsEngine;
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get Director Executive Dashboard (Acceptance Test 6: Revenue, costs, margins, pending work, tickets)")
    public ResponseEntity<DirectorDashboardResponse> getDashboard() {
        return ResponseEntity.ok(analyticsEngine.calculateDashboardMetrics());
    }
}

