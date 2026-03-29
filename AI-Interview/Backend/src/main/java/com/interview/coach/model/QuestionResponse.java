package com.interview.coach.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for POST /api/generate-questions.
 * Wraps the list so the JSON shape is { "questions": [...] }
 * — easier to extend later without breaking the frontend contract.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionResponse {

    private List<String> questions;
}
