package vn.edu.tass.backend.crud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Date;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

class CrudServiceTest {
    private final NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
    private final CrudService service = new CrudService(jdbc);

    @Test
    void rejectsUnknownColumnBeforeSql() {
        assertThrows(BadRequestException.class, () -> service.create("teachers", Map.of(
            "school_id", 1, "teacher_code", "GV1", "full_name", "A", "credential_hash", "secret")));
        verifyNoInteractions(jdbc);
    }

    @Test
    void rejectsMissingRequiredFieldBeforeSql() {
        assertThrows(BadRequestException.class, () -> service.create("teaching-demands", Map.of("semester_id", 1)));
        verifyNoInteractions(jdbc);
    }

    @Test
    void parsesDateAndRejectsInvalidDate() {
        assertEquals(Date.valueOf("2026-09-01"), ResourceCatalog.Kind.DATE.convert("2026-09-01", "starts_on"));
        assertThrows(BadRequestException.class, () -> ResourceCatalog.Kind.DATE.convert("01/09/2026", "starts_on"));
    }

    @Test
    void requiresOffsetForTimestamp() {
        assertEquals(OffsetDateTime.parse("2026-11-01T09:00:00+07:00"),
            ResourceCatalog.Kind.TIMESTAMP.convert("2026-11-01T09:00:00+07:00", "opens_at"));
        assertThrows(BadRequestException.class, () -> ResourceCatalog.Kind.TIMESTAMP.convert("2026-11-01T09:00:00", "opens_at"));
    }

    @Test
    void unknownResourceIsNotPassedToSql() {
        assertThrows(NotFoundException.class, () -> service.list("user_account", 20, 0));
        assertThrows(NotFoundException.class, () -> service.list("optimization-configs", 20, 0));
        verifyNoInteractions(jdbc);
    }

    @ParameterizedTest
    @MethodSource("resources")
    void allFiveCrudOperationsReachTheExpectedTable(String resourceName) {
        String table = ResourceCatalog.get(resourceName).table();
        doAnswer(invocation -> List.of(Map.of("id", 1L)))
            .when(jdbc).query(anyString(), any(MapSqlParameterSource.class), any(RowMapper.class));
        when(jdbc.update(anyString(), any(MapSqlParameterSource.class))).thenReturn(1);

        Map<String, Object> body = new HashMap<>();
        ResourceCatalog.get(resourceName).fields().forEach((column, field) -> {
            if (field.required()) body.put(column, sample(field.kind()));
        });

        service.list(resourceName, 20, 0);
        service.get(resourceName, 1);
        service.create(resourceName, body);
        service.replace(resourceName, 1, body);
        service.delete(resourceName, 1);

        ArgumentCaptor<String> queries = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(4)).query(queries.capture(), any(MapSqlParameterSource.class), any(RowMapper.class));
        assertTrue(queries.getAllValues().get(0).startsWith("SELECT * FROM " + table + " ORDER BY id"));
        assertTrue(queries.getAllValues().get(1).startsWith("SELECT * FROM " + table + " WHERE id"));
        assertTrue(queries.getAllValues().get(2).startsWith("INSERT INTO " + table + " ("));
        assertTrue(queries.getAllValues().get(3).startsWith("UPDATE " + table + " SET "));
        verify(jdbc).update(org.mockito.ArgumentMatchers.eq("DELETE FROM " + table + " WHERE id = :id"),
            any(MapSqlParameterSource.class));
    }

    private static Stream<String> resources() { return ResourceCatalog.names().stream(); }

    private static Object sample(ResourceCatalog.Kind kind) {
        return switch (kind) {
            case TEXT -> "DEMO";
            case LONG, INT -> 1;
            case DATE -> "2026-09-01";
            case TIMESTAMP -> "2026-11-01T09:00:00+07:00";
            case DECIMAL -> 2.5;
        };
    }
}
