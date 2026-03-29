package com.interview.coach.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request DTO for POST /api/upload (full interview evaluation).
 *
 * textData   — all answers joined by " | "  e.g. "Answer 1 | Answer 2 | ..."
 * questions  — all questions joined by "|"  e.g. "Q1|Q2|..."
 * practiceMode — true → coaching feedback only (no scores/verdict)
 *               false → full scoring with verdict
 */
@Data
public class EvaluationRequest {

    @NotBlank(message = "textData must not be blank")
    private String textData;

    @NotBlank(message = "questions must not be blank")
    private String questions;

    private boolean practiceMode = false;
}
