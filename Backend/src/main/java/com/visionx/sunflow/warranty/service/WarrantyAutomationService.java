package com.visionx.sunflow.warranty.service;

import com.visionx.sunflow.common.exception.ResourceNotFoundException;
import com.visionx.sunflow.inventory.entity.DispatchItem;
import com.visionx.sunflow.inventory.entity.DispatchOrder;
import com.visionx.sunflow.order.entity.SalesOrder;
import com.visionx.sunflow.order.repository.SalesOrderRepository;
import com.visionx.sunflow.quotation.entity.ProductCategory;
import com.visionx.sunflow.warranty.entity.Warranty;
import com.visionx.sunflow.warranty.entity.WarrantyStatus;
import com.visionx.sunflow.warranty.repository.WarrantyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * =============================================================================
 * SERVICE: WarrantyAutomationService
 * =============================================================================
 * Automated warranty certificate generation upon warehouse dispatch validation.
 * 
 * Hackathon Rules (Acceptance Test 4 & 5):
 * - Auto-generates unique warranty record for each applicable serial number.
 * - Rules:
 * - MODULE: 25 Years (300 months)
 * - INVERTER: 5 Years (60 months)
 * - BOS/STRUCTURE: 1 Year (12 months)
 */
@Service
public class WarrantyAutomationService {

    private final WarrantyRepository warrantyRepository;
    private final SalesOrderRepository salesOrderRepository;

    public record WarrantyCheckResult(
            boolean found,
            boolean covered,
            String serialNumber,
            String productName,
            LocalDate startDate,
            LocalDate endDate,
            String statusExplanation) {
    }

    public WarrantyAutomationService(WarrantyRepository warrantyRepository, SalesOrderRepository salesOrderRepository) {
        this.warrantyRepository = warrantyRepository;
        this.salesOrderRepository = salesOrderRepository;
    }

    /**
     * Acceptance Test 4:
     * Validate the delivery -> Auto-generate warranty records for applicable serial
     * numbers.
     */
    @Transactional
    public List<Warranty> autoGenerateWarranties(DispatchOrder dispatch) {
        SalesOrder order = salesOrderRepository.findById(dispatch.getOrderId()).orElse(null);
        String customerId = order != null ? order.getCustomerId() : null;
        LocalDate today = LocalDate.now();

        List<Warranty> generated = new ArrayList<>();

        for (DispatchItem item : dispatch.getItems()) {
            if (item.getSerialNumber() == null || item.getSerialNumber().trim().isEmpty()) {
                continue;
            }

            String sn = item.getSerialNumber().trim();

            // Avoid duplicate warranties for same serial
            if (warrantyRepository.findBySerialNumber(sn).isPresent()) {
                continue;
            }

            int termMonths = determineWarrantyTerm(item.getProduct().getCategory());

            Warranty w = new Warranty();
            w.setWarrantyNumber(generateWarrantyNumber());
            w.setSerialNumber(sn);
            w.setProduct(item.getProduct());
            w.setCustomerId(customerId);
            w.setOrderId(dispatch.getOrderId());
            w.setTermMonths(termMonths);
            w.setStartDate(today);
            w.setEndDate(today.plusMonths(termMonths));
            w.setStatus(WarrantyStatus.ACTIVE);

            generated.add(warrantyRepository.save(w));
        }

        return generated;
    }

    /**
     * Acceptance Test 5:
     * Adjudicate whether a reported fault is Covered (₹0) or Chargeable based on
     * date.
     */
    @Transactional(readOnly = true)
    public WarrantyCheckResult checkWarrantyAtDate(String serialNumber, LocalDate faultDate) {
        return warrantyRepository.findBySerialNumber(serialNumber)
                .map(w -> {
                    boolean covered = w.isCurrentlyCovered(faultDate);
                    String explanation = covered
                            ? "Active warranty — repair is 100% COVERED (₹0.00)"
                            : "Warranty EXPIRED on " + w.getEndDate() + " — repair is CHARGEABLE";
                    return new WarrantyCheckResult(
                            true,
                            covered,
                            w.getSerialNumber(),
                            w.getProduct().getName(),
                            w.getStartDate(),
                            w.getEndDate(),
                            explanation);
                })
                .orElse(new WarrantyCheckResult(
                        false,
                        false,
                        serialNumber,
                        "Unknown Hardware",
                        null,
                        null,
                        "No registered warranty found for serial " + serialNumber));
    }

    private int determineWarrantyTerm(ProductCategory category) {
        return switch (category) {
            case MODULE -> 300; // 25 Years
            case INVERTER -> 60; // 5 Years
            case BATTERY -> 60; // 5 Years
            default -> 12; // 1 Year
        };
    }

    private String generateWarrantyNumber() {
        String period = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        long count = warrantyRepository.count() + 1;
        return String.format("WR-%s-%04d", period, count);
    }

}
