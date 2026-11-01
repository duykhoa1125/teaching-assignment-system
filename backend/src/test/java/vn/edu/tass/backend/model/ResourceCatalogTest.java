package vn.edu.tass.backend.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

import vn.edu.tass.backend.entity.SqlColumn;
import vn.edu.tass.backend.entity.SqlTable;

class ResourceCatalogTest {
    private static final Map<String, String> EXPECTED = Map.ofEntries(
        Map.entry("schools", "school"),
        Map.entry("academic-years", "academic_year"),
        Map.entry("semesters", "semester"),
        Map.entry("education-levels", "education_level"),
        Map.entry("grades", "grade"),
        Map.entry("classes", "school_class"),
        Map.entry("subjects", "subject"),
        Map.entry("teachers", "teacher"),
        Map.entry("teaching-demands", "teaching_demand"),
        Map.entry("departments", "department"),
        Map.entry("teacher-employments", "teacher_employment"),
        Map.entry("teaching-qualifications", "teaching_qualification"),
        Map.entry("teaching-experiences", "teaching_experience"),
        Map.entry("assignment-rounds", "assignment_round"),
        Map.entry("round-subject-scopes", "round_subject_scope"),
        Map.entry("class-subject-applicabilities", "class_subject_applicability")
    );

    @Test
    void exposesExactlyTheSixteenRequestedResourcesAndMatchesSchema() throws IOException {
        assertEquals(16, ResourceCatalog.names().size());
        assertEquals(EXPECTED.keySet(), ResourceCatalog.names());
        assertEquals(16, ResourceCatalog.names().stream()
            .map(name -> ResourceCatalog.get(name).entityType()).collect(Collectors.toSet()).size());
        String schema = Files.readString(Path.of("sql", "01_schema.sql"));

        EXPECTED.forEach((name, table) -> {
            ResourceCatalog.Resource resource = ResourceCatalog.get(name);
            assertEquals(table, resource.table());
            assertTrue(resource.entityType().isRecord());
            assertEquals(table, resource.entityType().getAnnotation(SqlTable.class).value());
            int start = schema.indexOf("CREATE TABLE " + table + " (");
            assertTrue(start >= 0, "Thiếu bảng " + table);
            int end = schema.indexOf("\n);", start);
            assertTrue(end > start, "Không tìm thấy kết thúc bảng " + table);
            String definition = schema.substring(start, end);

            Set<String> schemaColumns = Pattern.compile("(?m)^    ([a-z_]+)\\s+(?:BIGINT|SMALLINT|VARCHAR|DATE|TIMESTAMPTZ|NUMERIC|TEXT)\\b")
                .matcher(definition).results().map(match -> match.group(1)).collect(Collectors.toSet());
            Set<String> entityColumns = Arrays.stream(resource.entityType().getRecordComponents())
                .map(RecordComponent::getName)
                .map(column -> column.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(java.util.Locale.ROOT))
                .collect(Collectors.toSet());
            assertEquals(schemaColumns, entityColumns, table + " có entity thiếu hoặc thừa cột");

            Set<String> writableColumns = Arrays.stream(resource.entityType().getRecordComponents())
                .filter(component -> component.getAnnotation(SqlColumn.class).writable())
                .map(RecordComponent::getName)
                .map(column -> column.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(java.util.Locale.ROOT))
                .collect(Collectors.toSet());
            assertEquals(writableColumns, resource.fields().keySet());

            for (RecordComponent component : resource.entityType().getRecordComponents()) {
                String column = component.getName().replaceAll("([a-z0-9])([A-Z])", "$1_$2")
                    .toLowerCase(java.util.Locale.ROOT);
                Matcher sqlType = Pattern.compile("(?m)^    " + column + "\\s+(BIGINT|SMALLINT|VARCHAR|DATE|TIMESTAMPTZ|NUMERIC|TEXT)\\b")
                    .matcher(definition);
                assertTrue(sqlType.find(), table + "." + column + " không có trong schema");
                Class<?> expectedType = switch (sqlType.group(1)) {
                    case "BIGINT" -> Long.class;
                    case "SMALLINT" -> Integer.class;
                    case "DATE" -> LocalDate.class;
                    case "TIMESTAMPTZ" -> OffsetDateTime.class;
                    case "NUMERIC" -> BigDecimal.class;
                    default -> String.class;
                };
                assertEquals(expectedType, component.getType(), table + "." + column + " có kiểu Java sai");
            }

            resource.fields().forEach((column, field) -> {
                Matcher match = Pattern.compile("(?m)^    " + Pattern.quote(column) + "\\s+([^\\r\\n]+)")
                    .matcher(definition);
                assertTrue(match.find(), table + "." + column + " không có trong schema");
                assertEquals(match.group(1).contains("NOT NULL"), field.required(),
                    table + "." + column + " có khai báo nullable sai");
            });
        });
    }
}
