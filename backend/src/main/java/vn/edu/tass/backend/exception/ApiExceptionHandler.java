package vn.edu.tass.backend.exception;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.sql.SQLException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import vn.edu.tass.backend.payload.dto.ApiErrorResponse;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(SolverRunActiveException.class)
    ResponseEntity<ApiErrorResponse> activeSolverRun(SolverRunActiveException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).header("Location","/api/solver-runs/"+e.getRunId())
            .body(new ApiErrorResponse("Conflict",e.getCode(),e.getMessage()));
    }
    @ExceptionHandler(vn.edu.tass.backend.solver.WorkloadInputException.class)
    ResponseEntity<ApiErrorResponse> solverInput(vn.edu.tass.backend.solver.WorkloadInputException e) {
        return error("LOCK_CONFLICT".equals(e.code())?HttpStatus.CONFLICT:HttpStatus.UNPROCESSABLE_ENTITY,e.code(),e.getMessage());
    }

    @ExceptionHandler(PlanOperationException.class)
    ResponseEntity<ApiErrorResponse> planOperation(PlanOperationException e) {
        return error(e.getStatus(), e.getCode(), e.getMessage());
    }

    @ExceptionHandler(org.springframework.dao.ConcurrencyFailureException.class)
    ResponseEntity<ApiErrorResponse> concurrentChange(org.springframework.dao.ConcurrencyFailureException e) {
        return error(HttpStatus.CONFLICT, "CONCURRENT_MODIFICATION", "Dữ liệu đang thay đổi; đọc lại phương án trước khi thử lại.");
    }

    @ExceptionHandler(BadRequestException.class)
    ResponseEntity<ApiErrorResponse> badRequest(BadRequestException e) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", e.getMessage());
    }

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<ApiErrorResponse> notFound(NotFoundException e) {
        return error(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> invalidFields(MethodArgumentNotValidException e) {
        var first = e.getBindingResult().getFieldError();
        String message = first == null ? "Request không hợp lệ"
            : new PropertyNamingStrategies.SnakeCaseStrategy().translate(first.getField())
                + ": " + first.getDefaultMessage();
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
        MissingServletRequestParameterException.class})
    ResponseEntity<ApiErrorResponse> invalidRequest(Exception e) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "JSON hoặc tham số không hợp lệ");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiErrorResponse> integrity(DataIntegrityViolationException e) {
        Throwable cause = e.getMostSpecificCause();
        String state = cause instanceof SQLException sql ? sql.getSQLState() : null;
        if ("23505".equals(state)) return error(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE", "Dữ liệu đã tồn tại");
        if ("23503".equals(state)) return error(HttpStatus.CONFLICT, "REFERENCE_CONFLICT", "Khóa ngoại không tồn tại hoặc bản ghi đang được tham chiếu");
        if ("23P01".equals(state)) return error(HttpStatus.CONFLICT, "OVERLAPPING_PERIOD", "Khoảng hiệu lực bị chồng với bản ghi đã có");
        if ("23514".equals(state)) return error(HttpStatus.UNPROCESSABLE_ENTITY, "DATA_CONSTRAINT", "Dữ liệu không đúng ngữ cảnh hoặc ràng buộc hiệu lực");
        return error(HttpStatus.UNPROCESSABLE_ENTITY, "DATA_CONSTRAINT", "Dữ liệu vi phạm ràng buộc PostgreSQL");
    }

    private static ResponseEntity<ApiErrorResponse> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ApiErrorResponse(status.getReasonPhrase(), code, message));
    }
}
