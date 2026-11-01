package vn.edu.tass.backend.model;

import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.exception.NotFoundException;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

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
    }

    public record Field(Kind kind, boolean required) {}
    public record Resource(String table, Map<String, Field> fields) {}

    private static final Map<String, Resource> RESOURCES = Map.ofEntries(
        Map.entry("schools", resource("school", "school_code", "name", "status")),
        Map.entry("academic-years", resource("academic_year", "school_id", "year_code", "starts_on", "ends_on")),
        Map.entry("semesters", resource("semester", "academic_year_id", "semester_no", "starts_on", "ends_on")),
        Map.entry("education-levels", resource("education_level", "level_code", "name")),
        Map.entry("grades", resource("grade", "education_level_id", "grade_code", "name")),
        Map.entry("classes", resource("school_class", "academic_year_id", "grade_id", "class_code", "status")),
        Map.entry("subjects", resource("subject", "subject_code", "name", "valid_from", "?valid_to")),
        Map.entry("teachers", resource("teacher", "school_id", "teacher_code", "full_name")),
        Map.entry("teaching-demands", resource("teaching_demand", "semester_id", "class_id", "subject_id", "periods_per_week", "status", "updated_by", "demand_type")),
        Map.entry("departments", resource("department", "school_id", "department_code", "name", "valid_from", "?valid_to")),
        Map.entry("teacher-employments", resource("teacher_employment", "teacher_id", "department_id", "semester_id", "employment_status", "position_code", "valid_from", "?valid_to")),
        Map.entry("teaching-qualifications", resource("teaching_qualification", "teacher_id", "subject_id", "education_level_id", "verification_status", "?verified_by", "?verified_at", "?evidence_ref", "valid_from", "?valid_to")),
        Map.entry("teaching-experiences", resource("teaching_experience", "teacher_id", "subject_id", "?grade_id", "experience_level", "experience_period", "recorded_by")),
        Map.entry("assignment-rounds", resource("assignment_round", "semester_id", "round_code", "status", "?scope_confirmed_by", "?scope_confirmed_at", "?opens_at", "?closes_at")),
        Map.entry("round-subject-scopes", resource("round_subject_scope", "round_id", "grade_id", "subject_id", "?confirmed_by", "?confirmed_at")),
        Map.entry("class-subject-applicabilities", resource("class_subject_applicability", "scope_id", "class_id", "status", "?reason", "updated_by"))
    );

    public static Resource get(String name) {
        Resource resource = RESOURCES.get(name);
        if (resource == null) throw new NotFoundException("Không có tài nguyên: " + name);
        return resource;
    }

    public static Set<String> names() { return RESOURCES.keySet(); }

    private static Resource resource(String table, String... columns) {
        Map<String, Field> fields = new LinkedHashMap<>();
        Arrays.stream(columns).forEach(spec -> {
            boolean optional = spec.startsWith("?");
            String name = optional ? spec.substring(1) : spec;
            Kind kind = switch (name) {
                case "school_id", "academic_year_id", "education_level_id", "grade_id", "semester_id", "class_id", "subject_id", "updated_by",
                     "teacher_id", "department_id", "verified_by", "recorded_by", "scope_confirmed_by", "round_id", "confirmed_by", "scope_id" -> Kind.LONG;
                case "semester_no" -> Kind.INT;
                case "starts_on", "ends_on", "valid_from", "valid_to" -> Kind.DATE;
                case "verified_at", "scope_confirmed_at", "opens_at", "closes_at", "confirmed_at" -> Kind.TIMESTAMP;
                case "periods_per_week" -> Kind.DECIMAL;
                default -> Kind.TEXT;
            };
            fields.put(name, new Field(kind, !optional));
        });
        return new Resource(table, Map.copyOf(fields));
    }

    private ResourceCatalog() {}
}
