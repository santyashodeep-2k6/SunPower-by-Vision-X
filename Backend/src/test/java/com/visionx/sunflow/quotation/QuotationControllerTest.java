package com.visionx.sunflow.quotation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.visionx.sunflow.lead.Lead;
import com.visionx.sunflow.lead.LeadRepository;
import com.visionx.sunflow.lead.LeadStatus;
import com.visionx.sunflow.lead.PropertyType;
import com.visionx.sunflow.quotation.dto.QuotationCreateRequest;
import com.visionx.sunflow.quotation.entity.Quotation;
import com.visionx.sunflow.quotation.entity.QuotationStatus;
import com.visionx.sunflow.quotation.repository.QuotationRepository;
import com.visionx.sunflow.survey.Survey;
import com.visionx.sunflow.survey.SurveyRepository;
import com.visionx.sunflow.survey.SurveyStatus;
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
import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class QuotationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private SurveyRepository surveyRepository;

    @Autowired
    private LeadRepository leadRepository;

    private Lead savedLead;
    private Survey pendingSurvey;
    private Survey approvedSurvey;

    @BeforeEach
    void setUp() {
        quotationRepository.deleteAll();
        surveyRepository.deleteAll();
        leadRepository.deleteAll();

        Lead lead = new Lead();
        lead.setFullName("Rohan Kulkarni");
        lead.setPhone("9823456789");
        lead.setEmail("rohan@example.com");
        lead.setCity("Pune");
        lead.setPropertyType(PropertyType.RESIDENTIAL);
        lead.setStatus(LeadStatus.QUALIFIED);
        savedLead = leadRepository.save(lead);

        // Pending Survey
        Survey s1 = new Survey();
        s1.setLead(savedLead);
        s1.setSurveyorName("Vikram Joshi");
        s1.setScheduledAt(Instant.now());
        s1.setSiteAddress("12 FC Road, Pune");
        s1.setSanctionedLoadKw(new BigDecimal("5.00"));
        s1.setStatus(SurveyStatus.SCHEDULED); // Not approved
        pendingSurvey = surveyRepository.save(s1);

        // Approved Survey
        Survey s2 = new Survey();
        s2.setLead(savedLead);
        s2.setSurveyorName("Vikram Joshi");
        s2.setScheduledAt(Instant.now());
        s2.setSiteAddress("12 FC Road, Pune");
        s2.setSanctionedLoadKw(new BigDecimal("5.00"));
        s2.setStatus(SurveyStatus.APPROVED);
        s2.setCompletedAt(Instant.now());
        approvedSurvey = surveyRepository.save(s2);
    }

    @Test
    @DisplayName("Acceptance Test 2: Package Automation — Select 3 kW on-grid automatically loads correct kit components")
    void packageAutomation_select3kwOnGrid_loadsCorrectBOMComponents() throws Exception {
        QuotationCreateRequest request = new QuotationCreateRequest(
                savedLead.getId().toString(),
                null,
                approvedSurvey.getId().toString(),
                new BigDecimal("3.0"),
                "ON_GRID",
                "RESIDENTIAL",
                "Standard 3 kW residential setup"
        );

        mockMvc.perform(post("/api/v1/quotations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.capacityKw", is(3.0)))
                .andExpect(jsonPath("$.status", is("DRAFT")))
                // 3 kW Residential gets PM Surya Ghar maximum subsidy of ₹78,000
                .andExpect(jsonPath("$.subsidyAmount", is(78000.0)))
                // Verify BOM line items loaded automatically
                .andExpect(jsonPath("$.items", hasSize(greaterThanOrEqualTo(5))))
                // Module count for 3 kW: ceil((3.0 * 1000) / 540) = 6 panels
                .andExpect(jsonPath("$.items[?(@.category == 'MODULE')].quantity", hasItem(6)))
                // Inverter for 3 kW: 3kW Inverter
                .andExpect(jsonPath("$.items[?(@.category == 'INVERTER')].quantity", hasItem(1)))
                // Net payable must be gross amount minus 78,000
                .andExpect(jsonPath("$.netPayable", notNullValue()));
    }

    @Test
    @DisplayName("Acceptance Test 1: Survey Gate — Sending quote before survey approval is BLOCKED by the system")
    void surveyGate_sendQuoteBeforeSurveyApproval_systemBlocksIt() throws Exception {
        // Create a quotation linked to the PENDING survey
        QuotationCreateRequest request = new QuotationCreateRequest(
                savedLead.getId().toString(),
                null,
                pendingSurvey.getId().toString(),
                new BigDecimal("3.0"),
                "ON_GRID",
                "RESIDENTIAL",
                "Premature quote attempt"
        );

        String createJson = mockMvc.perform(post("/api/v1/quotations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String quoteId = objectMapper.readTree(createJson).get("id").asText();

        // Attempt to send quote when survey is still SCHEDULED (not APPROVED)
        mockMvc.perform(post("/api/v1/quotations/" + quoteId + "/send"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Survey Gate Violation")));

        // Verify quotation status in DB did NOT change to SENT
        Quotation unchanged = quotationRepository.findById(quoteId).orElseThrow();
        assertEquals(QuotationStatus.DRAFT, unchanged.getStatus());
    }

    @Test
    @DisplayName("Survey Gate: Sending quote AFTER survey approval succeeds")
    void surveyGate_sendQuoteAfterSurveyApproval_succeeds() throws Exception {
        // Create a quotation linked to the APPROVED survey
        QuotationCreateRequest request = new QuotationCreateRequest(
                savedLead.getId().toString(),
                null,
                approvedSurvey.getId().toString(),
                new BigDecimal("5.0"),
                "ON_GRID",
                "RESIDENTIAL",
                "Approved quote"
        );

        String createJson = mockMvc.perform(post("/api/v1/quotations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String quoteId = objectMapper.readTree(createJson).get("id").asText();

        // Dispatch quote
        mockMvc.perform(post("/api/v1/quotations/" + quoteId + "/send"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SENT")))
                .andExpect(jsonPath("$.sentAt", notNullValue()));

        Quotation sent = quotationRepository.findById(quoteId).orElseThrow();
        assertEquals(QuotationStatus.SENT, sent.getStatus());
        assertNotNull(sent.getSentAt());
    }
}
