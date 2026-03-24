package com.interview.coach.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request DTO for POST /api/evaluate-answer (per-question mini scorecard).
 *
 * Called once per question in the background — the frontend fires these
 * staggered so as not to hit Groq rate limits.
 */
@Data
public class AnswerEvaluationRequest {

    @NotBlank(message = "answer must not be blank")
    private String answer;

    @NotBlank(message = "question must not be blank")
    private String question;

    @NotNull(message = "questionIdx must not be null")
    private Integer questionIdx;  // 0-indexed
}
