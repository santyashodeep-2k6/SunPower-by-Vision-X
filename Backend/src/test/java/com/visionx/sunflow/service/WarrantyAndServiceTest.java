package com.visionx.sunflow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.visionx.sunflow.customer.entity.Customer;
import com.visionx.sunflow.customer.repository.CustomerRepository;
import com.visionx.sunflow.installation.service.InstallationService;
import com.visionx.sunflow.inventory.dto.DispatchCreateRequest;
import com.visionx.sunflow.inventory.entity.InventoryItem;
import com.visionx.sunflow.inventory.repository.InventoryItemRepository;
import com.visionx.sunflow.inventory.service.DispatchService;
import com.visionx.sunflow.order.entity.OrderStatus;
import com.visionx.sunflow.order.entity.SalesOrder;
import com.visionx.sunflow.order.repository.SalesOrderRepository;
import com.visionx.sunflow.quotation.entity.Product;
import com.visionx.sunflow.quotation.entity.ProductCategory;
import com.visionx.sunflow.quotation.repository.ProductRepository;
import com.visionx.sunflow.service.dto.TicketCreateRequest;
import com.visionx.sunflow.service.entity.ServiceTicket;
import com.visionx.sunflow.service.repository.ServiceTicketRepository;
import com.visionx.sunflow.warranty.entity.Warranty;
import com.visionx.sunflow.warranty.repository.WarrantyRepository;
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
import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WarrantyAndServiceTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private WarrantyRepository warrantyRepository;

    @Autowired
    private ServiceTicketRepository serviceTicketRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private SalesOrderRepository salesOrderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DispatchService dispatchService;

    @Autowired
    private InstallationService installationService;

    private Product testInverter;
    private Product testModule;
    private Customer testCustomer;
    private SalesOrder testOrder;

    @BeforeEach
    void setUp() {
        serviceTicketRepository.deleteAll();
        warrantyRepository.deleteAll();
        salesOrderRepository.deleteAll();
        inventoryItemRepository.deleteAll();

        testInverter = productRepository.findBySku("INV-3KW-GRID")
                .orElseGet(() -> {
                    Product p = new Product();
                    p.setSku("INV-3KW-GRID");
                    p.setName("3 kW High-Efficiency On-Grid Inverter");
                    p.setCategory(ProductCategory.INVERTER);
                    p.setUnitPrice(new BigDecimal("28000.00"));
                    return productRepository.save(p);
                });

        testModule = productRepository.findBySku("MOD-540W-MONO")
                .orElseGet(() -> {
                    Product p = new Product();
                    p.setSku("MOD-540W-MONO");
                    p.setName("540W Tier-1 Mono PERC Solar Module");
                    p.setCategory(ProductCategory.MODULE);
                    p.setUnitPrice(new BigDecimal("9500.00"));
                    return productRepository.save(p);
                });

        testCustomer = customerRepository.findAll().stream().findFirst().orElseGet(() -> {
            Customer c = new Customer();
            c.setName("Vikram Malhotra");
            c.setPhone("9811223344");
            c.setEmail("vikram@test.com");
            return customerRepository.save(c);
        });

        SalesOrder order = new SalesOrder();
        order.setOrderNumber("SO-WARRANTY-TEST-01");
        order.setCustomerId(testCustomer.getId().toString());
        order.setTotalAmount(new BigDecimal("120000.00"));
        order.setAdvanceRequired(new BigDecimal("24000.00"));
        order.setAdvancePaid(new BigDecimal("24000.00"));
        order.setOutstandingAmount(new BigDecimal("96000.00"));
        order.setStatus(OrderStatus.CONFIRMED);
        testOrder = salesOrderRepository.save(order);
    }

    @Test
    @DisplayName("Acceptance Test 4: Warranty Automation — Validating delivery auto-generates warranty records")
    void warrantyAutomation_validateDelivery_autoGeneratesWarrantyRecords() {
        // Prepare inventory items
        inventoryItemRepository.save(new InventoryItem(testInverter, "INV-AUTOWARRANTY-01", "Pune Depot"));
        inventoryItemRepository.save(new InventoryItem(testModule, "MOD-AUTOWARRANTY-01", "Pune Depot"));

        // Create dispatch order
        var dispatch = dispatchService.createDispatchOrder(new DispatchCreateRequest(
                testOrder.getId(),
                "Santosh Driver",
                "9822114433",
                List.of(
                        new DispatchCreateRequest.DispatchItemEntry(testInverter.getId(), "INV-AUTOWARRANTY-01"),
                        new DispatchCreateRequest.DispatchItemEntry(testModule.getId(), "MOD-AUTOWARRANTY-01")
                )
        ));

        // Validate & dispatch
        dispatchService.validateAndDispatch(dispatch.id());

        // Verify Acceptance Test 4: Warranties auto-generated!
        Warranty invWarranty = warrantyRepository.findBySerialNumber("INV-AUTOWARRANTY-01").orElseThrow();
        assertEquals(60, invWarranty.getTermMonths()); // Inverter 5 Years (60 months)
        assertEquals(LocalDate.now(), invWarranty.getStartDate());
        assertEquals(LocalDate.now().plusMonths(60), invWarranty.getEndDate());

        Warranty modWarranty = warrantyRepository.findBySerialNumber("MOD-AUTOWARRANTY-01").orElseThrow();
        assertEquals(300, modWarranty.getTermMonths()); // Module 25 Years (300 months)
    }

    @Test
    @DisplayName("Acceptance Test 5: Installation and Repair — Report fault 18 months later -> Under warranty (Covered ₹0.00)")
    void serviceAdjudication_faultReported18MonthsLater_underWarrantyCoveredZero() throws Exception {
        // Register warranty starting 18 months ago
        LocalDate startDate = LocalDate.now().minusMonths(18);
        Warranty w = new Warranty();
        w.setWarrantyNumber("WR-2023-TEST-01");
        w.setSerialNumber("INV-ACTIVE-WARRANTY-18M");
        w.setProduct(testInverter);
        w.setCustomerId(testCustomer.getId().toString());
        w.setOrderId(testOrder.getId());
        w.setTermMonths(60); // 5-year warranty
        w.setStartDate(startDate);
        w.setEndDate(startDate.plusMonths(60)); // Valid for 42 more months
        warrantyRepository.save(w);

        // Report fault today (18 months into warranty)
        TicketCreateRequest request = new TicketCreateRequest(
                testCustomer.getId().toString(),
                "INV-ACTIVE-WARRANTY-18M",
                "Inverter red fault LED blinking; error code E-04",
                LocalDate.now()
        );

        mockMvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.warrantyCovered", is(true)))
                .andExpect(jsonPath("$.chargeableAmount", is(0)))
                .andExpect(jsonPath("$.customerConfirmed", is(true)))
                .andExpect(jsonPath("$.status", is("OPEN")));
    }

    @Test
    @DisplayName("Acceptance Test 5: Expired Warranty — Report fault 6 years later -> Expired (Chargeable ₹3,500.00)")
    void serviceAdjudication_faultReported6YearsLater_warrantyExpiredChargeable() throws Exception {
        // Register warranty starting 6 years ago
        LocalDate startDate = LocalDate.now().minusYears(6);
        Warranty w = new Warranty();
        w.setWarrantyNumber("WR-2018-TEST-02");
        w.setSerialNumber("INV-EXPIRED-WARRANTY-6Y");
        w.setProduct(testInverter);
        w.setCustomerId(testCustomer.getId().toString());
        w.setOrderId(testOrder.getId());
        w.setTermMonths(60); // 5-year warranty
        w.setStartDate(startDate);
        w.setEndDate(startDate.plusYears(5)); // Expired 1 year ago!
        warrantyRepository.save(w);

        TicketCreateRequest request = new TicketCreateRequest(
                testCustomer.getId().toString(),
                "INV-EXPIRED-WARRANTY-6Y",
                "Internal display not turning on",
                LocalDate.now()
        );

        mockMvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.warrantyCovered", is(false)))
                .andExpect(jsonPath("$.chargeableAmount", is(3500.0)))
                .andExpect(jsonPath("$.customerConfirmed", is(false)))
                .andExpect(jsonPath("$.status", is("PENDING_CUSTOMER_APPROVAL")));
    }

    @Test
    @DisplayName("Negative Test: Do not close a repair ticket before required customer confirmation")
    void negativeTest_doNotCloseTicketBeforeCustomerConfirmation() throws Exception {
        // Create an unconfirmed chargeable ticket
        ServiceTicket ticket = new ServiceTicket();
        ticket.setTicketNumber("TCK-UNCONFIRMED-01");
        ticket.setCustomerId(testCustomer.getId().toString());
        ticket.setSerialNumber("INV-EXPIRED-999");
        ticket.setIssueDescription("Faulty capacitor");
        ticket.setWarrantyCovered(false); // Chargeable
        ticket.setChargeableAmount(new BigDecimal("3500.00"));
        ticket.setCustomerConfirmed(false); // Customer hasn't confirmed paid repair!
        ticket.setStatus("PENDING_CUSTOMER_APPROVAL");
        ServiceTicket saved = serviceTicketRepository.save(ticket);

        // Attempt closing ticket without confirmation -> Must be BLOCKED!
        mockMvc.perform(post("/api/v1/tickets/" + saved.getId() + "/close"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Negative Test Violation")));
    }

    @Test
    @DisplayName("Negative Test: Prevent the same crew from being double-booked on the same date")
    void negativeTest_preventCrewDoubleBooking() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        String crew = "Alpha Installation Team";

        // Schedule first job
        installationService.scheduleJob(testOrder.getId(), crew, tomorrow);

        // Attempt scheduling the SAME crew on the SAME date -> Must throw exception
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                installationService.scheduleJob(testOrder.getId(), crew, tomorrow)
        );
        assertTrue(ex.getMessage().contains("Double-Booking Violation"));
    }
}
