package com.visionx.sunflow.inventory.controller;

import com.visionx.sunflow.inventory.dto.DispatchCreateRequest;
import com.visionx.sunflow.inventory.dto.DispatchResponse;
import com.visionx.sunflow.inventory.service.DispatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/dispatches", "/api/v1/dispatches"})
@Tag(name = "Dispatches", description = "Warehouse dispatch & barcode validation APIs")
public class DispatchController {

    private final DispatchService dispatchService;

    public DispatchController(DispatchService dispatchService) {
        this.dispatchService = dispatchService;
    }

    @PostMapping
    @Operation(summary = "Create warehouse dispatch order for a sales order")
    public ResponseEntity<DispatchResponse> createDispatchOrder(@Valid @RequestBody DispatchCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dispatchService.createDispatchOrder(request));
    }

    @GetMapping
    @Operation(summary = "Get all dispatch orders")
    public ResponseEntity<List<DispatchResponse>> getAllDispatches() {
        return ResponseEntity.ok(dispatchService.getAllDispatches());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get dispatch order by ID")
    public ResponseEntity<DispatchResponse> getDispatchOrder(@PathVariable String id) {
        return ResponseEntity.ok(dispatchService.getDispatchById(id));
    }

    @GetMapping("/by-order/{orderId}")
    @Operation(summary = "Get dispatch orders for a specific sales order")
    public ResponseEntity<List<DispatchResponse>> getDispatchesByOrder(@PathVariable String orderId) {
        return ResponseEntity.ok(dispatchService.getDispatchesByOrder(orderId));
    }

    @PostMapping("/{id}/validate")
    @Operation(summary = "Validate and dispatch delivery (Guarded by Acceptance Test 3 Warehouse Control)")
    public ResponseEntity<DispatchResponse> validateAndDispatch(@PathVariable String id) {
        return ResponseEntity.ok(dispatchService.validateAndDispatch(id));
    }

    @PatchMapping("/{id}/items/{itemId}/scan")
    @Operation(summary = "Scan/record barcode serial number on a dispatch item")
    public ResponseEntity<DispatchResponse> scanSerialNumber(
            @PathVariable String id,
            @PathVariable String itemId,
            @RequestParam String serialNumber
    ) {
        return ResponseEntity.ok(dispatchService.assignSerialNumber(id, itemId, serialNumber));
    }
}

