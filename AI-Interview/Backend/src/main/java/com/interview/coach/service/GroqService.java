package com.interview.coach.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interview.coach.exception.GroqException;
import com.interview.coach.model.AnswerEvaluationResponse;
import com.interview.coach.model.EvaluationResponse;
import com.interview.coach.model.ScoreBreakdown;
import com.interview.coach.model.groq.GroqMessage;
import com.interview.coach.model.groq.GroqRequest;
import com.interview.coach.model.groq.GroqResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * All communication with the Groq LLaMA API lives here.
 *
 * Design decisions worth explaining in an interview:
 *
 * 1. Private callGroq() — single HTTP method used by all three public methods.
 *    DRY principle; one place to update auth headers, timeout, error handling.
 *
 * 2. extractJson() — LLaMA sometimes wraps JSON in markdown code-fences or
 *    preamble text. The regex \\{[\\s\\S]*\\} grabs the outermost { } block,
 *    mirroring what the original Node.js backend did with raw.match(/\{[\s\S]*\}/).
 *
 * 3. Fallback responses — if Groq returns unparseable JSON we return a safe
 *    default rather than crashing the whole interview session.
 *
 * 4. temperature 0.3 for evaluation (deterministic), 0.7 for question
 *    generation (creative variety) — same rationale as the original.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GroqService {

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.url}")
    private String apiUrl;

    @Value("${groq.model}")
    private String model;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // ── Regex patterns for extracting JSON from LLaMA output ───────────────
    private static final Pattern JSON_OBJECT_PATTERN  = Pattern.compile("\\{[\\s\\S]*\\}");
    private static final Pattern JSON_ARRAY_PATTERN   = Pattern.compile("\\[[\\s\\S]*\\]");

    // ══════════════════════════════════════════════════════════════════════
    // Public interface
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Generate 5 role-specific interview questions.
     *
     * @param role       e.g. "Backend Engineer"
     * @param difficulty "Junior" | "Mid-level" | "Senior"
     * @return list of 5 question strings
     */
    public List<String> generateQuestions(String role, String difficulty) {
        String systemPrompt = """
                You are an expert technical interviewer. Generate exactly 5 interview questions
                as a JSON array of strings. Return ONLY the JSON array, no other text.
                Example: ["Question 1?","Question 2?","Question 3?","Question 4?","Question 5?"]
                """;

        String userMessage = String.format(
                "Generate 5 %s-level interview questions for a %s role.", difficulty, role
        );

        String raw = callGroq(systemPrompt, userMessage, 0.7, 400);
        return parseJsonArray(raw);
    }

    /**
     * Per-question mini scorecard.
     * Called once per question in the background — kept cheap (max_tokens=120).
     *
     * @param answer      transcribed answer text
     * @param question    the interview question
     * @param questionIdx 0-indexed position
     * @return scorecard with score, label, and one-line feedback
     */
    public AnswerEvaluationResponse evaluateAnswer(String answer, String question, int questionIdx) {
        String systemPrompt = """
                You are a technical interviewer. Score this single answer and return ONLY a JSON
                object with these exact fields:
                {
                  "questionIdx": <number>,
                  "score": <0-100>,
                  "label": "Excellent|Good|Fair|Needs Work",
                  "oneLineFeedback": "<max 15 words>"
                }
                No extra text. No markdown.
                """;

        String userMessage = String.format(
                "Question: %s\n\nAnswer: %s\n\nquestionIdx: %d", question, answer, questionIdx
        );

        String raw = callGroq(systemPrompt, userMessage, 0.3, 120);

        try {
            String json = extractJsonObject(raw);
            Map<String, Object> map = objectMapper.readValue(json, new TypeReference<>() {});

            return new AnswerEvaluationResponse(
                    questionIdx,
                    toInt(map.getOrDefault("score", 50)),
                    (String) map.getOrDefault("label", "Fair"),
                    (String) map.getOrDefault("oneLineFeedback", "Could not generate feedback.")
            );
        } catch (Exception e) {
            log.warn("Failed to parse per-question evaluation for idx={}: {}", questionIdx, e.getMessage());
            // Safe fallback — never crash the interview for a single question
            return new AnswerEvaluationResponse(questionIdx, 50, "Fair", "Unable to evaluate this answer.");
        }
    }

    /**
     * Full interview evaluation after all questions are answered.
     *
     * @param textData     all answers joined by " | "
     * @param questions    all questions joined by "|"
     * @param practiceMode true → coaching only (no scores/verdict)
     * @return structured evaluation
     */
    public EvaluationResponse evaluateInterview(String textData, String questions, boolean practiceMode) {
        String systemPrompt = practiceMode ? buildPracticeSystemPrompt() : buildEvalSystemPrompt();
        String userMessage = String.format(
                "Questions (separated by |):\n%s\n\nAnswers (separated by |):\n%s",
                questions, textData
        );

        String raw = callGroq(systemPrompt, userMessage, 0.3, 500);

        try {
            String json = extractJsonObject(raw);
            Map<String, Object> map = objectMapper.readValue(json, new TypeReference<>() {});
            return mapToEvaluationResponse(map, practiceMode);
        } catch (Exception e) {
            log.error("Failed to parse full evaluation: {}", e.getMessage());
            throw new GroqException("Could not parse the evaluation response from Groq.", e);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // Private helpers
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Single HTTP method that handles all Groq API calls.
     * Builds the request, attaches the Bearer token, and handles HTTP errors.
     */
    private String callGroq(String systemPrompt, String userPrompt, double temperature, int maxTokens) {
        GroqRequest requestBody = GroqRequest.builder()
                .model(model)
                .messages(List.of(
                        new GroqMessage("system", systemPrompt),
                        new GroqMessage("user", userPrompt)
                ))
                .temperature(temperature)
                .maxTokens(maxTokens)
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);   // Authorization: Bearer <key>

        HttpEntity<GroqRequest> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<GroqResponse> response = restTemplate.exchange(
                    apiUrl,
                    HttpMethod.POST,
                    entity,
                    GroqResponse.class
            );

            if (response.getBody() == null) {
                throw new GroqException("Groq returned an empty response body.");
            }

            String content = response.getBody().getContent();
            log.debug("Groq raw response: {}", content);
            return content;

        } catch (HttpClientErrorException.Unauthorized e) {
            throw new GroqException("Invalid Groq API key. Check your GROQ_API_KEY environment variable.");
        } catch (HttpClientErrorException.TooManyRequests e) {
            throw new GroqException("Groq rate limit hit. The frontend should retry after a delay.");
        } catch (HttpClientErrorException e) {
            throw new GroqException("Groq API error: " + e.getStatusCode() + " — " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            throw new GroqException("Failed to reach Groq API: " + e.getMessage(), e);
        }
    }

    /**
     * Extracts the outermost { ... } block from LLaMA output.
     * LLaMA sometimes says "Here is the JSON: { ... }" — the regex handles that.
     */
    private String extractJsonObject(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new GroqException("Groq returned an empty content string.");
        }
        Matcher matcher = JSON_OBJECT_PATTERN.matcher(raw);
        if (!matcher.find()) {
            throw new GroqException("No JSON object found in Groq response: " + raw);
        }
        return matcher.group();
    }

    /** Extracts the outermost [ ... ] block for question arrays. */
    private List<String> parseJsonArray(String raw) {
        try {
            Matcher matcher = JSON_ARRAY_PATTERN.matcher(raw);
            if (!matcher.find()) {
                throw new GroqException("No JSON array found in Groq response: " + raw);
            }
            return objectMapper.readValue(matcher.group(), new TypeReference<>() {});
        } catch (GroqException e) {
            throw e;
        } catch (Exception e) {
            throw new GroqException("Failed to parse questions array from Groq.", e);
        }
    }

    @SuppressWarnings("unchecked")
    private EvaluationResponse mapToEvaluationResponse(Map<String, Object> map, boolean practiceMode) {
        ScoreBreakdown breakdown = new ScoreBreakdown();

        if (!practiceMode) {
            Map<String, Object> bd = (Map<String, Object>) map.getOrDefault("breakdown", Map.of());
            breakdown.setTechnicalAccuracy(toInt(bd.getOrDefault("technicalAccuracy", 0)));
            breakdown.setCommunication(toInt(bd.getOrDefault("communication", 0)));
            breakdown.setProblemSolving(toInt(bd.getOrDefault("problemSolving", 0)));
        }

        return new EvaluationResponse(
                toInt(map.getOrDefault("overallScore", 0)),
                breakdown,
                toStringList(map.get("strengths")),
                toStringList(map.get("improvements")),
                toStringList(map.get("tips")),
                (String) map.getOrDefault("verdict", practiceMode ? "Practice" : "No Hire")
        );
    }

    private String buildEvalSystemPrompt() {
        return """
                You are a strict but fair technical interviewer. Evaluate the interview answers
                and return ONLY a JSON object with this exact structure — no extra text, no markdown:
                {
                  "overallScore": <0-100>,
                  "breakdown": {
                    "technicalAccuracy": <0-100>,
                    "communication": <0-100>,
                    "problemSolving": <0-100>
                  },
                  "strengths": ["<strength 1>","<strength 2>"],
                  "improvements": ["<area 1>","<area 2>"],
                  "tips": ["<tip 1>","<tip 2>","<tip 3>"],
                  "verdict": "Strong Hire|Hire|No Hire"
                }
                """;
    }

    private String buildPracticeSystemPrompt() {
        return """
                You are a supportive interview coach. Give constructive feedback on the answers.
                Return ONLY a JSON object with this exact structure — no extra text, no markdown:
                {
                  "strengths": ["<what they did well 1>","<what they did well 2>"],
                  "improvements": ["<area to improve 1>","<area to improve 2>"],
                  "tips": ["<specific coaching tip 1>","<specific coaching tip 2>"],
                  "overallScore": 0,
                  "breakdown": { "technicalAccuracy": 0, "communication": 0, "problemSolving": 0 },
                  "verdict": "Practice"
                }
                """;
    }

    /** Safely cast Number or String to int. */
    private int toInt(Object val) {
        if (val instanceof Number n) return n.intValue();
        if (val instanceof String s) {
            try { return Integer.parseInt(s.trim()); } catch (NumberFormatException ignore) {}
        }
        return 0;
    }

    @SuppressWarnings("unchecked")
    private List<String> toStringList(Object val) {
        if (val instanceof List<?> list) {
            return (List<String>) list;
        }
        return List.of();
    }
}
