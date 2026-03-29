package com.interview.coach.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.interview.coach.exception.GroqException;
import com.interview.coach.model.*;
import com.interview.coach.service.GroqService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// @WebMvcTest loads ONLY the web layer — controller, filters, CORS config.
// No real Spring context, no database, no actual service calls.
// Much faster than @SpringBootTest which loads everything.
//
// @MockBean replaces GroqService with a Mockito mock in the Spring context.
// The controller gets this mock injected instead of the real service.
@WebMvcTest(InterviewController.class)
class InterviewControllerTest {

    // MockMvc simulates HTTP requests without starting a real server.
    // You can test request/response without curl or Postman.
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // @MockBean registers a mock in the Spring context — different from
    // @Mock (Mockito only). Use @MockBean when the test needs Spring to
    // inject the mock into the controller automatically.
    @MockBean
    private GroqService groqService;

    // ══════════════════════════════════════════════════════════════════════
    // POST /api/generate-questions
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("POST /api/generate-questions returns 200 with questions list")
    void generateQuestions_returns200_withQuestionsList() throws Exception {
        // ARRANGE
        List<String> mockQuestions = List.of("Q1?", "Q2?", "Q3?", "Q4?", "Q5?");
        when(groqService.generateQuestions("Backend Engineer", "Mid-level"))
                .thenReturn(mockQuestions);

        QuestionRequest request = new QuestionRequest();
        request.setRole("Backend Engineer");
        request.setDifficulty("Mid-level");

        // ACT + ASSERT
        mockMvc.perform(post("/api/generate-questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                // HTTP 200
                .andExpect(status().isOk())
                // Response body has "questions" array
                .andExpect(jsonPath("$.questions").isArray())
                .andExpect(jsonPath("$.questions.length()").value(5))
                .andExpect(jsonPath("$.questions[0]").value("Q1?"));
    }

    @Test
    @DisplayName("POST /api/generate-questions returns 400 when role is blank")
    void generateQuestions_returns400_whenRoleIsBlank() throws Exception {
        // @NotBlank on QuestionRequest.role should trigger validation failure.
        // GlobalExceptionHandler converts it to 400.
        QuestionRequest request = new QuestionRequest();
        request.setRole("");           // blank — should fail @NotBlank
        request.setDifficulty("Mid-level");

        mockMvc.perform(post("/api/generate-questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/generate-questions returns 400 when difficulty is blank")
    void generateQuestions_returns400_whenDifficultyIsBlank() throws Exception {
        QuestionRequest request = new QuestionRequest();
        request.setRole("Backend Engineer");
        request.setDifficulty("");     // blank — should fail @NotBlank

        mockMvc.perform(post("/api/generate-questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/generate-questions returns 502 when GroqService throws")
    void generateQuestions_returns502_whenGroqServiceThrows() throws Exception {
        when(groqService.generateQuestions(anyString(), anyString()))
                .thenThrow(new GroqException("Groq rate limit hit."));

        QuestionRequest request = new QuestionRequest();
        request.setRole("Backend Engineer");
        request.setDifficulty("Mid-level");

        mockMvc.perform(post("/api/generate-questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                // GlobalExceptionHandler maps GroqException → 502
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.error").value("Groq API Error"));
    }

    // ══════════════════════════════════════════════════════════════════════
    // POST /api/evaluate-answer
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("POST /api/evaluate-answer returns 200 with scorecard")
    void evaluateAnswer_returns200_withScorecard() throws Exception {
        AnswerEvaluationResponse mockResponse =
                new AnswerEvaluationResponse(1, 80, "Good", "Clear and structured answer.");

        when(groqService.evaluateAnswer(anyString(), anyString(), eq(1)))
                .thenReturn(mockResponse);

        AnswerEvaluationRequest request = new AnswerEvaluationRequest();
        request.setAnswer("My answer here");
        request.setQuestion("Tell me about yourself");
        request.setQuestionIdx(1);

        mockMvc.perform(post("/api/evaluate-answer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(80))
                .andExpect(jsonPath("$.label").value("Good"))
                .andExpect(jsonPath("$.questionIdx").value(1));
    }

    @Test
    @DisplayName("POST /api/evaluate-answer returns 400 when answer is blank")
    void evaluateAnswer_returns400_whenAnswerIsBlank() throws Exception {
        AnswerEvaluationRequest request = new AnswerEvaluationRequest();
        request.setAnswer("");                  // blank — @NotBlank fails
        request.setQuestion("Tell me about yourself");
        request.setQuestionIdx(0);

        mockMvc.perform(post("/api/evaluate-answer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ══════════════════════════════════════════════════════════════════════
    // POST /api/upload
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("POST /api/upload returns 200 with full evaluation")
    void evaluateInterview_returns200_withFullEvaluation() throws Exception {
        ScoreBreakdown breakdown = new ScoreBreakdown(80, 75, 78);
        EvaluationResponse mockResponse = new EvaluationResponse(
                77, breakdown,
                List.of("Good communication"),
                List.of("Add more detail"),
                List.of("Use STAR method"),
                "Hire"
        );

        when(groqService.evaluateInterview(anyString(), anyString(), eq(false)))
                .thenReturn(mockResponse);

        EvaluationRequest request = new EvaluationRequest();
        request.setTextData("Answer 1 | Answer 2 | Answer 3");
        request.setQuestions("Q1|Q2|Q3");
        request.setPracticeMode(false);

        mockMvc.perform(post("/api/upload")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overallScore").value(77))
                .andExpect(jsonPath("$.verdict").value("Hire"))
                .andExpect(jsonPath("$.breakdown.technicalAccuracy").value(80));
    }

    @Test
    @DisplayName("POST /api/upload with practiceMode=true passes flag to service")
    void evaluateInterview_passesPracticeMode_toService() throws Exception {
        ScoreBreakdown breakdown = new ScoreBreakdown(0, 0, 0);
        EvaluationResponse mockResponse = new EvaluationResponse(
                0, breakdown,
                List.of("Good effort"),
                List.of("Be more specific"),
                List.of("Try STAR method"),
                "Practice"
        );

        // Verify practiceMode=true is passed through correctly
        when(groqService.evaluateInterview(anyString(), anyString(), eq(true)))
                .thenReturn(mockResponse);

        EvaluationRequest request = new EvaluationRequest();
        request.setTextData("Answer 1");
        request.setQuestions("Q1");
        request.setPracticeMode(true);

        mockMvc.perform(post("/api/upload")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verdict").value("Practice"));
    }

    @Test
    @DisplayName("POST /api/upload returns 400 when textData is blank")
    void evaluateInterview_returns400_whenTextDataIsBlank() throws Exception {
        EvaluationRequest request = new EvaluationRequest();
        request.setTextData("");          // blank — @NotBlank fails
        request.setQuestions("Q1|Q2");

        mockMvc.perform(post("/api/upload")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
