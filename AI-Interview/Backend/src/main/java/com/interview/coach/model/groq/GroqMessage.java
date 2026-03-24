package com.interview.coach.model.groq;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A single message in the Groq chat completion format.
 * role    → "system" (instructions) or "user" (the prompt)
 * content → the actual text
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroqMessage {

    private String role;
    private String content;
}
