package vn.edu.tass.backend.model;

import vn.edu.tass.backend.model.ResourceCatalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

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
        String schema = Files.readString(Path.of("sql", "01_schema.sql"));

        EXPECTED.forEach((name, table) -> {
            ResourceCatalog.Resource resource = ResourceCatalog.get(name);
            assertEquals(table, resource.table());
            int start = schema.indexOf("CREATE TABLE " + table + " (");
            assertTrue(start >= 0, "Thiếu bảng " + table);
            int end = schema.indexOf("\n);", start);
            assertTrue(end > start, "Không tìm thấy kết thúc bảng " + table);
            String definition = schema.substring(start, end);

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
