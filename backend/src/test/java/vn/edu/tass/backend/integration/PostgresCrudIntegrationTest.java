package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.InvocationTargetException;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import vn.edu.tass.backend.exception.NotFoundException;

/** Run with: mvn test -Ddb.integration=true (requires the seeded PostgreSQL from compose.yaml). */
@EnabledIfSystemProperty(named = "db.integration", matches = "true")
class PostgresCrudIntegrationTest {
    private static final DriverManagerDataSource DATA_SOURCE = new DriverManagerDataSource(
        System.getenv().getOrDefault("DB_URL", "jdbc:postgresql://localhost:5432/tass"),
        System.getenv().getOrDefault("DB_USER", "tass"),
        System.getenv().getOrDefault("DB_PASSWORD", "tass_dev"));
    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();
    private static final Map<String, String> NAMES = Map.ofEntries(
        Map.entry("schools", "School"), Map.entry("academic-years", "AcademicYear"),
        Map.entry("semesters", "Semester"), Map.entry("education-levels", "EducationLevel"),
        Map.entry("grades", "Grade"), Map.entry("classes", "SchoolClass"),
        Map.entry("subjects", "Subject"), Map.entry("teachers", "Teacher"),
        Map.entry("teaching-demands", "TeachingDemand"), Map.entry("departments", "Department"),
        Map.entry("teacher-employments", "TeacherEmployment"),
        Map.entry("teaching-qualifications", "TeachingQualification"),
        Map.entry("teaching-experiences", "TeachingExperience"),
        Map.entry("assignment-rounds", "AssignmentRound"),
        Map.entry("round-subject-scopes", "RoundSubjectScope"),
        Map.entry("class-subject-applicabilities", "ClassSubjectApplicability")
    );
    private static final TransactionTemplate TRANSACTION = new TransactionTemplate(new DataSourceTransactionManager(DATA_SOURCE));

    @ParameterizedTest(name = "{0}")
    @MethodSource("resources")
    void createReadListUpdateAndDeleteAgainstPostgres(String resource) {
        TRANSACTION.execute(status -> {
            Map<String, Object> body = new HashMap<>(body(resource));
            Object created = create(resource, body);
            long id = ((Number) value(created, "id")).longValue();

            assertEquals(id, ((Number) value(get(resource, id), "id")).longValue());
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
            } else {
                assertEquals(expected, actual);
            }

            invoke(service(resource), "delete", new Class<?>[]{long.class}, id);
            assertThrows(NotFoundException.class, () -> get(resource, id));
            status.setRollbackOnly();
            return null;
        });
    }

    private static Stream<String> resources() { return NAMES.keySet().stream(); }

    private static Object create(String resource, Map<String, Object> body) {
        Class<?> requestType = requestType(resource);
        return invoke(service(resource), "create", new Class<?>[]{requestType}, JSON.convertValue(body, requestType));
    }

    private static Object replace(String resource, long id, Map<String, Object> body) {
        Class<?> requestType = requestType(resource);
        return invoke(service(resource), "replace", new Class<?>[]{long.class, requestType},
            id, JSON.convertValue(body, requestType));
    }

    private static Object get(String resource, long id) {
        return invoke(service(resource), "get", new Class<?>[]{long.class}, id);
    }

    @SuppressWarnings("unchecked")
    private static java.util.List<Object> list(String resource) {
        return (java.util.List<Object>) invoke(service(resource), "list", new Class<?>[]{int.class, int.class}, 100, 0);
    }

    private static Object service(String resource) {
        try {
            String name = NAMES.get(resource);
            Class<?> repositoryType = Class.forName("vn.edu.tass.backend.repository." + name + "Repository");
            Class<?> serviceType = Class.forName("vn.edu.tass.backend.service.impl." + name + "ServiceImpl");
            Object repository = repositoryType.getConstructor(NamedParameterJdbcTemplate.class)
                .newInstance(new NamedParameterJdbcTemplate(DATA_SOURCE));
            return serviceType.getConstructor(repositoryType).newInstance(repository);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Class<?> requestType(String resource) {
        try {
            return Class.forName("vn.edu.tass.backend.payload.request." + NAMES.get(resource) + "Request");
        } catch (ClassNotFoundException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Object invoke(Object target, String method, Class<?>[] types, Object... args) {
        try {
            return target.getClass().getMethod(method, types).invoke(target, args);
        } catch (InvocationTargetException e) {
            if (e.getCause() instanceof RuntimeException cause) throw cause;
            throw new IllegalStateException(e.getCause());
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Object value(Object entity, String field) {
        return invoke(entity, field, new Class<?>[0]);
    }

    private static String camelCase(String sqlName) {
        String[] parts = sqlName.split("_");
        StringBuilder result = new StringBuilder(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            result.append(Character.toUpperCase(parts[i].charAt(0))).append(parts[i].substring(1));
        }
        return result.toString();
    }

    private static Map<String, Object> body(String resource) {
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
                    "periods_per_week", 1.25, "status", "ACTIVE", "updated_by", 1, "demand_type", "STANDARD");
            }
            case "departments" -> Map.of("school_id", 1, "department_code", "TEST_DEP", "name", "Test Department", "valid_from", "2026-08-01");
            case "teacher-employments" -> Map.of("teacher_id", 1, "department_id", 1, "semester_id", 1,
                "employment_status", "TEACHING", "position_code", "TEST_POSITION", "valid_from", "2026-09-01");
            case "teaching-qualifications" -> Map.of("teacher_id", 1, "subject_id", 1, "education_level_id", 1,
                "verification_status", "PENDING", "valid_from", "2026-08-01");
            case "teaching-experiences" -> Map.of("teacher_id", 1, "subject_id", 1,
                "experience_level", "TEST", "experience_period", "Test period", "recorded_by", 1);
            case "assignment-rounds" -> Map.of("semester_id", 1, "round_code", "TEST_ROUND", "status", "DRAFT");
            case "round-subject-scopes" -> Map.of("round_id", 2, "grade_id", 1, "subject_id", 1);
            case "class-subject-applicabilities" -> {
                long scopeId = ((Number) value(create("round-subject-scopes",
                    Map.of("round_id", 2, "grade_id", 1, "subject_id", 1)), "id")).longValue();
                yield Map.of("scope_id", scopeId, "class_id", 1, "status", "UNDETERMINED", "updated_by", 1);
            }
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
            case "teaching-experiences" -> Map.entry("experience_level", "UPDATED");
            case "assignment-rounds" -> Map.entry("round_code", "TEST_ROUND_UPDATED");
            case "round-subject-scopes" -> Map.entry("confirmed_by", 1);
            case "class-subject-applicabilities" -> Map.entry("status", "NOT_APPLICABLE");
            default -> throw new IllegalArgumentException(resource);
        };
    }
}
