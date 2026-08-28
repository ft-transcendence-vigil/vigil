package exceptions;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.Setter;
import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionsHandler {
    @Setter
    @Getter
    public static class ApiError {
        private LocalDateTime timestamp  = LocalDateTime.now();
        private int status;
        private String path;
        private Map<String, String> errors;

        public ApiError(int status, String path, Map<String, String> errors) {
            this.status = status;
            this.path = path;
            this.errors = errors;
        }
    }



    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(e -> errors.put(e.getField(), e.getDefaultMessage()));
        ApiError apiError = new ApiError(HttpStatus.BAD_REQUEST.value(), request.getRequestURI(), errors);
        return ResponseEntity.badRequest().body(apiError);
    }
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations().forEach(violation ->
                errors.put(violation.getPropertyPath().toString(), violation.getMessage())
        );
        ApiError apiError = new ApiError(HttpStatus.BAD_REQUEST.value(), request.getRequestURI(), errors);
        return ResponseEntity.badRequest().body(apiError);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, request, "Invalid username or password");
    }

    @ExceptionHandler(ResourcesNotFoundException.class)
    public ResponseEntity<ApiError> handleResourceNotFound(ResourcesNotFoundException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.NOT_FOUND, request, ex.getMessage());
    }

    @ExceptionHandler(DuplicatedResourcesException.class)
    public ResponseEntity<ApiError> handleDuplicateResource(DuplicatedResourcesException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.CONFLICT, request, ex.getMessage());
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ApiError> handleInvalidRequest(InvalidRequestException ex, HttpServletRequest request) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, request, ex.getMessage());
    }

    private ResponseEntity<ApiError> buildErrorResponse(HttpStatus status, HttpServletRequest request, String message) {
        Map<String, String> errors = new HashMap<>();
        errors.put("message", message);
        ApiError apiError = new ApiError(status.value(), request.getRequestURI(), errors);
        return ResponseEntity.status(status).body(apiError);
    }
}

