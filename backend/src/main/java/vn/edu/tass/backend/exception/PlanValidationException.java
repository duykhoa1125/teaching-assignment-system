package vn.edu.tass.backend.exception;

import lombok.Getter;

@Getter
public class PlanValidationException extends RuntimeException {
    private final String code;

    public PlanValidationException(String code, String message) {
        super(message);
        this.code = code;
    }
}
