package vn.edu.tass.backend.exception;

public final class PlanConflictException extends RuntimeException {
    private final String code;

    public PlanConflictException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }
}
