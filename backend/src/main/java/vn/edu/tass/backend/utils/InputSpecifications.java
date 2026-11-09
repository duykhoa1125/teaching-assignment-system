package vn.edu.tass.backend.utils;

import java.time.LocalDate;
import org.springframework.data.jpa.domain.Specification;
import vn.edu.tass.backend.exception.BadRequestException;

public final class InputSpecifications {
    private InputSpecifications() {}

    public static void requirePositive(Long value, String name) {
        if (value != null && value < 1) {
            throw new BadRequestException(name + " must be positive");
        }
    }

    public static String optionalText(String value, String name) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.isEmpty()) throw new BadRequestException(name + " must not be blank");
        return trimmed;
    }

    public static <T> Specification<T> equal(String field, Object value) {
        return value == null ? null : (root, query, cb) -> cb.equal(root.get(field), value);
    }

    public static <T> Specification<T> containsIgnoreCase(String field, String value) {
        if (value == null) return null;
        String escaped = value.toLowerCase(java.util.Locale.ROOT)
            .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return (root, query, cb) -> cb.like(cb.lower(root.get(field)), "%" + escaped + "%", '\\');
    }

    public static <T> Specification<T> activeOn(String from, String to, LocalDate date) {
        if (date == null) return null;
        return (root, query, cb) -> cb.and(
            cb.lessThanOrEqualTo(root.get(from), date),
            cb.or(cb.isNull(root.get(to)), cb.greaterThanOrEqualTo(root.get(to), date)));
    }
}
