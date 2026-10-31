package com.visionx.sunflow.order.service;

import com.visionx.sunflow.common.exception.ResourceNotFoundException;
import com.visionx.sunflow.order.dto.OrderCreateRequest;
import com.visionx.sunflow.order.dto.OrderResponse;
import com.visionx.sunflow.order.dto.PaymentRecordRequest;
import com.visionx.sunflow.order.dto.PaymentResponse;
import com.visionx.sunflow.order.entity.OrderStatus;
import com.visionx.sunflow.order.entity.Payment;
import com.visionx.sunflow.order.entity.PaymentType;
import com.visionx.sunflow.order.entity.SalesOrder;
import com.visionx.sunflow.order.repository.PaymentRepository;
import com.visionx.sunflow.order.repository.SalesOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * =============================================================================
 * SERVICE: OrderService
 * =============================================================================
 * Sales Orders and Advance Payment Enforcement Service.
 * 
 * Hackathon Invariant:
 * - 20% Advance Payment Rule: Minimum 20% advance payment required to confirm order.
 * - Negative Test: Do not count an unpaid advance as collected money.
 */
@Service
public class OrderService {

    private final SalesOrderRepository orderRepository;
    private final PaymentRepository paymentRepository;

    private static final BigDecimal ADVANCE_PERCENTAGE = new BigDecimal("0.20"); // 20%

    public OrderService(SalesOrderRepository orderRepository, PaymentRepository paymentRepository) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional
    public OrderResponse createOrder(OrderCreateRequest request) {
        BigDecimal total = request.totalAmount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal advanceReq = total.multiply(ADVANCE_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);

        SalesOrder order = new SalesOrder();
        order.setOrderNumber(generateOrderNumber());
        order.setQuotationId(request.quotationId());
        order.setCustomerId(request.customerId());
        order.setSiteId(request.siteId());
        order.setTotalAmount(total);
        order.setAdvanceRequired(advanceReq);
        order.setAdvancePaid(BigDecimal.ZERO);
        order.setOutstandingAmount(total);
        order.setStatus(OrderStatus.PENDING_ADVANCE);
        order.setNotes(request.notes());

        SalesOrder saved = orderRepository.save(order);
        return OrderResponse.fromEntity(saved);
    }

    @Transactional
    public PaymentResponse recordPayment(String orderId, PaymentRecordRequest request) {
        SalesOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("SalesOrder", orderId));

        if (request.paymentReference() == null || request.paymentReference().trim().isEmpty()) {
            throw new IllegalArgumentException("Payment reference / UTR / Cheque number is mandatory.");
        }

        Payment payment = new Payment();
        payment.setAmount(request.amount());
        payment.setPaymentType(request.paymentType());
        payment.setPaymentMethod(request.paymentMethod());
        payment.setPaymentReference(request.paymentReference().trim());
        payment.setStatus("COMPLETED");

        order.addPayment(payment);

        if (request.paymentType() == PaymentType.ADVANCE) {
            order.setAdvancePaid(order.getAdvancePaid().add(request.amount()));
        }

        BigDecimal newOutstanding = order.getOutstandingAmount().subtract(request.amount()).max(BigDecimal.ZERO);
        order.setOutstandingAmount(newOutstanding);

        // If at least 20% advance received, confirm the order
        if (order.getStatus() == OrderStatus.PENDING_ADVANCE && order.getAdvancePaid().compareTo(order.getAdvanceRequired()) >= 0) {
            order.setStatus(OrderStatus.CONFIRMED);
        }

        orderRepository.save(order);
        return PaymentResponse.fromEntity(payment);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(String id) {
        return orderRepository.findById(id)
                .map(OrderResponse::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("SalesOrder", id));
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAll().stream()
                .map(OrderResponse::fromEntity)
                .toList();
    }

    private String generateOrderNumber() {
        String period = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        long count = orderRepository.count() + 1;
        return String.format("SO-%s-%04d", period, count);
    }
}

