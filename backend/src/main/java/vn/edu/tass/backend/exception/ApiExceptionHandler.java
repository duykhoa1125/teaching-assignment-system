package vn.edu.tass.backend.exception;

import vn.edu.tass.backend.payload.dto.ApiErrorResponse;

import java.sql.SQLException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(BadRequestException.class)
    ResponseEntity<ApiErrorResponse> badRequest(BadRequestException e) {
        return error(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<ApiErrorResponse> notFound(NotFoundException e) {
        return error(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class, MethodArgumentNotValidException.class})
    ResponseEntity<ApiErrorResponse> invalidRequest(Exception e) {
        return error(HttpStatus.BAD_REQUEST, "Yêu cầu JSON hoặc tham số không hợp lệ");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiErrorResponse> integrity(DataIntegrityViolationException e) {
        Throwable cause = e.getMostSpecificCause();
        String state = cause instanceof SQLException sql ? sql.getSQLState() : null;
        if ("23505".equals(state)) return error(HttpStatus.CONFLICT, "Dữ liệu đã tồn tại (ràng buộc UNIQUE)");
        if ("23503".equals(state)) return error(HttpStatus.CONFLICT, "Khóa ngoại không tồn tại hoặc bản ghi đang được tham chiếu");
        return error(HttpStatus.UNPROCESSABLE_ENTITY, "Dữ liệu vi phạm ràng buộc PostgreSQL");
    }

    private static ResponseEntity<ApiErrorResponse> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(new ApiErrorResponse(status.getReasonPhrase(), message));
    }
}
