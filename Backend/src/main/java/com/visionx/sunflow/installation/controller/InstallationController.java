package com.visionx.sunflow.installation.controller;

import com.visionx.sunflow.installation.entity.InstallationJob;
import com.visionx.sunflow.installation.service.InstallationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/api/installations", "/api/v1/installations"})
@Tag(name = "Installations", description = "Installation crew scheduling and commissioning APIs")
public class InstallationController {

    private final InstallationService installationService;

    public InstallationController(InstallationService installationService) {
        this.installationService = installationService;
    }

    @PostMapping("/schedule")
    @Operation(summary = "Schedule crew for solar installation (Guarded by Double-Booking check)")
    public ResponseEntity<InstallationJob> scheduleJob(
            @RequestParam String orderId,
            @RequestParam String crewName,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate scheduledDate
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(installationService.scheduleJob(orderId, crewName, scheduledDate));
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Complete installation with digital customer signature")
    public ResponseEntity<InstallationJob> completeJob(
            @PathVariable String id,
            @RequestParam String signature
    ) {
        return ResponseEntity.ok(installationService.completeJob(id, signature));
    }

    @GetMapping
    @Operation(summary = "List all installation jobs")
    public ResponseEntity<List<InstallationJob>> getAllJobs() {
        return ResponseEntity.ok(installationService.getAllJobs());
    }
}

