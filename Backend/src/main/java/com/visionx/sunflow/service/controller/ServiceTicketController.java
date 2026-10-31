package com.visionx.sunflow.service.controller;

import com.visionx.sunflow.service.dto.TicketCreateRequest;
import com.visionx.sunflow.service.dto.TicketResponse;
import com.visionx.sunflow.service.service.ServiceTicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/tickets", "/api/v1/tickets", "/api/service-tickets", "/api/v1/service-tickets"})
@Tag(name = "Service Tickets", description = "Helpdesk, Warranty Adjudication and Repairs APIs")
public class ServiceTicketController {

    private final ServiceTicketService ticketService;

    public ServiceTicketController(ServiceTicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping
    @Operation(summary = "Raise a service ticket with automated warranty adjudication (Acceptance Test 5)")
    public ResponseEntity<TicketResponse> raiseTicket(@Valid @RequestBody TicketCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.raiseTicket(request));
    }

    @GetMapping
    @Operation(summary = "Get all service tickets")
    public ResponseEntity<List<TicketResponse>> getAllTickets() {
        return ResponseEntity.ok(ticketService.getAllTickets());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get service ticket by ID")
    public ResponseEntity<TicketResponse> getTicket(@PathVariable String id) {
        return ResponseEntity.ok(ticketService.getTicketById(id));
    }

    @GetMapping("/by-serial/{serialNumber}")
    @Operation(summary = "Get ticket history for a hardware serial number")
    public ResponseEntity<List<TicketResponse>> getTicketsBySerial(@PathVariable String serialNumber) {
        return ResponseEntity.ok(ticketService.getTicketsBySerial(serialNumber));
    }

    @PostMapping("/{id}/confirm")
    @Operation(summary = "Customer confirms approval for chargeable repair")
    public ResponseEntity<TicketResponse> confirmByCustomer(@PathVariable String id) {
        return ResponseEntity.ok(ticketService.confirmByCustomer(id));
    }

    @PostMapping("/{id}/close")
    @Operation(summary = "Close repair ticket (Guarded by Customer Confirmation check)")
    public ResponseEntity<TicketResponse> closeTicket(
            @PathVariable String id,
            @RequestParam(required = false, defaultValue = "Repair completed successfully.") String resolutionNotes
    ) {
        return ResponseEntity.ok(ticketService.closeTicket(id, resolutionNotes));
    }
}

