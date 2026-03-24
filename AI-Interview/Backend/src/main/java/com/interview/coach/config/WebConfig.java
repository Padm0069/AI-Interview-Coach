package com.interview.coach.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS configuration — allows the React frontend (localhost:3000)
 * to call this backend (localhost:8080) without browser CORS errors.
 *
 * In production you would replace allowedOrigins with your actual domain.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")          // apply to every endpoint under /api
                .allowedOrigins(
                        "http://localhost:3000", // React dev server
                        "http://localhost:3001"  // alternate CRA port
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);                  // cache pre-flight response for 1 hour
    }
}
