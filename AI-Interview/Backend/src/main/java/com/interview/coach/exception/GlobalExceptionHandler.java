package com.interview.coach.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Centralised error handling for the entire application.
 *
 * @RestControllerAdvice = @ControllerAdvice + @ResponseBody
 * Every @ExceptionHandler method here produces JSON automatically.
 *
 * Without this, Spring would return its default HTML error page,
 * which is useless for a REST API.
 *
 * Error envelope shape:
 * {
 *   "status":  502,
 *   "error":   "Groq API Error",
 *   "message": "...",
 *   "timestamp": "2024-..."
 * }
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── Groq upstream failures ──────────────────────────────────────────────

    @ExceptionHandler(GroqException.class)
    public ResponseEntity<Map<String, Object>> handleGroqException(GroqException ex) {
        return buildError(HttpStatus.BAD_GATEWAY, "Groq API Error", ex.getMessage());
    }

    // ── AssemblyAI upstream failures ────────────────────────────────────────

    @ExceptionHandler(AssemblyAIException.class)
    public ResponseEntity<Map<String, Object>> handleAssemblyAIException(AssemblyAIException ex) {
        return buildError(HttpStatus.BAD_GATEWAY, "AssemblyAI Error", ex.getMessage());
    }

    // ── @Valid bean validation failures ─────────────────────────────────────
    // Triggered when a request DTO fails its @NotBlank / @NotNull checks.

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(
            MethodArgumentNotValidException ex) {

        // Collect all field-level errors into a map: { "role": "must not be blank" }
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }

        Map<String, Object> body = baseError(HttpStatus.BAD_REQUEST, "Validation Failed");
        body.put("fieldErrors", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    // ── Catch-all ──────────────────────────────────────────────────────────
    // Prevents raw stack traces leaking to the client.

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        return buildError(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "An unexpected error occurred. Please try again."
        );
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private ResponseEntity<Map<String, Object>> buildError(
            HttpStatus status, String error, String message) {
        return ResponseEntity.status(status).body(baseError(status, error, message));
    }

    private Map<String, Object> baseError(HttpStatus status, String error, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        body.put("timestamp", Instant.now().toString());
        return body;
    }

    private Map<String, Object> baseError(HttpStatus status, String error) {
        return baseError(status, error, null);
    }
}
