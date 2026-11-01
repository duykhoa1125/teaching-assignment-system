package vn.edu.tass.backend.model;

import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import vn.edu.tass.backend.entity.SqlColumn;
import vn.edu.tass.backend.entity.SqlTable;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.entity.AcademicYear;
import vn.edu.tass.backend.entity.AssignmentRound;
import vn.edu.tass.backend.entity.ClassSubjectApplicability;
import vn.edu.tass.backend.entity.Department;
import vn.edu.tass.backend.entity.EducationLevel;
import vn.edu.tass.backend.entity.Grade;
import vn.edu.tass.backend.entity.School;
import vn.edu.tass.backend.entity.SchoolClass;
import vn.edu.tass.backend.entity.Semester;
import vn.edu.tass.backend.entity.Subject;
import vn.edu.tass.backend.entity.Teacher;
import vn.edu.tass.backend.entity.TeacherEmployment;
import vn.edu.tass.backend.entity.TeachingDemand;
import vn.edu.tass.backend.entity.TeachingExperience;
import vn.edu.tass.backend.entity.TeachingQualification;
import vn.edu.tass.backend.entity.RoundSubjectScope;

public final class ResourceCatalog {
    public enum Kind {
        TEXT, LONG, INT, DATE, TIMESTAMP, DECIMAL;

        public Object convert(Object value, String field) {
            if (value == null) return null;
            try {
                return switch (this) {
                    case TEXT -> {
                        if (!(value instanceof String text) || text.isBlank()) throw new IllegalArgumentException();
                        yield text;
                    }
                    case LONG -> {
                        if (!(value instanceof Number number)) throw new IllegalArgumentException();
                        yield new BigDecimal(number.toString()).longValueExact();
                    }
                    case INT -> {
                        if (!(value instanceof Number number)) throw new IllegalArgumentException();
                        yield new BigDecimal(number.toString()).intValueExact();
                    }
                    case DATE -> {
                        if (!(value instanceof String text)) throw new IllegalArgumentException();
                        yield Date.valueOf(LocalDate.parse(text));
                    }
                    case TIMESTAMP -> {
                        if (!(value instanceof String text)) throw new IllegalArgumentException();
                        yield OffsetDateTime.parse(text);
                    }
                    case DECIMAL -> {
                        if (!(value instanceof Number number)) throw new IllegalArgumentException();
                        yield new BigDecimal(number.toString());
                    }
                };
            } catch (IllegalArgumentException | DateTimeParseException e) {
                throw new BadRequestException("Giá trị không hợp lệ cho " + field);
            }
        }

        private static Kind of(Class<?> type) {
            if (type == String.class) return TEXT;
            if (type == Long.class) return LONG;
            if (type == Integer.class) return INT;
            if (type == LocalDate.class) return DATE;
            if (type == OffsetDateTime.class) return TIMESTAMP;
            if (type == BigDecimal.class) return DECIMAL;
            throw new IllegalArgumentException("Unsupported entity field type: " + type);
        }
    }

    public record Field(Kind kind, boolean required) {}
    public record Resource(String table, Class<?> entityType, Map<String, Field> fields) {}

    private static final Map<String, Resource> RESOURCES = Map.ofEntries(
        Map.entry("schools", resource(School.class)),
        Map.entry("academic-years", resource(AcademicYear.class)),
        Map.entry("semesters", resource(Semester.class)),
        Map.entry("education-levels", resource(EducationLevel.class)),
        Map.entry("grades", resource(Grade.class)),
        Map.entry("classes", resource(SchoolClass.class)),
        Map.entry("subjects", resource(Subject.class)),
        Map.entry("teachers", resource(Teacher.class)),
        Map.entry("teaching-demands", resource(TeachingDemand.class)),
        Map.entry("departments", resource(Department.class)),
        Map.entry("teacher-employments", resource(TeacherEmployment.class)),
        Map.entry("teaching-qualifications", resource(TeachingQualification.class)),
        Map.entry("teaching-experiences", resource(TeachingExperience.class)),
        Map.entry("assignment-rounds", resource(AssignmentRound.class)),
        Map.entry("round-subject-scopes", resource(RoundSubjectScope.class)),
        Map.entry("class-subject-applicabilities", resource(ClassSubjectApplicability.class))
    );

    public static Resource get(String name) {
        Resource resource = RESOURCES.get(name);
        if (resource == null) throw new NotFoundException("Không có tài nguyên: " + name);
        return resource;
    }

    public static Set<String> names() { return RESOURCES.keySet(); }

    private static Resource resource(Class<?> entityType) {
        SqlTable table = entityType.getAnnotation(SqlTable.class);
        if (table == null || !entityType.isRecord()) throw new IllegalArgumentException("Invalid SQL entity: " + entityType);
        Map<String, Field> fields = new LinkedHashMap<>();
        for (RecordComponent component : entityType.getRecordComponents()) {
            SqlColumn column = component.getAnnotation(SqlColumn.class);
            if (column == null) throw new IllegalArgumentException("Missing @SqlColumn: " + entityType + "." + component.getName());
            if (column.writable()) {
                fields.put(snakeCase(component.getName()), new Field(Kind.of(component.getType()), column.required()));
            }
        }
        return new Resource(table.value(), entityType, Map.copyOf(fields));
    }

    private static String snakeCase(String name) {
        return name.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(java.util.Locale.ROOT);
    }

    private ResourceCatalog() {}
}
