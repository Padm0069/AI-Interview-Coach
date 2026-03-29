package com.interview.coach.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interview.coach.exception.GroqException;
import com.interview.coach.model.AnswerEvaluationResponse;
import com.interview.coach.model.EvaluationResponse;
import com.interview.coach.model.groq.GroqResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

// @ExtendWith(MockitoExtension.class) — tells JUnit to use Mockito.
// Mockito creates mock objects for fields annotated @Mock, so we
// don't need a real RestTemplate (which would actually call Groq).
@ExtendWith(MockitoExtension.class)
class GroqServiceTest {

    // @Mock creates a fake RestTemplate. We control what it returns
    // in each test — no real HTTP calls happen.
    @Mock
    private RestTemplate restTemplate;

    private GroqService groqService;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        groqService = new GroqService(restTemplate, objectMapper);

        // @Value fields aren't injected in unit tests (no Spring context).
        // ReflectionTestUtils sets private fields directly for testing.
        ReflectionTestUtils.setField(groqService, "apiKey", "test-key");
        ReflectionTestUtils.setField(groqService, "apiUrl", "https://api.groq.com/test");
        ReflectionTestUtils.setField(groqService, "model", "llama-3.3-70b-versatile");
    }

    // ── Helper: build a fake Groq API response ─────────────────────────────
    // Wraps a string in the Groq response envelope:
    // { "choices": [{ "message": { "role": "assistant", "content": "..." } }] }
    private ResponseEntity<GroqResponse> fakeGroqResponse(String content) throws Exception {
        String json = """
                {
                  "choices": [{
                    "message": {
                      "role": "assistant",
                      "content": %s
                    }
                  }]
                }
                """.formatted(quoted(content));

        ObjectMapper mapper = new ObjectMapper();
        GroqResponse response = mapper.readValue(json, GroqResponse.class);
        return ResponseEntity.ok(response);
    }

    private String quoted(String s) {
        return "\"" + s.replace("\"", "\\\"").replace("\n", "\\n") + "\"";
    }

    // ══════════════════════════════════════════════════════════════════════
    // generateQuestions tests
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("generateQuestions returns 5 questions when Groq returns valid JSON array")
    void generateQuestions_returnsQuestions_whenGroqRespondsWithValidArray() throws Exception {
        // ARRANGE — tell the mock RestTemplate what to return
        String groqContent = "[\"Q1?\",\"Q2?\",\"Q3?\",\"Q4?\",\"Q5?\"]";
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GroqResponse.class)))
                .thenReturn(fakeGroqResponse(groqContent));

        // ACT
        List<String> questions = groqService.generateQuestions("Backend Engineer", "Mid-level");

        // ASSERT
        assertThat(questions).hasSize(5);
        assertThat(questions.get(0)).isEqualTo("Q1?");
    }

    @Test
    @DisplayName("generateQuestions handles LLaMA preamble text before the JSON array")
    void generateQuestions_handlesLLaMAPreamble_extractsArrayCorrectly() throws Exception {
        // LLaMA sometimes says "Here are your questions:" before the JSON.
        // The regex should strip the preamble and parse just the array.
        String groqContent = "Here are 5 questions for you: [\"Q1?\",\"Q2?\",\"Q3?\",\"Q4?\",\"Q5?\"]";
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GroqResponse.class)))
                .thenReturn(fakeGroqResponse(groqContent));

        List<String> questions = groqService.generateQuestions("Backend Engineer", "Senior");

        assertThat(questions).hasSize(5);
    }

    @Test
    @DisplayName("generateQuestions throws GroqException when Groq returns 429 rate limit")
    void generateQuestions_throwsGroqException_on429RateLimit() {
        // Simulate Groq returning HTTP 429
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GroqResponse.class)))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests",
                        HttpHeaders.EMPTY, new byte[0], null));

        // assertThatThrownBy checks that the method throws the expected exception
        assertThatThrownBy(() -> groqService.generateQuestions("Backend Engineer", "Mid-level"))
                .isInstanceOf(GroqException.class)
                .hasMessageContaining("rate limit");
    }

    @Test
    @DisplayName("generateQuestions throws GroqException when Groq returns 401 unauthorized")
    void generateQuestions_throwsGroqException_on401Unauthorized() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GroqResponse.class)))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.UNAUTHORIZED, "Unauthorized",
                        HttpHeaders.EMPTY, new byte[0], null));

        assertThatThrownBy(() -> groqService.generateQuestions("Backend Engineer", "Mid-level"))
                .isInstanceOf(GroqException.class)
                .hasMessageContaining("API key");
    }

    // ══════════════════════════════════════════════════════════════════════
    // evaluateAnswer tests
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("evaluateAnswer parses score, label, and feedback correctly")
    void evaluateAnswer_parsesResponse_correctly() throws Exception {
        String groqContent = """
                {"questionIdx":2,"score":85,"label":"Good","oneLineFeedback":"Strong answer with clear examples."}
                """;
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GroqResponse.class)))
                .thenReturn(fakeGroqResponse(groqContent));

        AnswerEvaluationResponse result = groqService.evaluateAnswer(
                "My answer here", "Tell me about yourself", 2
        );

        assertThat(result.getQuestionIdx()).isEqualTo(2);
        assertThat(result.getScore()).isEqualTo(85);
        assertThat(result.getLabel()).isEqualTo("Good");
        assertThat(result.getOneLineFeedback()).isEqualTo("Strong answer with clear examples.");
    }

    @Test
    @DisplayName("evaluateAnswer returns safe fallback when LLaMA returns unparseable response")
    void evaluateAnswer_returnsFallback_whenLLaMAReturnsMalformedJson() throws Exception {
        // LLaMA sometimes completely ignores the prompt and returns prose.
        // The service should NOT crash — it returns a safe default.
        String groqContent = "I cannot evaluate this answer at this time.";
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GroqResponse.class)))
                .thenReturn(fakeGroqResponse(groqContent));

        AnswerEvaluationResponse result = groqService.evaluateAnswer("answer", "question", 0);

        // Fallback values — interview continues without crashing
        assertThat(result.getQuestionIdx()).isEqualTo(0);
        assertThat(result.getScore()).isEqualTo(50);
        assertThat(result.getLabel()).isEqualTo("Fair");
    }

    @Test
    @DisplayName("evaluateAnswer handles LLaMA returning score as string instead of integer")
    void evaluateAnswer_handlesScoreAsString() throws Exception {
        // LLaMA sometimes returns "score": "85" (string) instead of "score": 85 (int).
        // The toInt() helper in GroqService handles this — verify it works.
        String groqContent = """
                {"questionIdx":1,"score":"72","label":"Good","oneLineFeedback":"Good structure."}
                """;
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GroqResponse.class)))
                .thenReturn(fakeGroqResponse(groqContent));

        AnswerEvaluationResponse result = groqService.evaluateAnswer("answer", "question", 1);

        assertThat(result.getScore()).isEqualTo(72);
    }

    // ══════════════════════════════════════════════════════════════════════
    // evaluateInterview tests
    // ══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("evaluateInterview returns full evaluation in normal mode")
    void evaluateInterview_returnsFullEvaluation_inNormalMode() throws Exception {
        String groqContent = """
                {
                  "overallScore": 78,
                  "breakdown": {
                    "technicalAccuracy": 80,
                    "communication": 75,
                    "problemSolving": 79
                  },
                  "strengths": ["Clear communication","Good examples"],
                  "improvements": ["Add more detail"],
                  "tips": ["Use STAR method"],
                  "verdict": "Hire"
                }
                """;
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GroqResponse.class)))
                .thenReturn(fakeGroqResponse(groqContent));

        EvaluationResponse result = groqService.evaluateInterview(
                "Answer 1 | Answer 2", "Q1|Q2", false
        );

        assertThat(result.getOverallScore()).isEqualTo(78);
        assertThat(result.getVerdict()).isEqualTo("Hire");
        assertThat(result.getStrengths()).contains("Clear communication");
        assertThat(result.getBreakdown().getTechnicalAccuracy()).isEqualTo(80);
    }

    @Test
    @DisplayName("evaluateInterview returns practice verdict in practice mode")
    void evaluateInterview_returnsPracticeVerdict_inPracticeMode() throws Exception {
        String groqContent = """
                {
                  "strengths": ["Good effort"],
                  "improvements": ["Be more specific"],
                  "tips": ["Practice STAR method"],
                  "overallScore": 0,
                  "breakdown": {"technicalAccuracy":0,"communication":0,"problemSolving":0},
                  "verdict": "Practice"
                }
                """;
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GroqResponse.class)))
                .thenReturn(fakeGroqResponse(groqContent));

        EvaluationResponse result = groqService.evaluateInterview(
                "Answer 1 | Answer 2", "Q1|Q2", true
        );

        assertThat(result.getVerdict()).isEqualTo("Practice");
        assertThat(result.getOverallScore()).isEqualTo(0);
    }

    @Test
    @DisplayName("evaluateInterview throws GroqException when response cannot be parsed")
    void evaluateInterview_throwsGroqException_whenResponseUnparseable() throws Exception {
        // For full evaluation we throw (don't swallow) — user must know it failed
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(GroqResponse.class)))
                .thenReturn(fakeGroqResponse("This is not JSON at all."));

        assertThatThrownBy(() ->
                groqService.evaluateInterview("answers", "questions", false))
                .isInstanceOf(GroqException.class);
    }
}
