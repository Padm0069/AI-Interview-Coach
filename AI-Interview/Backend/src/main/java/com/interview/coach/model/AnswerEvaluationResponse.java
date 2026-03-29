package com.interview.coach.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for POST /api/evaluate-answer.
 * Quick scorecard for a single answer — kept small (max_tokens=120 in Groq call)
 * so it returns fast without blocking the interview flow.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnswerEvaluationResponse {

    private int questionIdx;          // echoed back so the frontend knows which card to update
    private int score;                // 0–100
    private String label;             // "Excellent" | "Good" | "Fair" | "Needs Work"
    private String oneLineFeedback;   // ≤ 15 words
}
