package vn.edu.tass.backend.entity;

import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.Pattern;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.junit.jupiter.api.Test;

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
        Map.entry(ClassSubjectApplicability.class, "class_subject_applicability"),
        Map.entry(RequiredDemandComponent.class, "required_demand_component"),
        Map.entry(TeacherWorkloadBasis.class, "teacher_workload_basis"),
        Map.entry(TeachingHistory.class, "teaching_history"),
        Map.entry(TeacherDuty.class, "teacher_duty")
    );

    @Test
    void jpaEntitiesMatchSqlColumns() throws Exception {
        assertEquals(20, TABLES.size());
        String schema = Files.readString(Path.of("sql", "01_schema.sql"));
        for (var entry : TABLES.entrySet()) {
            Class<?> type = entry.getKey();
            String table = entry.getValue();
            assertTrue(type.isAnnotationPresent(Entity.class));
            assertEquals(table, type.getAnnotation(Table.class).name());
            int start = schema.indexOf("CREATE TABLE " + table + " (");
            assertTrue(start >= 0, table);
            int end = schema.indexOf("\n);", start);
            assertTrue(end > start, table);
            String definition = schema.substring(start, end);
            Set<String> sqlColumns = Pattern.compile("(?m)^    ([a-z_]+)\\s+(?:BIGINT|SMALLINT|VARCHAR|DATE|TIMESTAMPTZ|NUMERIC|TEXT)\\b")
                .matcher(definition).results().map(m -> m.group(1)).collect(Collectors.toSet());
            Set<String> entityColumns = Arrays.stream(type.getDeclaredFields())
                .map(f -> f.getAnnotation(Column.class).name()).collect(Collectors.toSet());
            assertEquals(sqlColumns, entityColumns, table);
            Field id = type.getDeclaredField("id");
            assertTrue(id.isAnnotationPresent(Id.class));
            assertNotNull(type.getDeclaredConstructor());
            for (Field field : type.getDeclaredFields()) {
                Column mapping = field.getAnnotation(Column.class);
                assertNotNull(mapping);
                String column = mapping.name();
                var matcher = Pattern.compile("(?m)^    " + column + "\\s+[^\\r\\n]+").matcher(definition);
                assertTrue(matcher.find(), table + "." + column);
                if (!column.equals("id")) {
                    assertEquals(matcher.group().contains("NOT NULL"), !mapping.nullable(), table + "." + column);
                }
            }
        }
    }
}
