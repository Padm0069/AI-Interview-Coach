package com.interview.coach.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown by GroqService when the Groq API call fails or returns
 * unparseable content.
 *
 * @ResponseStatus maps this exception to an HTTP 502 Bad Gateway —
 * semantically correct because OUR server is the client calling
 * an upstream service (Groq) that misbehaved.
 *
 * GlobalExceptionHandler also catches this to return a structured
 * JSON error body instead of Spring's default HTML error page.
 */
@ResponseStatus(HttpStatus.BAD_GATEWAY)
public class GroqException extends RuntimeException {

    public GroqException(String message) {
        super(message);
    }

    public GroqException(String message, Throwable cause) {
        super(message, cause);
    }
}
