package com.interview.coach.controller;

import com.interview.coach.model.*;
import com.interview.coach.service.GroqService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for the core interview flow.
 *
 * Three endpoints, matching the original Express backend:
 *
 *   POST /api/generate-questions  → question generation
 *   POST /api/evaluate-answer     → per-question scorecard (called per-question, async from frontend)
 *   POST /api/upload              → full interview evaluation (called once at the end)
 *
 * Design principle: this class is intentionally thin.
 * Controllers should only: validate input, delegate to a service, return a response.
 * All business logic (prompt building, HTTP calls to Groq, JSON parsing) lives in GroqService.
 *
 * @RequiredArgsConstructor injects GroqService via constructor — the Spring-recommended
 * approach over @Autowired field injection (easier to test, no reflection needed).
 */
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InterviewController {

    private final GroqService groqService;

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/generate-questions
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Generate 5 interview questions for the given role and difficulty.
     *
     * @Valid triggers Jakarta Bean Validation on QuestionRequest fields.
     * If role or difficulty is blank, Spring returns 400 before we even
     * reach this method — handled by GlobalExceptionHandler.
     */
    @PostMapping("/generate-questions")
    public ResponseEntity<QuestionResponse> generateQuestions(
            @Valid @RequestBody QuestionRequest request) {

        log.info("Generating questions for role={} difficulty={}", request.getRole(), request.getDifficulty());

        List<String> questions = groqService.generateQuestions(
                request.getRole(),
                request.getDifficulty()
        );

        return ResponseEntity.ok(new QuestionResponse(questions));
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/evaluate-answer
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Per-question mini scorecard.
     * The React frontend fires one of these per question in the background,
     * staggered by (questionIdx * 1500ms) to avoid Groq rate limits.
     */
    @PostMapping("/evaluate-answer")
    public ResponseEntity<AnswerEvaluationResponse> evaluateAnswer(
            @Valid @RequestBody AnswerEvaluationRequest request) {

        log.info("Evaluating answer for questionIdx={}", request.getQuestionIdx());

        AnswerEvaluationResponse response = groqService.evaluateAnswer(
                request.getAnswer(),
                request.getQuestion(),
                request.getQuestionIdx()
        );

        return ResponseEntity.ok(response);
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/upload
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Full interview evaluation, called once after all questions are answered.
     *
     * Endpoint name "/upload" preserved from the original Express backend
     * so the React frontend requires no URL changes beyond the port number.
     *
     * practiceMode flag switches the Groq system prompt:
     *   false → strict scoring with Hire/No Hire verdict
     *   true  → coaching feedback, no scores
     */
    @PostMapping("/upload")
    public ResponseEntity<EvaluationResponse> evaluateInterview(
            @Valid @RequestBody EvaluationRequest request) {

        log.info("Running full evaluation, practiceMode={}", request.isPracticeMode());

        EvaluationResponse response = groqService.evaluateInterview(
                request.getTextData(),
                request.getQuestions(),
                request.isPracticeMode()
        );

        return ResponseEntity.ok(response);
    }
}
