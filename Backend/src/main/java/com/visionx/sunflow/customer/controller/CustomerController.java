package com.visionx.sunflow.customer.controller;

import com.visionx.sunflow.customer.dto.CustomerCreateRequest;
import com.visionx.sunflow.customer.dto.CustomerResponse;
import com.visionx.sunflow.customer.service.CustomerService;
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
 * CONTROLLER: CustomerController
 * =============================================================================
 * REST endpoints for managing customer accounts.
 */
@RestController
@RequestMapping({"/api/customers", "/api/v1/customers"})
@Tag(name = "Customers", description = "Endpoints for solar client directory and profiles")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    @Operation(summary = "List all customers", description = "Returns customer profiles for staff search and CRM")
    public ResponseEntity<List<CustomerResponse>> listCustomers() {
        return ResponseEntity.ok(customerService.findAll());
    }

    @GetMapping("/lookup")
    @Operation(summary = "Lookup customer by phone or email for CRM deduplication")
    public ResponseEntity<CustomerResponse> lookupCustomer(
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String email
    ) {
        CustomerResponse res = customerService.lookup(phone, email);
        if (res == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(res);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get customer by ID", description = "Retrieves individual customer record")
    public ResponseEntity<CustomerResponse> getCustomerById(@PathVariable UUID id) {
        return ResponseEntity.ok(customerService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create customer", description = "Registers a new customer profile or returns existing by phone")
    public ResponseEntity<CustomerResponse> createCustomer(@Valid @RequestBody CustomerCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.create(request));
    }
}
