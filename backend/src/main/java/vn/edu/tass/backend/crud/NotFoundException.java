package vn.edu.tass.backend.crud;

final class NotFoundException extends RuntimeException {
    NotFoundException(String message) { super(message); }
}
