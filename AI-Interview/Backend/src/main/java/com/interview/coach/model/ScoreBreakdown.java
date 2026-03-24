package com.interview.coach.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Nested breakdown inside EvaluationResponse.
 * Mirrors the exact JSON shape expected by the React ResultsScreen radar chart:
 *   { "technicalAccuracy": 80, "communication": 70, "problemSolving": 75 }
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScoreBreakdown {

    private int technicalAccuracy;
    private int communication;
    private int problemSolving;
}
