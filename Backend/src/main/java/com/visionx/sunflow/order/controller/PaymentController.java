package com.visionx.sunflow.order.controller;

import com.visionx.sunflow.order.dto.PaymentResponse;
import com.visionx.sunflow.order.repository.PaymentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/payments", "/api/v1/payments"})
@Tag(name = "Payments", description = "Customer payment transactions and history")
public class PaymentController {

    private final PaymentRepository paymentRepository;

    public PaymentController(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @GetMapping
    @Operation(summary = "Get all customer payments")
    public ResponseEntity<List<PaymentResponse>> getAllPayments() {
        List<PaymentResponse> list = paymentRepository.findAll().stream()
                .map(PaymentResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(list);
    }
}

