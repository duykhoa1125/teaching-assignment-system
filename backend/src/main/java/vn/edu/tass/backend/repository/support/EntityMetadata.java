package vn.edu.tass.backend.repository.support;

import java.lang.reflect.Constructor;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import vn.edu.tass.backend.entity.SqlColumn;
import vn.edu.tass.backend.entity.SqlTable;
import vn.edu.tass.backend.exception.BadRequestException;

/** JDBC mapping shared by the entity-specific repositories. */
public final class EntityMetadata<E> {
    private final Class<E> type;
    private final String table;
    private final RecordComponent[] components;
    private final Constructor<E> constructor;
    private final List<String> writableColumns;

    public EntityMetadata(Class<E> type) {
        SqlTable mapping = type.getAnnotation(SqlTable.class);
        if (mapping == null || !type.isRecord()) throw new IllegalArgumentException("Invalid SQL entity: " + type);
        this.type = type;
        this.table = mapping.value();
        this.components = type.getRecordComponents();
        try {
            Class<?>[] parameters = java.util.Arrays.stream(components).map(RecordComponent::getType).toArray(Class<?>[]::new);
            this.constructor = type.getDeclaredConstructor(parameters);
        } catch (NoSuchMethodException e) {
            throw new IllegalArgumentException("Missing record constructor: " + type, e);
        }
        this.writableColumns = java.util.Arrays.stream(components)
            .filter(component -> column(component).writable())
            .map(component -> sqlName(component.getName())).toList();
    }

    public Class<E> type() { return type; }
    public String table() { return table; }
    public List<String> writableColumns() { return writableColumns; }
    public boolean hasColumn(String name) {
        return java.util.Arrays.stream(components).anyMatch(component -> component.getName().equals(name));
    }

    public Map<String, Object> requestValues(Object request) {
        if (request == null) throw new BadRequestException("Body JSON không được rỗng");
        Map<String, Object> values = new LinkedHashMap<>();
        for (RecordComponent entityField : components) {
            SqlColumn column = column(entityField);
            if (!column.writable()) continue;
            Object value;
            try {
                RecordComponent requestField = java.util.Arrays.stream(request.getClass().getRecordComponents())
                    .filter(component -> component.getName().equals(entityField.getName())).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Missing request field " + entityField.getName()));
                value = requestField.getAccessor().invoke(request);
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException("Cannot read request field " + entityField.getName(), e);
            }
            String name = sqlName(entityField.getName());
            if (column.required() && value == null) throw new BadRequestException("Thiếu trường bắt buộc: " + name);
            if (value instanceof String text && text.isBlank()) throw new BadRequestException("Giá trị không hợp lệ cho " + name);
            values.put(name, value instanceof LocalDate date ? Date.valueOf(date) : value);
        }
        return values;
    }

    public E fromRow(ResultSet rs) throws SQLException {
        Object[] values = new Object[components.length];
        for (int i = 0; i < components.length; i++) {
            Object value = rs.getObject(sqlName(components[i].getName()));
            if (value instanceof Date date) value = date.toLocalDate();
            else if (value instanceof Timestamp timestamp) value = timestamp.toInstant().atOffset(ZoneOffset.UTC);
            if (value != null && components[i].getType() == Long.class && value instanceof Number number) value = number.longValue();
            if (value != null && components[i].getType() == Integer.class && value instanceof Number number) value = number.intValue();
            if (value != null && components[i].getType() == BigDecimal.class && value instanceof Number number
                    && !(value instanceof BigDecimal)) value = new BigDecimal(number.toString());
            if (value != null && components[i].getType() == OffsetDateTime.class && value instanceof java.time.Instant instant)
                value = instant.atOffset(ZoneOffset.UTC);
            values[i] = value;
        }
        try {
            return constructor.newInstance(values);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Cannot map row to " + type.getSimpleName(), e);
        }
    }

    public static String sqlName(String camelCase) {
        return camelCase.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(java.util.Locale.ROOT);
    }

    private static SqlColumn column(RecordComponent component) {
        SqlColumn annotation = component.getAnnotation(SqlColumn.class);
        if (annotation == null) throw new IllegalArgumentException("Missing @SqlColumn: " + component);
        return annotation;
    }
}
