package com.interview.coach.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for POST /api/upload (full interview evaluation).
 *
 * Interview mode  → all fields populated, verdict is "Hire" / "Strong Hire" / "No Hire"
 * Practice mode   → overallScore=0, breakdown all zeros, verdict="Practice"
 *
 * The field names intentionally match what the React ResultsScreen already expects,
 * so the frontend needs zero changes to parse this response.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationResponse {

    private int overallScore;
    private ScoreBreakdown breakdown;
    private List<String> strengths;
    private List<String> improvements;
    private List<String> tips;
    private String verdict;   // "Strong Hire" | "Hire" | "No Hire" | "Practice"
}
