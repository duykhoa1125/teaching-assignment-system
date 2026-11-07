package vn.edu.tass.backend.exception;

public final class BadRequestException extends RuntimeException {
    public BadRequestException(String message) { super(message); }
}
