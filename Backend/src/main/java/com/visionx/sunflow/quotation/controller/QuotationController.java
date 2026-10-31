package com.visionx.sunflow.quotation.controller;

import com.visionx.sunflow.quotation.dto.QuotationCreateRequest;
import com.visionx.sunflow.quotation.dto.QuotationResponse;
import com.visionx.sunflow.quotation.service.BOMCalculationEngine;
import com.visionx.sunflow.quotation.service.QuotationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * =============================================================================
 * CONTROLLER: QuotationController
 * =============================================================================
 * Quotations and BOM Automation REST APIs.
 */
@RestController
@RequestMapping({"/api/quotations", "/api/v1/quotations"})
@Tag(name = "Quotations", description = "Quotation generation, automated BOM calculation and dispatch APIs")
public class QuotationController {

    private final QuotationService quotationService;
    private final BOMCalculationEngine bomEngine;
    private final com.visionx.sunflow.order.service.OrderService orderService;

    public QuotationController(
            QuotationService quotationService,
            BOMCalculationEngine bomEngine,
            com.visionx.sunflow.order.service.OrderService orderService
    ) {
        this.quotationService = quotationService;
        this.bomEngine = bomEngine;
        this.orderService = orderService;
    }

    @PostMapping
    @Operation(summary = "Generate quotation with automatic BOM and PM Surya Ghar subsidy calculation")
    public ResponseEntity<QuotationResponse> createQuotation(@Valid @RequestBody QuotationCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quotationService.createQuotation(request));
    }

    @PatchMapping("/{id}")
    @PutMapping("/{id}")
    @Operation(summary = "Update draft quotation (change package or adjust item quantities)")
    public ResponseEntity<QuotationResponse> updateDraftQuotation(
            @PathVariable String id,
            @RequestBody Map<String, Object> patch
    ) {
        return ResponseEntity.ok(quotationService.updateDraftQuotation(id, patch));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get quotation by ID including all BOM line items")
    public ResponseEntity<QuotationResponse> getQuotation(@PathVariable String id) {
        return ResponseEntity.ok(quotationService.getQuotationById(id));
    }

    @GetMapping
    @Operation(summary = "Get all quotations")
    public ResponseEntity<List<QuotationResponse>> getAllQuotations() {
        return ResponseEntity.ok(quotationService.getAllQuotations());
    }

    @GetMapping("/by-lead/{leadId}")
    @Operation(summary = "Get quotations for a specific lead")
    public ResponseEntity<List<QuotationResponse>> getQuotationsByLead(@PathVariable String leadId) {
        return ResponseEntity.ok(quotationService.getQuotationsByLead(leadId));
    }

    @PostMapping("/{id}/send")
    @Operation(summary = "Send quotation to customer (Guarded by Acceptance Test 1 Survey Gate)")
    public ResponseEntity<QuotationResponse> sendQuotation(@PathVariable String id) {
        return ResponseEntity.ok(quotationService.sendQuotation(id));
    }

    @PostMapping("/{id}/accept")
    @Operation(summary = "Customer accepts quotation")
    public ResponseEntity<QuotationResponse> acceptQuotation(@PathVariable String id) {
        return ResponseEntity.ok(quotationService.acceptQuotation(id));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Customer rejects quotation")
    public ResponseEntity<QuotationResponse> rejectQuotation(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(quotationService.rejectQuotation(id, reason));
    }

    @PostMapping("/{id}/sales-order")
    @Operation(summary = "Convert accepted quotation into sales order with advance payment")
    public ResponseEntity<com.visionx.sunflow.order.dto.OrderResponse> convertToSalesOrder(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, Object> advance
    ) {
        QuotationResponse q = quotationService.getQuotationById(id);
        quotationService.acceptQuotation(id);

        BigDecimal amount = (advance != null && advance.get("amount") != null)
                ? new BigDecimal(advance.get("amount").toString())
                : BigDecimal.ZERO;
        String method = (advance != null && advance.get("method") != null)
                ? advance.get("method").toString()
                : "BANK_TRANSFER";
        String reference = (advance != null && advance.get("reference") != null)
                ? advance.get("reference").toString()
                : "REF-" + System.currentTimeMillis();

        String customerId = q.leadId() != null ? q.leadId() : "DEMO_CUSTOMER";
        var orderReq = new com.visionx.sunflow.order.dto.OrderCreateRequest(
                q.id(),
                customerId,
                q.siteId(),
                q.netPayable(),
                "Generated from Quote " + q.quoteNumber()
        );
        var order = orderService.createOrder(orderReq);
        if (amount.compareTo(BigDecimal.ZERO) > 0) {
            orderService.recordPayment(order.id(), new com.visionx.sunflow.order.dto.PaymentRecordRequest(
                    amount,
                    com.visionx.sunflow.order.entity.PaymentType.ADVANCE,
                    method,
                    reference
            ));
            order = orderService.getOrderById(order.id());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    @GetMapping("/calculate-bom")
    @Operation(summary = "Instant preview calculation for solar capacity and property type")
    public ResponseEntity<BOMCalculationEngine.CalculationResult> previewBOM(
            @RequestParam BigDecimal capacityKw,
            @RequestParam(required = false, defaultValue = "RESIDENTIAL") String propertyType
    ) {
        return ResponseEntity.ok(bomEngine.calculateBOM(capacityKw, propertyType));
    }
}
