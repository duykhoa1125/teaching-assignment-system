package vn.edu.tass.backend.repository.support;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

public abstract class JdbcCrudRepository<E> {
    private final NamedParameterJdbcTemplate jdbc;
    private final EntityMetadata<E> metadata;

    protected JdbcCrudRepository(NamedParameterJdbcTemplate jdbc, Class<E> type) {
        this.jdbc = jdbc;
        this.metadata = new EntityMetadata<>(type);
    }

    public EntityMetadata<E> metadata() { return metadata; }

    public List<E> list(int limit, int offset) {
        return jdbc.query("SELECT * FROM " + metadata.table() + " ORDER BY id LIMIT :limit OFFSET :offset",
            new MapSqlParameterSource().addValue("limit", limit).addValue("offset", offset),
            (rs, rowNum) -> metadata.fromRow(rs));
    }

    public Optional<E> get(long id) {
        return jdbc.query("SELECT * FROM " + metadata.table() + " WHERE id = :id",
            new MapSqlParameterSource("id", id), (rs, rowNum) -> metadata.fromRow(rs)).stream().findFirst();
    }

    public E create(Map<String, Object> fields) {
        String columns = fields.keySet().stream().collect(Collectors.joining(", "));
        String values = fields.keySet().stream().map(key -> ":" + key).collect(Collectors.joining(", "));
        return jdbc.query("INSERT INTO " + metadata.table() + " (" + columns + ") VALUES (" + values + ") RETURNING *",
            new MapSqlParameterSource().addValues(fields), (rs, rowNum) -> metadata.fromRow(rs)).get(0);
    }

    public Optional<E> replace(long id, Map<String, Object> fields) {
        String assignments = metadata.writableColumns().stream()
            .map(column -> column + " = :" + column).collect(Collectors.joining(", "));
        if (metadata.hasColumn("updatedAt")) assignments += ", updated_at = CURRENT_TIMESTAMP";
        return jdbc.query("UPDATE " + metadata.table() + " SET " + assignments + " WHERE id = :id RETURNING *",
            new MapSqlParameterSource().addValues(fields).addValue("id", id),
            (rs, rowNum) -> metadata.fromRow(rs)).stream().findFirst();
    }

    public int delete(long id) {
        return jdbc.update("DELETE FROM " + metadata.table() + " WHERE id = :id", new MapSqlParameterSource("id", id));
    }
}
