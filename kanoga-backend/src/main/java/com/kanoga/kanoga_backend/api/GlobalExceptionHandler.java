package com.kanoga.kanoga_backend.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.Map;

/** Translates exceptions thrown by the service layer into meaningful HTTP responses. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Client supplied something invalid — a bad id, an over-assignment, a missing field. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        log.warn("Rejected request: {}", ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    /** A required query parameter was left off the request. */
    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(
            org.springframework.web.bind.MissingServletRequestParameterException ex) {
        return build(HttpStatus.BAD_REQUEST, "'" + ex.getParameterName() + "' is required");
    }

    /** A parameter was present but the wrong shape — a word where a number belongs. */
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleBadParamType(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        return build(HttpStatus.BAD_REQUEST, "'" + ex.getName() + "' is not in the expected format");
    }

    /** The request body was missing or could not be read as JSON. */
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableBody(
            org.springframework.http.converter.HttpMessageNotReadableException ex) {
        return build(HttpStatus.BAD_REQUEST, "The request body is missing or is not valid JSON");
    }

    /** Webhook signature validation failed. */
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(SecurityException ex) {
        log.warn("Rejected request on security grounds: {}", ex.getMessage());
        return build(HttpStatus.UNAUTHORIZED, "Not authorised");
    }

    /** Anything unexpected. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR,
                "Something went wrong handling that request.");
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "status", status.value(),
                "error", status.getReasonPhrase(),
                "message", message == null ? "" : message,
                "timestamp", OffsetDateTime.now().toString()
        ));
    }
}
