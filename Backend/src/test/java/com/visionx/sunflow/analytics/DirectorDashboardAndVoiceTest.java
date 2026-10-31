package com.visionx.sunflow.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.visionx.sunflow.customer.entity.Customer;
import com.visionx.sunflow.customer.repository.CustomerRepository;
import com.visionx.sunflow.order.entity.OrderStatus;
import com.visionx.sunflow.order.entity.SalesOrder;
import com.visionx.sunflow.order.repository.SalesOrderRepository;
import com.visionx.sunflow.service.entity.ServiceTicket;
import com.visionx.sunflow.service.repository.ServiceTicketRepository;
import com.visionx.sunflow.voice.dto.VoiceWebhookPayload;
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
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DirectorDashboardAndVoiceTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SalesOrderRepository salesOrderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ServiceTicketRepository serviceTicketRepository;

    @BeforeEach
    void setUp() {
        salesOrderRepository.deleteAll();
        serviceTicketRepository.deleteAll();

        Customer customer = customerRepository.findAll().stream().findFirst().orElseGet(() -> {
            Customer c = new Customer();
            c.setName("Director Test Customer");
            c.setPhone("9811224466");
            c.setEmail("director@test.com");
            return customerRepository.save(c);
        });

        // Seed 2 orders: ₹200,000 + ₹300,000 = ₹500,000 Revenue
        SalesOrder o1 = new SalesOrder();
        o1.setOrderNumber("SO-DIR-01");
        o1.setCustomerId(customer.getId().toString());
        o1.setTotalAmount(new BigDecimal("200000.00"));
        o1.setAdvanceRequired(new BigDecimal("40000.00"));
        o1.setAdvancePaid(new BigDecimal("40000.00"));
        o1.setOutstandingAmount(new BigDecimal("160000.00"));
        o1.setStatus(OrderStatus.CONFIRMED);
        salesOrderRepository.save(o1);

        SalesOrder o2 = new SalesOrder();
        o2.setOrderNumber("SO-DIR-02");
        o2.setCustomerId(customer.getId().toString());
        o2.setTotalAmount(new BigDecimal("300000.00"));
        o2.setAdvanceRequired(new BigDecimal("60000.00"));
        o2.setAdvancePaid(new BigDecimal("60000.00"));
        o2.setOutstandingAmount(new BigDecimal("240000.00"));
        o2.setStatus(OrderStatus.CONFIRMED);
        salesOrderRepository.save(o2);

        // Seed 1 open service ticket
        ServiceTicket t = new ServiceTicket();
        t.setTicketNumber("TCK-DIR-01");
        t.setCustomerId(customer.getId().toString());
        t.setSerialNumber("INV-TEST-SN-01");
        t.setIssueDescription("Display dimming");
        t.setStatus("OPEN");
        serviceTicketRepository.save(t);
    }

    @Test
    @DisplayName("Acceptance Test 6: Profitability Dashboard — Director dashboard shows revenue, direct costs, margin % and ticket counts")
    void directorDashboard_showsRevenueCostsAndPendingTickets() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/dashboard"))
                .andExpect(status().isOk())
                // Revenue: 200,000 + 300,000 = 500,000.00
                .andExpect(jsonPath("$.totalRevenue", is(500000.0)))
                // Hardware Cost: 68% of 500k = 340,000.00
                .andExpect(jsonPath("$.directHardwareCost", is(340000.0)))
                // Labor Cost: 12% of 500k = 60,000.00
                .andExpect(jsonPath("$.directLaborCost", is(60000.0)))
                // Total Direct Cost: 340k + 60k = 400,000.00
                .andExpect(jsonPath("$.totalDirectCost", is(400000.0)))
                // Gross Profit: 500k - 400k = 100,000.00
                .andExpect(jsonPath("$.grossProfit", is(100000.0)))
                // Margin %: (100k / 500k) * 100 = 20.0%
                .andExpect(jsonPath("$.grossMarginPercentage", is(20.0)))
                // Active orders: 2
                .andExpect(jsonPath("$.activeOrders", is(2)))
                // Open service tickets: 1
                .andExpect(jsonPath("$.openServiceTickets", is(1)));
    }

    @Test
    @DisplayName("AI Voice Integration: Get ephemeral WebRTC session token for ElevenLabs voice call")
    void voiceIntegration_getVoiceToken_returnsActiveSessionToken() throws Exception {
        mockMvc.perform(get("/api/v1/voice/token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", startsWith("session_")))
                .andExpect(jsonPath("$.agentId", notNullValue()))
                .andExpect(jsonPath("$.expiresAt", notNullValue()));
    }

    @Test
    @DisplayName("AI Voice Integration: Post-call webhook automatically ingests transcript and creates CRM lead")
    void voiceIntegration_webhook_createsCrmLead() throws Exception {
        VoiceWebhookPayload payload = new VoiceWebhookPayload(
                "conv_voice_test_123",
                "Sunita Deshpande",
                "9823001122",
                "Pune",
                4500.0,
                4.0,
                "Customer has 650 sq ft roof in Kothrud Pune with ₹4,500 monthly bill; interested in 4 kW on-grid solar.",
                "AI: Hello, welcome to SunFlow 360... Customer: Yes, I want solar for my home in Pune...",
                Map.of("roofType", "RCC Flat", "phase", "3-phase")
        );

        mockMvc.perform(post("/api/v1/voice/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUCCESS")))
                .andExpect(jsonPath("$.leadId", notNullValue()));
    }
}

