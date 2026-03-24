package com.interview.coach.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown by AssemblyAIService when audio upload or transcription fails.
 * Maps to HTTP 502 for the same reason as GroqException — upstream failure.
 */
@ResponseStatus(HttpStatus.BAD_GATEWAY)
public class AssemblyAIException extends RuntimeException {

    public AssemblyAIException(String message) {
        super(message);
    }

    public AssemblyAIException(String message, Throwable cause) {
        super(message, cause);
    }
}
