package com.interview.coach.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request DTO for POST /api/generate-questions.
 *
 * @NotBlank triggers Spring's validation layer (@Valid in controller)
 * so we never call Groq with an empty role or difficulty.
 */
@Data
public class QuestionRequest {

    @NotBlank(message = "role must not be blank")
    private String role;        // e.g. "Software Engineer", "Backend Engineer"

    @NotBlank(message = "difficulty must not be blank")
    private String difficulty;  // "Junior" | "Mid-level" | "Senior"
}
