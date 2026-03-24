package com.interview.coach.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * Application-wide bean definitions.
 *
 * Centralising RestTemplate and ObjectMapper here means every @Service
 * gets the same configured instance via constructor injection — no static
 * singletons, no hidden state.
 */
@Configuration
public class AppConfig {

    /**
     * RestTemplate used by GroqService and AssemblyAIService to make
     * outbound HTTP calls.
     *
     * Timeouts are set defensively — Groq can be slow when the model is
     * under load, so 30 s read timeout is intentional.
     */
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .connectTimeout(Duration.ofSeconds(10))
                .readTimeout(Duration.ofSeconds(30))
                .build();
    }

    /**
     * Shared Jackson ObjectMapper.
     * FAIL_ON_UNKNOWN_PROPERTIES = false lets us deserialise Groq/AssemblyAI
     * responses without mapping every field they return.
     */
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }
}
