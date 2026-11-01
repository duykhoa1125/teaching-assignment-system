package vn.edu.tass.backend.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

import vn.edu.tass.backend.repository.support.EntityMetadata;

class EntitySchemaTest {
    private static final Map<Class<?>, String> TABLES = Map.ofEntries(
        Map.entry(School.class, "school"), Map.entry(AcademicYear.class, "academic_year"),
        Map.entry(Semester.class, "semester"), Map.entry(EducationLevel.class, "education_level"),
        Map.entry(Grade.class, "grade"), Map.entry(SchoolClass.class, "school_class"),
        Map.entry(Subject.class, "subject"), Map.entry(Teacher.class, "teacher"),
        Map.entry(TeachingDemand.class, "teaching_demand"), Map.entry(Department.class, "department"),
        Map.entry(TeacherEmployment.class, "teacher_employment"),
        Map.entry(TeachingQualification.class, "teaching_qualification"),
        Map.entry(TeachingExperience.class, "teaching_experience"),
        Map.entry(AssignmentRound.class, "assignment_round"),
        Map.entry(RoundSubjectScope.class, "round_subject_scope"),
        Map.entry(ClassSubjectApplicability.class, "class_subject_applicability")
    );

    @Test
    void sixteenEntitiesMatchEverySqlColumnAndType() throws Exception {
        assertEquals(16, TABLES.size());
        String schema = Files.readString(Path.of("sql", "01_schema.sql"));
        for (var entry : TABLES.entrySet()) {
            Class<?> type = entry.getKey();
            String table = entry.getValue();
            EntityMetadata<?> metadata = new EntityMetadata<>(type);
            assertEquals(table, metadata.table());
            int start = schema.indexOf("CREATE TABLE " + table + " (");
            assertTrue(start >= 0, table);
            int end = schema.indexOf("\n);", start);
            assertTrue(end > start, table);
            String definition = schema.substring(start, end);

            Set<String> sqlColumns = Pattern.compile("(?m)^    ([a-z_]+)\\s+(?:BIGINT|SMALLINT|VARCHAR|DATE|TIMESTAMPTZ|NUMERIC|TEXT)\\b")
                .matcher(definition).results().map(match -> match.group(1)).collect(Collectors.toSet());
            Set<String> entityColumns = Arrays.stream(type.getRecordComponents())
                .map(component -> EntityMetadata.sqlName(component.getName())).collect(Collectors.toSet());
            assertEquals(sqlColumns, entityColumns, table + " has missing or extra columns");

            for (var component : type.getRecordComponents()) {
                String column = EntityMetadata.sqlName(component.getName());
                Matcher match = Pattern.compile("(?m)^    " + column + "\\s+(BIGINT|SMALLINT|VARCHAR|DATE|TIMESTAMPTZ|NUMERIC|TEXT)\\b([^\\r\\n]*)")
                    .matcher(definition);
                assertTrue(match.find(), table + "." + column);
                Class<?> expected = switch (match.group(1)) {
                    case "BIGINT" -> Long.class;
                    case "SMALLINT" -> Integer.class;
                    case "DATE" -> LocalDate.class;
                    case "TIMESTAMPTZ" -> OffsetDateTime.class;
                    case "NUMERIC" -> BigDecimal.class;
                    default -> String.class;
                };
                assertEquals(expected, component.getType(), table + "." + column);
                SqlColumn mapping = component.getAnnotation(SqlColumn.class);
                assertTrue(mapping != null, table + "." + column + " needs @SqlColumn");
                if (mapping.writable()) assertEquals(match.group(2).contains("NOT NULL"), mapping.required());
            }

            ResultSet rs = mock(ResultSet.class);
            when(rs.getObject(anyString())).thenAnswer(invocation -> {
                String name = invocation.getArgument(0);
                var component = Arrays.stream(type.getRecordComponents())
                    .filter(field -> EntityMetadata.sqlName(field.getName()).equals(name)).findFirst().orElseThrow();
                return sample(component.getType());
            });
            Object entity = metadata.fromRow(rs);
            assertEquals(1L, type.getMethod("id").invoke(entity));
        }
    }

    private static Object sample(Class<?> type) {
        if (type == Long.class) return 1L;
        if (type == Integer.class) return (short) 1;
        if (type == LocalDate.class) return Date.valueOf("2026-09-01");
        if (type == OffsetDateTime.class) return Timestamp.from(Instant.parse("2026-11-01T02:00:00Z"));
        if (type == BigDecimal.class) return new BigDecimal("2.50");
        return "ACTIVE";
    }
}
