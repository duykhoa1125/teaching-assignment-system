package vn.edu.tass.backend.crud;

final class BadRequestException extends RuntimeException {
    BadRequestException(String message) { super(message); }
}
