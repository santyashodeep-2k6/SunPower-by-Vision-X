package com.visionx.sunflow.lead;

import com.visionx.sunflow.lead.dto.LeadCreateRequest;
import com.visionx.sunflow.lead.dto.LeadResponse;
import com.visionx.sunflow.lead.dto.LeadStatusUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/leads", "/api/v1/leads", "/api/enquiries", "/api/v1/enquiries"})
@Tag(name = "Leads", description = "Lead management endpoints")
public class LeadController {

    private final LeadService leadService;

    public LeadController(LeadService leadService) {
        this.leadService = leadService;
    }

    @PostMapping
    @Operation(summary = "Create a new lead from an enquiry")
    public ResponseEntity<LeadResponse> createLead(@Valid @RequestBody LeadCreateRequest request) {
        LeadResponse response = leadService.createLead(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Patch lead fields")
    public ResponseEntity<LeadResponse> patchLead(@PathVariable UUID id, @RequestBody Map<String, Object> patch) {
        return ResponseEntity.ok(leadService.patchLead(id, patch));
    }

    @PostMapping("/{id}/assign")
    @Operation(summary = "Assign salesperson to lead")
    public ResponseEntity<LeadResponse> assignLead(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String userId = body != null ? body.get("userId") : null;
        return ResponseEntity.ok(leadService.assignLead(id, userId));
    }

    @PostMapping("/{id}/status")
    @Operation(summary = "Update lead status via POST")
    public ResponseEntity<LeadResponse> updateLeadStatusPost(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String statusStr = body != null ? body.get("status") : null;
        LeadStatus status = LeadStatus.fromString(statusStr);
        return ResponseEntity.ok(leadService.updateLeadStatus(id, new LeadStatusUpdateRequest(status)));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update a lead's status via PATCH")
    public ResponseEntity<LeadResponse> updateLeadStatus(
            @PathVariable UUID id,
            @Valid @RequestBody LeadStatusUpdateRequest request) {
        LeadResponse response = leadService.updateLeadStatus(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/notes")
    @Operation(summary = "Add note to lead")
    public ResponseEntity<LeadResponse> addNote(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String text = body != null ? body.get("text") : "";
        return ResponseEntity.ok(leadService.addNote(id, text));
    }

    @PostMapping("/{id}/follow-ups")
    @Operation(summary = "Record follow-up reminder")
    public ResponseEntity<Map<String, Object>> addFollowUp(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(body != null ? body : Map.of());
    }

    @PostMapping("/{id}/ai-summary")
    @Operation(summary = "Generate AI lead summary")
    public ResponseEntity<Map<String, String>> generateAiSummary(@PathVariable UUID id) {
        LeadResponse lead = leadService.getLeadById(id);
        String summary = String.format("Solar Lead: %s, %s kW %s system in %s. Monthly bill ₹%s. Feasible for rooftop installation.",
                lead.fullName(), lead.requestedCapacityKw(), lead.systemType(), lead.city(), lead.monthlyBill());
        return ResponseEntity.ok(Map.of("summary", summary));
    }

    @GetMapping
    @Operation(summary = "List leads with optional filters and pagination")
    public ResponseEntity<Page<LeadResponse>> getLeads(
            @RequestParam(required = false) LeadStatus status,
            @RequestParam(required = false) EnquiryChannel channel,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        Page<LeadResponse> leads = leadService.getLeads(status, channel, search, pageable);
        return ResponseEntity.ok(leads);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a lead by ID")
    public ResponseEntity<LeadResponse> getLeadById(@PathVariable UUID id) {
        LeadResponse response = leadService.getLeadById(id);
        return ResponseEntity.ok(response);
    }
}
