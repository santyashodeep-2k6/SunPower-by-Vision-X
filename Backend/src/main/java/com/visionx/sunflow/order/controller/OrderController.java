package com.visionx.sunflow.order.controller;

import com.visionx.sunflow.order.dto.OrderCreateRequest;
import com.visionx.sunflow.order.dto.OrderResponse;
import com.visionx.sunflow.order.dto.PaymentRecordRequest;
import com.visionx.sunflow.order.dto.PaymentResponse;
import com.visionx.sunflow.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/orders", "/api/v1/orders", "/api/sales-orders", "/api/v1/sales-orders"})
@Tag(name = "Orders", description = "Sales Orders and Stage Payment APIs")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @Operation(summary = "Create a new Sales Order (automatically computes 20% advance requirement)")
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.createOrder(request));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order by ID including payment history")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @GetMapping
    @Operation(summary = "Get all orders")
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @PostMapping("/{id}/payments")
    @Operation(summary = "Record customer payment (confirms order when 20% advance is cleared)")
    public ResponseEntity<PaymentResponse> recordPayment(
            @PathVariable String id,
            @Valid @RequestBody PaymentRecordRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.recordPayment(id, request));
    }
}

