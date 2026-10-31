package com.visionx.sunflow.inventory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.visionx.sunflow.customer.entity.Customer;
import com.visionx.sunflow.customer.repository.CustomerRepository;
import com.visionx.sunflow.inventory.dto.DispatchCreateRequest;
import com.visionx.sunflow.inventory.entity.*;
import com.visionx.sunflow.inventory.repository.DispatchOrderRepository;
import com.visionx.sunflow.inventory.repository.InventoryItemRepository;
import com.visionx.sunflow.order.entity.OrderStatus;
import com.visionx.sunflow.order.entity.SalesOrder;
import com.visionx.sunflow.order.repository.SalesOrderRepository;
import com.visionx.sunflow.quotation.entity.Product;
import com.visionx.sunflow.quotation.entity.ProductCategory;
import com.visionx.sunflow.quotation.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DispatchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DispatchOrderRepository dispatchOrderRepository;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SalesOrderRepository salesOrderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    private Product moduleProduct;
    private Product inverterProduct;
    private SalesOrder savedOrder;

    @BeforeEach
    void setUp() {
        dispatchOrderRepository.deleteAll();
        salesOrderRepository.deleteAll();
        inventoryItemRepository.deleteAll();

        // Load seeded products or create test products
        moduleProduct = productRepository.findBySku("MOD-540W-MONO")
                .orElseGet(() -> {
                    Product p = new Product();
                    p.setSku("MOD-540W-MONO");
                    p.setName("540W Tier-1 Mono PERC Solar Module");
                    p.setCategory(ProductCategory.MODULE);
                    p.setUnitPrice(new BigDecimal("9500.00"));
                    return productRepository.save(p);
                });

        inverterProduct = productRepository.findBySku("INV-3KW-GRID")
                .orElseGet(() -> {
                    Product p = new Product();
                    p.setSku("INV-3KW-GRID");
                    p.setName("3 kW High-Efficiency On-Grid Inverter");
                    p.setCategory(ProductCategory.INVERTER);
                    p.setUnitPrice(new BigDecimal("28000.00"));
                    return productRepository.save(p);
                });

        Customer customer = customerRepository.findAll().stream().findFirst().orElseGet(() -> {
            Customer c = new Customer();
            c.setName("Test Customer");
            c.setPhone("9876543210");
            c.setEmail("test@customer.com");
            return customerRepository.save(c);
        });

        SalesOrder order = new SalesOrder();
        order.setOrderNumber("SO-2024-TEST-01");
        order.setCustomerId(customer.getId().toString());
        order.setTotalAmount(new BigDecimal("150000.00"));
        order.setAdvanceRequired(new BigDecimal("30000.00"));
        order.setAdvancePaid(new BigDecimal("30000.00"));
        order.setOutstandingAmount(new BigDecimal("120000.00"));
        order.setStatus(OrderStatus.CONFIRMED);
        savedOrder = salesOrderRepository.save(order);
    }

    @Test
    @DisplayName("Acceptance Test 3: Warehouse Control — Attempt delivery with a missing serial number is BLOCKED")
    void warehouseControl_attemptDeliveryWithMissingSerialNumber_isBlocked() throws Exception {
        // Create dispatch order with null/empty serial numbers
        DispatchCreateRequest request = new DispatchCreateRequest(
                savedOrder.getId(),
                "Santosh Shinde",
                "9822334455",
                List.of(
                        new DispatchCreateRequest.DispatchItemEntry(moduleProduct.getId(), null),
                        new DispatchCreateRequest.DispatchItemEntry(inverterProduct.getId(), null)
                )
        );

        String createJson = mockMvc.perform(post("/api/v1/dispatches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("DRAFT")))
                .andReturn().getResponse().getContentAsString();

        String dispatchId = objectMapper.readTree(createJson).get("id").asText();

        // Attempt delivery validation without serial numbers -> Must be BLOCKED!
        mockMvc.perform(post("/api/v1/dispatches/" + dispatchId + "/validate"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Warehouse Control Gate Violation")));

        // DB state remains DRAFT
        DispatchOrder unchanged = dispatchOrderRepository.findById(dispatchId).orElseThrow();
        assertEquals(DispatchOrderStatus.DRAFT, unchanged.getStatus());
    }

    @Test
    @DisplayName("Warehouse Control: Validate delivery with correct scanned serial numbers succeeds")
    void warehouseControl_validateDeliveryWithScannedSerials_succeeds() throws Exception {
        // Seed valid inventory items
        InventoryItem modInv = inventoryItemRepository.save(new InventoryItem(moduleProduct, "MOD-SN-TEST-100", "Pune Depot"));
        InventoryItem invInv = inventoryItemRepository.save(new InventoryItem(inverterProduct, "INV-SN-TEST-200", "Pune Depot"));

        DispatchCreateRequest request = new DispatchCreateRequest(
                savedOrder.getId(),
                "Santosh Shinde",
                "9822334455",
                List.of(
                        new DispatchCreateRequest.DispatchItemEntry(moduleProduct.getId(), "MOD-SN-TEST-100"),
                        new DispatchCreateRequest.DispatchItemEntry(inverterProduct.getId(), "INV-SN-TEST-200")
                )
        );

        String createJson = mockMvc.perform(post("/api/v1/dispatches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String dispatchId = objectMapper.readTree(createJson).get("id").asText();

        // Validate and dispatch
        mockMvc.perform(post("/api/v1/dispatches/" + dispatchId + "/validate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("DISPATCHED")))
                .andExpect(jsonPath("$.dispatchedAt", notNullValue()));

        // Inventory status should be transitioned to DISPATCHED
        InventoryItem updatedMod = inventoryItemRepository.findById(modInv.getId()).orElseThrow();
        assertEquals(InventoryStatus.DISPATCHED, updatedMod.getStatus());
    }

    @Test
    @DisplayName("Negative Test: Reject serial number belonging to a different product")
    void negativeTest_rejectSerialBelongingToDifferentProduct() throws Exception {
        // Seed an Inverter serial
        inventoryItemRepository.save(new InventoryItem(inverterProduct, "INV-SN-CROSS-999", "Pune Depot"));

        // Try scanning the INVERTER serial number against a MODULE item
        DispatchCreateRequest request = new DispatchCreateRequest(
                savedOrder.getId(),
                "Santosh Shinde",
                "9822334455",
                List.of(
                        new DispatchCreateRequest.DispatchItemEntry(moduleProduct.getId(), "INV-SN-CROSS-999")
                )
        );

        String createJson = mockMvc.perform(post("/api/v1/dispatches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String dispatchId = objectMapper.readTree(createJson).get("id").asText();

        // Validate delivery -> Must be rejected due to product barcode mismatch
        mockMvc.perform(post("/api/v1/dispatches/" + dispatchId + "/validate"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Barcode Mismatch")));
    }
}
