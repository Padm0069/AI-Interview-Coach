package com.interview.coach.model.groq;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Serialised body sent to https://api.groq.com/openai/v1/chat/completions.
 * Groq's API is OpenAI-compatible, so this shape works with any OpenAI
 * chat completion client.
 *
 * @Builder lets GroqService construct requests with a fluent DSL:
 *   GroqRequest.builder().model(...).messages(...).temperature(0.3).build()
 */
@Data
@Builder
public class GroqRequest {

    private String model;

    private List<GroqMessage> messages;

    private double temperature;

    @JsonProperty("max_tokens")
    private int maxTokens;
}
