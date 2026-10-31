package com.visionx.sunflow.common;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * =============================================================================
 * CONTROLLER: OperationsSupportController
 * =============================================================================
 * Supporting operations, CRM communications, procurement and workflow collections.
 */
@RestController
@RequestMapping({"/api", "/api/v1"})
@Tag(name = "Operations & Auxiliary", description = "CRM conversations, procurement, subsidies, notifications & audit logging")
public class OperationsSupportController {

    private final List<Map<String, Object>> activities = Collections.synchronizedList(new ArrayList<>());
    private final List<Map<String, Object>> notifications = Collections.synchronizedList(new ArrayList<>());
    private final List<Map<String, Object>> conversations = Collections.synchronizedList(new ArrayList<>());
    private final List<Map<String, Object>> purchaseOrders = Collections.synchronizedList(new ArrayList<>());
    private final List<Map<String, Object>> suppliers = Collections.synchronizedList(new ArrayList<>());
    private final List<Map<String, Object>> subsidies = Collections.synchronizedList(new ArrayList<>());
    private final List<Map<String, Object>> replacements = Collections.synchronizedList(new ArrayList<>());
    private final Map<String, Object> systemSettings = Collections.synchronizedMap(new HashMap<>());

    // --- CONVERSATIONS ---
    @GetMapping("/conversations")
    @Operation(summary = "List customer conversations")
    public ResponseEntity<List<Map<String, Object>>> getConversations() {
        return ResponseEntity.ok(conversations);
    }

    @PutMapping("/conversations/{id}")
    @Operation(summary = "Save conversation transcript")
    public ResponseEntity<Map<String, Object>> updateConversation(@PathVariable String id, @RequestBody Map<String, Object> body) {
        conversations.removeIf(c -> id.equals(c.get("id")));
        conversations.add(body);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/conversations/{id}/handoff")
    public ResponseEntity<Map<String, Object>> handoff(@PathVariable String id) {
        return ResponseEntity.ok(Map.of("id", id, "status", "HANDOFF"));
    }

    @PostMapping("/conversations/{id}/resolve")
    public ResponseEntity<Map<String, Object>> resolve(@PathVariable String id) {
        return ResponseEntity.ok(Map.of("id", id, "status", "RESOLVED"));
    }

    // --- PURCHASE ORDERS & PROCUREMENT ---
    @GetMapping("/purchase-orders")
    @Operation(summary = "List purchase orders")
    public ResponseEntity<List<Map<String, Object>>> getPurchaseOrders() {
        return ResponseEntity.ok(purchaseOrders);
    }

    @PostMapping("/purchase-orders")
    @Operation(summary = "Create purchase order")
    public ResponseEntity<Map<String, Object>> createPurchaseOrder(@RequestBody Map<String, Object> body) {
        purchaseOrders.add(body);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @GetMapping("/suppliers")
    @Operation(summary = "List hardware suppliers")
    public ResponseEntity<List<Map<String, Object>>> getSuppliers() {
        return ResponseEntity.ok(suppliers);
    }

    // --- SUBSIDIES ---
    @GetMapping("/subsidies")
    @Operation(summary = "List PM Surya Ghar subsidy applications")
    public ResponseEntity<List<Map<String, Object>>> getSubsidies() {
        return ResponseEntity.ok(subsidies);
    }

    @PatchMapping("/subsidies/{id}")
    @Operation(summary = "Update subsidy application status")
    public ResponseEntity<Map<String, Object>> updateSubsidy(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("id", id, "updated", true));
    }

    // --- REPLACEMENTS ---
    @GetMapping("/replacements")
    @Operation(summary = "List warranty hardware replacement logs")
    public ResponseEntity<List<Map<String, Object>>> getReplacements() {
        return ResponseEntity.ok(replacements);
    }

    // --- NOTIFICATIONS & AUDIT ACTIVITIES ---
    @GetMapping("/notifications")
    @Operation(summary = "List user notifications")
    public ResponseEntity<List<Map<String, Object>>> getNotifications() {
        return ResponseEntity.ok(notifications);
    }

    @PostMapping("/notifications/read")
    @Operation(summary = "Mark notifications as read")
    public ResponseEntity<Map<String, Object>> markNotificationsRead(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/activities")
    @Operation(summary = "List system audit log activities")
    public ResponseEntity<List<Map<String, Object>>> getActivities() {
        return ResponseEntity.ok(activities);
    }

    // --- SETTINGS ---
    @GetMapping("/settings")
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(systemSettings);
    }

    @PatchMapping("/settings")
    public ResponseEntity<Map<String, Object>> updateSettings(@RequestBody Map<String, Object> patch) {
        systemSettings.putAll(patch);
        return ResponseEntity.ok(systemSettings);
    }
}

