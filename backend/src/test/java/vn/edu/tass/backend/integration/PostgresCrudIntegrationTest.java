package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Stream;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Run with: mvn test -Ddb.integration=true (requires the seeded PostgreSQL from compose.yaml). */
@EnabledIfSystemProperty(named = "db.integration", matches = "true")
@SpringBootTest
@AutoConfigureMockMvc
class PostgresCrudIntegrationTest {
    @Autowired MockMvc mvc;
    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();
    private static final List<String> RESOURCES = List.of(
        "schools", "academic-years", "semesters", "education-levels", "grades", "classes",
        "subjects", "teachers", "teaching-demands", "departments", "teacher-employments",
        "teaching-qualifications", "teaching-experiences", "assignment-rounds", "round-subject-scopes",
        "class-subject-applicabilities", "required-demand-components",
        "teacher-workload-bases", "teaching-histories", "teacher-duties"
    );

    @ParameterizedTest(name = "{0}")
    @MethodSource("resources")
    @Transactional
    void createReadListUpdateAndDeleteAgainstPostgres(String resource) throws Exception {
        Map<String, Object> body = new HashMap<>(body(resource));
        Object created = create(resource, body);
        long id = ((Number) value(created, "id")).longValue();
        if (resource.equals("assignment-rounds")) {
            assertNotNull(value(created, "sourceRevisionToken"));
            assertNotNull(value(created, "sourceUpdatedAt"));
        }

        assertEquals(id, ((Number) value(fetchOne(resource, id), "id")).longValue());
        assertTrue(list(resource).stream()
            .anyMatch(row -> ((Number) value(row, "id")).longValue() == id));

        Map.Entry<String, Object> change = update(resource);
        body.put(change.getKey(), change.getValue());
        Object updated = replace(resource, id, body);
        Object expected = change.getValue();
        Object actual = value(updated, camelCase(change.getKey()));
        if (expected instanceof Number) {
            assertEquals(0, new BigDecimal(expected.toString())
                .compareTo(new BigDecimal(actual.toString())));
        } else if (actual instanceof LocalDate) {
            assertEquals(LocalDate.parse(expected.toString()), actual);
        } else {
            assertEquals(expected, actual);
        }
        if (resource.equals("assignment-rounds")) {
            assertNotEquals(value(created, "sourceRevisionToken"), value(updated, "sourceRevisionToken"));
        }

        mvc.perform(delete("/api/" + resource + "/" + id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/" + resource + "/" + id)).andExpect(status().isNotFound());
    }

    private static Stream<String> resources() { return RESOURCES.stream(); }

    private Map<String, Object> create(String resource, Map<String, Object> body) throws Exception {
        String response = mvc.perform(post("/api/" + resource)
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsBytes(body)))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JSON.readValue(response, new TypeReference<>() {});
    }

    private Map<String, Object> replace(String resource, long id, Map<String, Object> body) throws Exception {
        String response = mvc.perform(put("/api/" + resource + "/" + id)
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsBytes(body)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JSON.readValue(response, new TypeReference<>() {});
    }

    private Map<String, Object> fetchOne(String resource, long id) throws Exception {
        String response = mvc.perform(get("/api/" + resource + "/" + id))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JSON.readValue(response, new TypeReference<>() {});
    }

    private List<Map<String, Object>> list(String resource) throws Exception {
        String response = mvc.perform(get("/api/" + resource).param("limit", "100"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JSON.readValue(response, new TypeReference<>() {});
    }

    private static Object value(Object entity, String field) {
        String key = field.replaceAll("([A-Z])", "_$1").toLowerCase(Locale.ROOT);
        return ((Map<?, ?>) entity).get(key);
    }

    private static String camelCase(String sqlName) {
        String[] parts = sqlName.split("_");
        StringBuilder result = new StringBuilder(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            result.append(Character.toUpperCase(parts[i].charAt(0))).append(parts[i].substring(1));
        }
        return result.toString();
    }

    private Map<String, Object> body(String resource) throws Exception {
        return switch (resource) {
            case "schools" -> Map.of("school_code", "TEST_SCHOOL", "name", "Test School", "status", "ACTIVE");
            case "academic-years" -> Map.of("school_id", 1, "year_code", "TEST_YEAR", "starts_on", "2099-08-01", "ends_on", "2100-07-31");
            case "semesters" -> Map.of("academic_year_id", 1, "semester_no", 3, "starts_on", "2027-01-01", "ends_on", "2027-05-31");
            case "education-levels" -> Map.of("level_code", "TEST_LEVEL", "name", "Test Level");
            case "grades" -> Map.of("education_level_id", 1, "grade_code", "TEST_GRADE", "name", "Test Grade");
            case "classes" -> Map.of("academic_year_id", 1, "grade_id", 1, "class_code", "TEST_CLASS", "status", "ACTIVE");
            case "subjects" -> Map.of("subject_code", "TEST_SUBJECT", "name", "Test Subject", "valid_from", "2026-08-01");
            case "teachers" -> Map.of("school_id", 1, "teacher_code", "TEST_TEACHER", "full_name", "Test Teacher");
            case "teaching-demands" -> {
                long classId = ((Number) value(create("classes", Map.of("academic_year_id", 1,
                    "grade_id", 1, "class_code", "TEST_DEMAND_CLASS", "status", "ACTIVE")), "id")).longValue();
                yield Map.of("semester_id", 1, "class_id", classId, "subject_id", 1,
                    "periods_per_week", 1.25, "status", "ACTIVE", "updated_by", 1, "demand_type", "STANDARD",
                    "valid_from", "2026-09-01", "valid_to", "2026-12-31", "unit", "PERIOD_PER_WEEK");
            }
            case "departments" -> Map.of("school_id", 1, "department_code", "TEST_DEP", "name", "Test Department", "valid_from", "2026-08-01");
            case "teacher-employments" -> {
                long teacherId = ((Number) value(create("teachers", Map.of("school_id", 1,
                    "teacher_code", "TEST_EMPLOYMENT_TEACHER", "full_name", "Test Employment Teacher")), "id")).longValue();
                yield Map.of("teacher_id", teacherId, "department_id", 1, "semester_id", 1,
                    "employment_status", "TEACHING", "position_code", "TEST_POSITION", "valid_from", "2026-09-01");
            }
            case "teaching-qualifications" -> Map.of("teacher_id", 1, "subject_id", 1, "education_level_id", 1,
                "verification_status", "PENDING", "valid_from", "2026-08-01");
            case "teaching-experiences" -> Map.of("teacher_id", 1, "subject_id", 1, "grade_id", 1,
                "experience_status", "UNKNOWN", "as_of_date", "2026-09-01", "recorded_by", 1);
            case "assignment-rounds" -> Map.of("semester_id", 1, "round_code", "TEST_ROUND", "status", "DRAFT");
            case "round-subject-scopes" -> Map.of("round_id", 2, "grade_id", 1, "subject_id", 1);
            case "class-subject-applicabilities" -> {
                long scopeId = ((Number) value(create("round-subject-scopes",
                    Map.of("round_id", 2, "grade_id", 1, "subject_id", 1)), "id")).longValue();
                yield Map.of("scope_id", scopeId, "class_id", 1, "status", "UNDETERMINED", "updated_by", 1);
            }
            case "required-demand-components" -> {
                long scopeId = ((Number) value(create("round-subject-scopes",
                    Map.of("round_id", 2, "grade_id", 1, "subject_id", 1)), "id")).longValue();
                long applicabilityId = ((Number) value(create("class-subject-applicabilities",
                    Map.of("scope_id", scopeId, "class_id", 1, "status", "APPLICABLE", "updated_by", 1)), "id")).longValue();
                yield Map.of("applicability_id", applicabilityId, "demand_type", "STANDARD",
                    "valid_from", "2026-09-01", "valid_to", "2026-12-31");
            }
            case "teacher-workload-bases" -> {
                long teacherId = ((Number) value(create("teachers", Map.of("school_id", 1,
                    "teacher_code", "TEST_BASIS_TEACHER", "full_name", "Test Basis Teacher")), "id")).longValue();
                yield Map.of("teacher_id", teacherId, "semester_id", 1, "education_level_id", 1,
                    "position_code", "TEACHER", "base_periods_per_week", 17,
                    "unit", "PERIOD_PER_WEEK", "valid_from", "2026-09-01",
                    "valid_to", "2026-12-31", "profile_ref", "test:basis", "verification_status", "PENDING");
            }
            case "teaching-histories" -> Map.ofEntries(
                Map.entry("teacher_id", 1), Map.entry("academic_year_id", 1),
                Map.entry("semester_id", 1), Map.entry("class_id", 1), Map.entry("subject_id", 1),
                Map.entry("taught_from", "2026-09-01"), Map.entry("taught_to", "2026-12-31"),
                Map.entry("source_kind", "EXTERNAL_RECORD"), Map.entry("evidence_ref", "test:history"),
                Map.entry("verification_status", "PENDING"), Map.entry("recorded_by", 1));
            case "teacher-duties" -> Map.of(
                "teacher_id", 2, "semester_id", 1, "rule_definition_id", 1,
                "duty_type", "HOMEROOM", "class_id", 2, "scope_description", "Test duty",
                "valid_from", "2026-09-01", "verification_status", "PENDING", "payment_status", "UNPAID");
            default -> throw new IllegalArgumentException(resource);
        };
    }

    private static Map.Entry<String, Object> update(String resource) {
        return switch (resource) {
            case "schools", "education-levels", "grades", "subjects", "departments" -> Map.entry("name", "Updated name");
            case "academic-years" -> Map.entry("year_code", "TEST_YEAR_UPDATED");
            case "semesters" -> Map.entry("semester_no", 4);
            case "classes" -> Map.entry("class_code", "TEST_CLASS_UPDATED");
            case "teachers" -> Map.entry("full_name", "Updated Teacher");
            case "teaching-demands" -> Map.entry("periods_per_week", 2.75);
            case "teacher-employments" -> Map.entry("position_code", "UPDATED_POSITION");
            case "teaching-qualifications" -> Map.entry("evidence_ref", "test:evidence");
            case "teaching-experiences" -> Map.entry("as_of_date", "2026-10-01");
            case "assignment-rounds" -> Map.entry("round_code", "TEST_ROUND_UPDATED");
            case "round-subject-scopes" -> Map.entry("confirmed_by", 1);
            case "class-subject-applicabilities" -> Map.entry("reason", "Updated reason");
            case "required-demand-components" -> Map.entry("valid_from", "2026-10-01");
            case "teacher-workload-bases" -> Map.entry("profile_ref", "test:basis:updated");
            case "teaching-histories" -> Map.entry("evidence_ref", "test:history:updated");
            case "teacher-duties" -> Map.entry("scope_description", "Updated duty");
            default -> throw new IllegalArgumentException(resource);
        };
    }
}
