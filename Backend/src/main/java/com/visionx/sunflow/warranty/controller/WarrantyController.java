package com.visionx.sunflow.warranty.controller;

import com.visionx.sunflow.warranty.entity.Warranty;
import com.visionx.sunflow.warranty.repository.WarrantyRepository;
import com.visionx.sunflow.warranty.service.WarrantyAutomationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/api/warranties", "/api/v1/warranties"})
@Tag(name = "Warranties", description = "Hardware warranty and auto-generation APIs")
public class WarrantyController {

    private final WarrantyRepository warrantyRepository;
    private final WarrantyAutomationService warrantyService;

    public WarrantyController(WarrantyRepository warrantyRepository, WarrantyAutomationService warrantyService) {
        this.warrantyRepository = warrantyRepository;
        this.warrantyService = warrantyService;
    }

    @GetMapping
    @Operation(summary = "Get all warranty records")
    public ResponseEntity<List<Warranty>> getAllWarranties() {
        return ResponseEntity.ok(warrantyRepository.findAll());
    }

    @GetMapping("/by-serial/{serialNumber}")
    @Operation(summary = "Get warranty details by hardware serial number")
    public ResponseEntity<Warranty> getBySerial(@PathVariable String serialNumber) {
        return warrantyRepository.findBySerialNumber(serialNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/check")
    @Operation(summary = "Check warranty status for a serial number as of a specific date (Acceptance Test 5)")
    public ResponseEntity<WarrantyAutomationService.WarrantyCheckResult> checkWarranty(
            @RequestParam String serialNumber,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate
    ) {
        LocalDate date = asOfDate != null ? asOfDate : LocalDate.now();
        return ResponseEntity.ok(warrantyService.checkWarrantyAtDate(serialNumber, date));
    }

    @GetMapping("/verify")
    @Operation(summary = "Verify hardware warranty by serial number (Frontend alias)")
    public ResponseEntity<WarrantyAutomationService.WarrantyCheckResult> verifyWarranty(@RequestParam String serial) {
        return ResponseEntity.ok(warrantyService.checkWarrantyAtDate(serial, LocalDate.now()));
    }
}

