package com.visionx.sunflow.quotation.service;

import com.visionx.sunflow.quotation.entity.Product;
import com.visionx.sunflow.quotation.entity.ProductCategory;
import com.visionx.sunflow.quotation.entity.QuotationItem;
import com.visionx.sunflow.quotation.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * =============================================================================
 * ENGINE: BOMCalculationEngine
 * =============================================================================
 * Automated Solar Bill of Materials (BOM) & Subsidy calculation engine.
 * 
 * Hackathon Highlights (Acceptance Test 2):
 * - Selecting "3 kW On-Grid" automatically derives:
 *   1. Six 540W Mono PERC Tier-1 PV modules (3,240 Wp).
 *   2. Matching 3 kW On-Grid Inverter.
 *   3. HDG Elevated Mounting Structure (3 kW set).
 *   4. 45 meters of 4 sq mm UV-resistant DC cabling.
 *   5. ACDB Box & Chemical Earthing Kit.
 * - Computes composite 13.8% Indian Solar GST.
 * - Computes official Central PM Surya Ghar subsidy (₹78,000 for 3 kW residential).
 */
@Service
public class BOMCalculationEngine {

    private final ProductRepository productRepository;
    private static final BigDecimal COMPOSITE_GST_RATE = new BigDecimal("13.80");

    public record CalculationResult(
            List<QuotationItem> items,
            BigDecimal baseAmount,
            BigDecimal gstRate,
            BigDecimal gstAmount,
            BigDecimal grossAmount,
            BigDecimal subsidyAmount,
            BigDecimal netPayable
    ) {}

    public BOMCalculationEngine(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public CalculationResult calculateBOM(BigDecimal capacityKw, String propertyType) {
        List<QuotationItem> items = new ArrayList<>();
        double kw = capacityKw.doubleValue();

        // 1. PV Modules Calculation (540W Mono PERC)
        int moduleCount = (int) Math.ceil((kw * 1000.0) / 540.0);
        Product module = productRepository.findBySku("MOD-540W-MONO")
                .orElseGet(() -> createFallbackProduct("MOD-540W-MONO", "540W Tier-1 Mono PERC Solar Module", ProductCategory.MODULE, 540, new BigDecimal("9500.00")));
        items.add(new QuotationItem(module.getId(), module.getName(), ProductCategory.MODULE, BigDecimal.valueOf(moduleCount), module.getUnitPrice()));

        // 2. Solar Inverter Matching
        String inverterSku = kw <= 3.5 ? "INV-3KW-GRID" : (kw <= 6.0 ? "INV-5KW-GRID" : "INV-10KW-GRID");
        Product inverter = productRepository.findBySku(inverterSku)
                .orElseGet(() -> createFallbackProduct(inverterSku, kw + " kW Solar Inverter", ProductCategory.INVERTER, (int)(kw * 1000), new BigDecimal("28000.00")));
        items.add(new QuotationItem(inverter.getId(), inverter.getName(), ProductCategory.INVERTER, BigDecimal.ONE, inverter.getUnitPrice()));

        // 3. Mounting Structure
        Product structure = productRepository.findBySku("STR-GI-ELEVATED")
                .orElseGet(() -> createFallbackProduct("STR-GI-ELEVATED", "Pre-Galvanized Elevated Roof Mounting Structure", ProductCategory.STRUCTURE, null, new BigDecimal("1800.00")));
        items.add(new QuotationItem(structure.getId(), structure.getName(), ProductCategory.STRUCTURE, capacityKw, structure.getUnitPrice()));

        // 4. DC Cabling (15m per kW)
        int cableMeters = (int) Math.max(30, kw * 15);
        Product cable = productRepository.findBySku("BOS-DC-CABLE-4MM")
                .orElseGet(() -> createFallbackProduct("BOS-DC-CABLE-4MM", "4 sq mm UV-Resistant Dual-Core DC Solar Cable", ProductCategory.BOS, null, new BigDecimal("65.00")));
        items.add(new QuotationItem(cable.getId(), cable.getName(), ProductCategory.BOS, BigDecimal.valueOf(cableMeters), cable.getUnitPrice()));

        // 5. ACDB Box
        Product acdb = productRepository.findBySku("BOS-ACDB-40A")
                .orElseGet(() -> createFallbackProduct("BOS-ACDB-40A", "AC Distribution Box (ACDB) with SPD & MCB 40A", ProductCategory.BOS, null, new BigDecimal("4200.00")));
        items.add(new QuotationItem(acdb.getId(), acdb.getName(), ProductCategory.BOS, BigDecimal.ONE, acdb.getUnitPrice()));

        // 6. Earthing Kit
        Product earthKit = productRepository.findBySku("BOS-EARTH-KIT")
                .orElseGet(() -> createFallbackProduct("BOS-EARTH-KIT", "Chemical Grounding & Earthing Electrodes Kit", ProductCategory.BOS, null, new BigDecimal("3500.00")));
        items.add(new QuotationItem(earthKit.getId(), earthKit.getName(), ProductCategory.BOS, BigDecimal.ONE, earthKit.getUnitPrice()));

        // Financial Computations
        BigDecimal baseAmount = items.stream()
                .map(QuotationItem::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal gstAmount = baseAmount.multiply(COMPOSITE_GST_RATE)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        BigDecimal grossAmount = baseAmount.add(gstAmount).setScale(2, RoundingMode.HALF_UP);

        // PM Surya Ghar Muft Bijli Yojana Subsidy Calculation
        BigDecimal subsidy = calculatePMSuryaGharSubsidy(kw, propertyType);

        BigDecimal netPayable = grossAmount.subtract(subsidy).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        return new CalculationResult(
                items,
                baseAmount,
                COMPOSITE_GST_RATE,
                gstAmount,
                grossAmount,
                subsidy,
                netPayable
        );
    }

    /**
     * Central Government PM Surya Ghar Subsidy Scale:
     * - 1 kW: ₹30,000
     * - 2 kW: ₹60,000
     * - 3 kW or higher: ₹78,000 (Capped at 3 kW)
     * - Commercial/Industrial: ₹0.00
     */
    public BigDecimal calculatePMSuryaGharSubsidy(double capacityKw, String propertyType) {
        if (propertyType != null && !propertyType.equalsIgnoreCase("RESIDENTIAL")) {
            return BigDecimal.ZERO;
        }

        if (capacityKw < 1.0) {
            return BigDecimal.ZERO;
        } else if (capacityKw < 2.0) {
            return new BigDecimal("30000.00");
        } else if (capacityKw < 3.0) {
            return new BigDecimal("60000.00");
        } else {
            return new BigDecimal("78000.00");
        }
    }

    private Product createFallbackProduct(String sku, String name, ProductCategory cat, Integer wattage, BigDecimal price) {
        Product p = new Product();
        p.setSku(sku);
        p.setName(name);
        p.setCategory(cat);
        p.setWattage(wattage);
        p.setUnitPrice(price);
        return p;
    }
}

