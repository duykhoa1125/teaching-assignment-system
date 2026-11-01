package vn.edu.tass.backend.repository;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.model.ResourceCatalog.Resource;

@Repository
public class CrudRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public CrudRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> list(Resource resource, int limit, int offset) {
        return rows("SELECT * FROM " + resource.table() + " ORDER BY id LIMIT :limit OFFSET :offset",
            new MapSqlParameterSource().addValue("limit", limit).addValue("offset", offset));
    }

    public Optional<Map<String, Object>> get(Resource resource, long id) {
        return rows("SELECT * FROM " + resource.table() + " WHERE id = :id",
            new MapSqlParameterSource("id", id)).stream().findFirst();
    }

    public Map<String, Object> create(Resource resource, Map<String, Object> fields) {
        String columns = fields.keySet().stream().collect(Collectors.joining(", "));
        String values = fields.keySet().stream().map(key -> ":" + key).collect(Collectors.joining(", "));
        return rows("INSERT INTO " + resource.table() + " (" + columns + ") VALUES (" + values + ") RETURNING *",
            params(fields)).get(0);
    }

    public Optional<Map<String, Object>> replace(Resource resource, long id, Map<String, Object> fields) {
        List<String> assignments = new ArrayList<>();
        resource.fields().keySet().forEach(column -> assignments.add(column + " = :" + column));
        if (resource.table().equals("teaching_demand") || resource.table().equals("class_subject_applicability")) {
            assignments.add("updated_at = CURRENT_TIMESTAMP");
        }
        return rows("UPDATE " + resource.table() + " SET " + String.join(", ", assignments) + " WHERE id = :id RETURNING *",
            params(fields).addValue("id", id)).stream().findFirst();
    }

    public int delete(Resource resource, long id) {
        return jdbc.update("DELETE FROM " + resource.table() + " WHERE id = :id", new MapSqlParameterSource("id", id));
    }

    private static MapSqlParameterSource params(Map<String, Object> fields) {
        return new MapSqlParameterSource().addValues(fields);
    }

    private List<Map<String, Object>> rows(String sql, MapSqlParameterSource params) {
        return jdbc.query(sql, params, (rs, rowNum) -> row(rs));
    }

    private static Map<String, Object> row(ResultSet rs) throws SQLException {
        ResultSetMetaData meta = rs.getMetaData();
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 1; i <= meta.getColumnCount(); i++) {
            Object value = rs.getObject(i);
            if (value instanceof Date date) value = date.toLocalDate();
            else if (value instanceof Timestamp timestamp) value = timestamp.toInstant();
            result.put(meta.getColumnLabel(i), value);
        }
        return result;
    }
}
