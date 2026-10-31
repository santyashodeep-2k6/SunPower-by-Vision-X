package com.visionx.sunflow.inventory.controller;

import com.visionx.sunflow.inventory.dto.InventoryItemResponse;
import com.visionx.sunflow.inventory.entity.InventoryStatus;
import com.visionx.sunflow.inventory.repository.InventoryItemRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/inventory", "/api/v1/inventory"})
@Tag(name = "Inventory", description = "Hardware stock and serialized item tracking")
public class InventoryController {

    private final InventoryItemRepository inventoryItemRepository;

    public InventoryController(InventoryItemRepository inventoryItemRepository) {
        this.inventoryItemRepository = inventoryItemRepository;
    }

    @GetMapping({"", "/units"})
    @Operation(summary = "List all inventory items/units with optional status filter")
    public ResponseEntity<List<InventoryItemResponse>> getInventory(
            @RequestParam(required = false) InventoryStatus status
    ) {
        List<InventoryItemResponse> list = (status != null
                ? inventoryItemRepository.findByStatus(status)
                : inventoryItemRepository.findAll())
                .stream()
                .map(InventoryItemResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/reservations")
    @Operation(summary = "List active inventory reservations")
    public ResponseEntity<List<Object>> getReservations() {
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/movements")
    @Operation(summary = "List inventory movements audit log")
    public ResponseEntity<List<Object>> getMovements() {
        return ResponseEntity.ok(List.of());
    }
}

