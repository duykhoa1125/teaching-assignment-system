package vn.edu.tass.backend.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

class ApiExceptionHandlerTest {
    @Test
    void mapsPostgresExclusionConstraintToStableConflictCode() {
        var response = new ApiExceptionHandler().integrity(
            new DataIntegrityViolationException("overlap", new SQLException("overlap", "23P01")));

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("OVERLAPPING_PERIOD", response.getBody().code());
    }
}
