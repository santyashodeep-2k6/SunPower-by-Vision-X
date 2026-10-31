package com.visionx.sunflow.survey;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.visionx.sunflow.lead.EnquiryChannel;
import com.visionx.sunflow.lead.Lead;
import com.visionx.sunflow.lead.LeadRepository;
import com.visionx.sunflow.lead.LeadStatus;
import com.visionx.sunflow.lead.PropertyType;
import com.visionx.sunflow.lead.SystemType;
import com.visionx.sunflow.survey.dto.SurveyAssessmentUpdateRequest;
import com.visionx.sunflow.survey.dto.SurveyCreateRequest;
import com.visionx.sunflow.survey.dto.SurveyStatusUpdateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SurveyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LeadRepository leadRepository;

    @Autowired
    private SurveyRepository surveyRepository;

    private Lead testLead;

    @BeforeEach
    void setUp() {
        surveyRepository.deleteAll();
        leadRepository.deleteAll();

        Lead lead = new Lead();
        lead.setFullName("Ramesh Chandra");
        lead.setPhone("9876543210");
        lead.setEmail("ramesh@example.com");
        lead.setAddress("401 Surya Towers, SG Highway");
        lead.setCity("Ahmedabad");
        lead.setPropertyType(PropertyType.RESIDENTIAL);
        lead.setRequestedCapacityKw(new BigDecimal("5.0"));
        lead.setSystemType(SystemType.ON_GRID);
        lead.setMonthlyBill(new BigDecimal("4500"));
        lead.setRoofAreaSqft(new BigDecimal("800"));
        lead.setChannel(EnquiryChannel.WEB_FORM);
        lead.setStatus(LeadStatus.QUALIFIED);
        testLead = leadRepository.save(lead);
    }

    private SurveyCreateRequest validCreateRequest() {
        return new SurveyCreateRequest(
                testLead.getId(),
                "Anand Verma",
                "9823456789",
                Instant.now().plus(2, ChronoUnit.DAYS),
                "401 Surya Towers, SG Highway, Ahmedabad",
                "Check 3-phase meter board and terrace accessibility."
        );
    }

    @Test
    void createSurvey_validRequest_returns201() throws Exception {
        SurveyCreateRequest request = validCreateRequest();

        mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.leadId", is(testLead.getId().toString())))
                .andExpect(jsonPath("$.customerName", is("Ramesh Chandra")))
                .andExpect(jsonPath("$.surveyorName", is("Anand Verma")))
                .andExpect(jsonPath("$.status", is("SCHEDULED")))
                .andExpect(jsonPath("$.siteAddress", is("401 Surya Towers, SG Highway, Ahmedabad")));
    }

    @Test
    void createSurvey_nonExistentLead_returns404() throws Exception {
        UUID randomId = UUID.randomUUID();
        SurveyCreateRequest request = new SurveyCreateRequest(
                randomId,
                "Anand Verma",
                "9823456789",
                Instant.now().plus(2, ChronoUnit.DAYS),
                "Ahmedabad",
                null
        );

        mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", notNullValue()));
    }

    @Test
    void createSurvey_missingRequiredFields_returns400() throws Exception {
        // Missing surveyorName and scheduledAt
        String invalidJson = "{\"leadId\":\"" + testLead.getId() + "\"}";

        mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors", notNullValue()));
    }

    @Test
    void getSurveys_paginationAndFilters_returnsPage() throws Exception {
        mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/surveys")
                        .param("status", "SCHEDULED")
                        .param("surveyor", "Anand")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].surveyorName", is("Anand Verma")));
    }

    @Test
    void getSurveyById_existingId_returnsSurvey() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isCreated())
                .andReturn();

        String id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/surveys/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(id)))
                .andExpect(jsonPath("$.customerName", is("Ramesh Chandra")));
    }

    @Test
    void updateAssessment_validAssessment_updatesFields() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isCreated())
                .andReturn();

        String id = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        SurveyAssessmentUpdateRequest assessment = new SurveyAssessmentUpdateRequest(
                RoofType.RCC_FLAT,
                new BigDecimal("750.00"),
                ShadingCondition.NO_SHADING,
                ElectricalConnection.THREE_PHASE,
                new BigDecimal("7.00"),
                new BigDecimal("6.00"),
                SurveyFeasibility.FEASIBLE,
                "South-facing terrace with minimal shading. Excellent solar exposure.",
                false
        );

        mockMvc.perform(put("/api/surveys/" + id + "/assessment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assessment)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roofType", is("RCC_FLAT")))
                .andExpect(jsonPath("$.usableRoofAreaSqft", is(750.0)))
                .andExpect(jsonPath("$.recommendedCapacityKw", is(6.0)))
                .andExpect(jsonPath("$.feasibility", is("FEASIBLE")))
                .andExpect(jsonPath("$.status", is("SCHEDULED")));
    }

    @Test
    void updateAssessment_negativeValues_returns400() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isCreated())
                .andReturn();

        String id = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        String invalidAssessmentJson = """
                {
                  "usableRoofAreaSqft": -50.0,
                  "recommendedCapacityKw": -5.0
                }
                """;

        mockMvc.perform(put("/api/surveys/" + id + "/assessment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidAssessmentJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors", notNullValue()));
    }

    @Test
    void statusTransitions_validAndInvalidTransitions() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isCreated())
                .andReturn();

        String id = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        // 1. Valid transition: SCHEDULED -> IN_PROGRESS
        mockMvc.perform(patch("/api/surveys/" + id + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SurveyStatusUpdateRequest(SurveyStatus.IN_PROGRESS))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")));

        // 2. Valid transition: IN_PROGRESS -> COMPLETED (should set completedAt)
        mockMvc.perform(patch("/api/surveys/" + id + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SurveyStatusUpdateRequest(SurveyStatus.COMPLETED))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.completedAt", notNullValue()));

        // 3. Invalid transition from terminal state COMPLETED -> SCHEDULED
        mockMvc.perform(patch("/api/surveys/" + id + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SurveyStatusUpdateRequest(SurveyStatus.SCHEDULED))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", notNullValue()));
    }

    @Test
    void getSurveysByLead_existingLead_returnsList() throws Exception {
        mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/leads/" + testLead.getId() + "/surveys"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].customerName", is("Ramesh Chandra")));
    }

    @Test
    void getSurveysByLead_nonExistentLead_returns404() throws Exception {
        UUID randomId = UUID.randomUUID();
        mockMvc.perform(get("/api/leads/" + randomId + "/surveys"))
                .andExpect(status().isNotFound());
    }
}
