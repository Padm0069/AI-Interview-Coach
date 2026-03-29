package com.interview.coach.exception;

import com.interview.coach.controller.InterviewController;
import com.interview.coach.model.QuestionRequest;
import com.interview.coach.service.GroqService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Tests for GlobalExceptionHandler — verifies that exceptions thrown
// anywhere in the app are converted to the correct HTTP status + JSON body.
//
// We still load InterviewController because @RestControllerAdvice only
// activates when a controller is present in the test context.
@WebMvcTest(InterviewController.class)
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GroqService groqService;

    // ══════════════════════════════════════════════════════════════════════
    // GroqException → 502 Bad Gateway
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("GroqException is mapped to 502 with JSON error body")
    void groqException_mappedTo502_withJsonBody() throws Exception {
        when(groqService.generateQuestions(anyString(), anyString()))
                .thenThrow(new GroqException("Groq API is unreachable."));

        QuestionRequest request = new QuestionRequest();
        request.setRole("Backend Engineer");
        request.setDifficulty("Mid-level");

        mockMvc.perform(post("/api/generate-questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadGateway())                         // 502
                .andExpect(jsonPath("$.status").value(502))
                .andExpect(jsonPath("$.error").value("Groq API Error"))
                .andExpect(jsonPath("$.message").value("Groq API is unreachable."))
                .andExpect(jsonPath("$.timestamp").exists()); // ISO-8601 timestamp present
    }

    // ══════════════════════════════════════════════════════════════════════
    // @Valid failure → 400 Bad Request with fieldErrors
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Blank role triggers 400 with fieldErrors in response body")
    void blankRole_triggers400_withFieldErrors() throws Exception {
        QuestionRequest request = new QuestionRequest();
        request.setRole("");           // @NotBlank fails
        request.setDifficulty("Mid-level");

        mockMvc.perform(post("/api/generate-questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())                         // 400
                .andExpect(jsonPath("$.error").value("Validation Failed"))
                .andExpect(jsonPath("$.fieldErrors.role").exists());        // specific field named
    }

    @Test
    @DisplayName("Blank difficulty triggers 400 with fieldErrors in response body")
    void blankDifficulty_triggers400_withFieldErrors() throws Exception {
        QuestionRequest request = new QuestionRequest();
        request.setRole("Backend Engineer");
        request.setDifficulty("");     // @NotBlank fails

        mockMvc.perform(post("/api/generate-questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.difficulty").exists());
    }

    // ══════════════════════════════════════════════════════════════════════
    // Generic exception → 500 Internal Server Error
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Unexpected RuntimeException is mapped to 500 without leaking details")
    void unexpectedException_mappedTo500_withSafeMessage() throws Exception {
        // Simulate an unexpected bug — NullPointerException, database error etc.
        // The client should get a vague 500, NOT the internal exception message.
        when(groqService.generateQuestions(anyString(), anyString()))
                .thenThrow(new RuntimeException("Internal DB connection pool exhausted at node xyz123"));

        QuestionRequest request = new QuestionRequest();
        request.setRole("Backend Engineer");
        request.setDifficulty("Mid-level");

        mockMvc.perform(post("/api/generate-questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())                // 500
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                // The internal exception message should NOT appear in the response
                .andExpect(jsonPath("$.message").value("An unexpected error occurred. Please try again."));
    }
}
