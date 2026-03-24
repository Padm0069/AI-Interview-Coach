package com.interview.coach.model.groq;

import lombok.Data;

import java.util.List;

/**
 * Deserialised response from the Groq chat completions API.
 *
 * Actual response shape (abbreviated):
 * {
 *   "choices": [
 *     {
 *       "message": { "role": "assistant", "content": "..." }
 *     }
 *   ]
 * }
 *
 * ObjectMapper is configured with FAIL_ON_UNKNOWN_PROPERTIES=false,
 * so extra fields (id, model, usage, etc.) are silently ignored.
 */
@Data
public class GroqResponse {

    private List<Choice> choices;

    /** Convenience — extracts the assistant text from the first choice. */
    public String getContent() {
        if (choices == null || choices.isEmpty()) {
            return "";
        }
        Choice first = choices.get(0);
        if (first.getMessage() == null) {
            return "";
        }
        return first.getMessage().getContent();
    }

    @Data
    public static class Choice {
        private GroqMessage message;
    }
}
