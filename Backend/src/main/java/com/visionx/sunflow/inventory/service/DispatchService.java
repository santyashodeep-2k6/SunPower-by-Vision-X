package com.visionx.sunflow.inventory.service;

import com.visionx.sunflow.common.exception.ResourceNotFoundException;
import com.visionx.sunflow.inventory.dto.DispatchCreateRequest;
import com.visionx.sunflow.inventory.dto.DispatchResponse;
import com.visionx.sunflow.inventory.entity.*;
import com.visionx.sunflow.inventory.repository.DispatchOrderRepository;
import com.visionx.sunflow.inventory.repository.InventoryItemRepository;
import com.visionx.sunflow.order.entity.OrderStatus;
import com.visionx.sunflow.order.entity.SalesOrder;
import com.visionx.sunflow.order.repository.SalesOrderRepository;
import com.visionx.sunflow.quotation.entity.Product;
import com.visionx.sunflow.quotation.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * =============================================================================
 * SERVICE: DispatchService
 * =============================================================================
 * Warehouse fulfillment, barcode scanning & dispatch gate.
 * 
 * Hackathon Highlights:
 * - Acceptance Test 3 (Warehouse Control Gate):
 *   Delivery validation is strictly BLOCKED if any item has a missing serial number.
 * - Negative Tests:
 *   1. Reject missing serial numbers.
 *   2. Reject serial numbers belonging to a different product.
 *   3. Prevent dispatch of unavailable inventory.
 *   4. Reject duplicate serial numbers across items.
 */
@Service
public class DispatchService {

    private final DispatchOrderRepository dispatchOrderRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final ProductRepository productRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final com.visionx.sunflow.warranty.service.WarrantyAutomationService warrantyAutomationService;

    public DispatchService(
            DispatchOrderRepository dispatchOrderRepository,
            InventoryItemRepository inventoryItemRepository,
            ProductRepository productRepository,
            SalesOrderRepository salesOrderRepository,
            com.visionx.sunflow.warranty.service.WarrantyAutomationService warrantyAutomationService
    ) {
        this.dispatchOrderRepository = dispatchOrderRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.productRepository = productRepository;
        this.salesOrderRepository = salesOrderRepository;
        this.warrantyAutomationService = warrantyAutomationService;
    }

    @Transactional
    public DispatchResponse createDispatchOrder(DispatchCreateRequest request) {
        SalesOrder order = salesOrderRepository.findById(request.orderId())
                .orElseThrow(() -> new ResourceNotFoundException("SalesOrder", request.orderId()));

        DispatchOrder dispatch = new DispatchOrder();
        dispatch.setDispatchNumber(generateDispatchNumber());
        dispatch.setOrderId(order.getId());
        dispatch.setDeliveryPerson(request.deliveryPerson());
        dispatch.setDeliveryPhone(request.deliveryPhone());
        dispatch.setStatus(DispatchOrderStatus.DRAFT);

        for (DispatchCreateRequest.DispatchItemEntry entry : request.items()) {
            Product product = productRepository.findById(entry.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", entry.productId()));
            DispatchItem item = new DispatchItem(product, entry.serialNumber());
            dispatch.addItem(item);
        }

        DispatchOrder saved = dispatchOrderRepository.save(dispatch);
        return DispatchResponse.fromEntity(saved);
    }

    /**
     * Acceptance Test 3 (Warehouse Control):
     * Attempt delivery with a missing serial number -> Delivery is BLOCKED!
     */
    @Transactional
    public DispatchResponse validateAndDispatch(String dispatchId) {
        DispatchOrder dispatch = dispatchOrderRepository.findById(dispatchId)
                .orElseThrow(() -> new ResourceNotFoundException("DispatchOrder", dispatchId));

        if (dispatch.getItems().isEmpty()) {
            throw new IllegalStateException("Dispatch order has no items to validate.");
        }

        Set<String> seenSerials = new HashSet<>();

        // Gate 1: Check every item for missing serial number
        for (DispatchItem item : dispatch.getItems()) {
            String sn = item.getSerialNumber();
            if (sn == null || sn.trim().isEmpty()) {
                throw new IllegalStateException(
                        "Warehouse Control Gate Violation: Delivery is BLOCKED. " +
                        "Missing serial number for item '" + item.getProduct().getName() + "'. Every unit must be scanned."
                );
            }
            final String cleanSn = sn.trim();

            // Negative Test: Reject duplicate serials in the same dispatch
            if (!seenSerials.add(cleanSn)) {
                throw new IllegalArgumentException("Duplicate serial number detected in dispatch: " + cleanSn);
            }

            // Gate 2: Validate serial exists in inventory
            InventoryItem inv = inventoryItemRepository.findBySerialNumber(cleanSn)
                    .orElseThrow(() -> new IllegalArgumentException("Invalid serial number '" + cleanSn + "': Not found in inventory catalog."));

            // Negative Test: Reject serial number belonging to a different product
            if (!inv.getProduct().getId().equals(item.getProduct().getId())) {
                throw new IllegalArgumentException(
                        "Barcode Mismatch: Serial number '" + cleanSn + "' belongs to product '" +
                        inv.getProduct().getName() + "', but was scanned for '" + item.getProduct().getName() + "'."
                );
            }

            // Negative Test: Prevent dispatch of unavailable inventory
            if (inv.getStatus() != InventoryStatus.AVAILABLE && inv.getStatus() != InventoryStatus.RESERVED) {
                throw new IllegalStateException(
                        "Inventory Unavailable: Item with serial '" + cleanSn + "' is currently " + inv.getStatus() + ". Cannot dispatch."
                );
            }

            // Transition inventory unit status
            inv.setStatus(InventoryStatus.DISPATCHED);
            inventoryItemRepository.save(inv);
        }

        dispatch.setStatus(DispatchOrderStatus.DISPATCHED);
        dispatch.setDispatchedAt(Instant.now());
        DispatchOrder saved = dispatchOrderRepository.save(dispatch);

        // Update Sales Order status
        salesOrderRepository.findById(dispatch.getOrderId()).ifPresent(order -> {
            order.setStatus(OrderStatus.DISPATCHED);
            salesOrderRepository.save(order);
        });

        // Acceptance Test 4: Automatically generate warranty records for all dispatched serials
        warrantyAutomationService.autoGenerateWarranties(saved);

        return DispatchResponse.fromEntity(saved);
    }

    @Transactional
    public DispatchResponse assignSerialNumber(String dispatchId, String itemId, String serialNumber) {
        DispatchOrder dispatch = dispatchOrderRepository.findById(dispatchId)
                .orElseThrow(() -> new ResourceNotFoundException("DispatchOrder", dispatchId));

        DispatchItem targetItem = dispatch.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("DispatchItem", itemId));

        targetItem.setSerialNumber(serialNumber);
        targetItem.setScannedAt(Instant.now());

        DispatchOrder saved = dispatchOrderRepository.save(dispatch);
        return DispatchResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public DispatchResponse getDispatchById(String id) {
        return dispatchOrderRepository.findById(id)
                .map(DispatchResponse::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("DispatchOrder", id));
    }

    @Transactional(readOnly = true)
    public List<DispatchResponse> getAllDispatches() {
        return dispatchOrderRepository.findAll().stream()
                .map(DispatchResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DispatchResponse> getDispatchesByOrder(String orderId) {
        return dispatchOrderRepository.findByOrderId(orderId).stream()
                .map(DispatchResponse::fromEntity)
                .toList();
    }

    private String generateDispatchNumber() {
        String period = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        long count = dispatchOrderRepository.count() + 1;
        return String.format("DSP-%s-%04d", period, count);
    }
}
