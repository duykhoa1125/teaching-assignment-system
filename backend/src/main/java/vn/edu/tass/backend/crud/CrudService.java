package vn.edu.tass.backend.crud;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CrudService {
    private final NamedParameterJdbcTemplate jdbc;

    public CrudService(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(String name, int limit, int offset) {
        ResourceCatalog.Resource resource = ResourceCatalog.get(name);
        if (limit < 1 || limit > 100 || offset < 0) {
            throw new BadRequestException("limit phải từ 1 đến 100 và offset phải >= 0");
        }
        return rows("SELECT * FROM " + resource.table() + " ORDER BY id LIMIT :limit OFFSET :offset",
            new MapSqlParameterSource().addValue("limit", limit).addValue("offset", offset));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get(String name, long id) {
        ResourceCatalog.Resource resource = ResourceCatalog.get(name);
        requireId(id);
        List<Map<String, Object>> found = rows("SELECT * FROM " + resource.table() + " WHERE id = :id",
            new MapSqlParameterSource("id", id));
        if (found.isEmpty()) throw new NotFoundException("Không tìm thấy " + name + " với id=" + id);
        return found.get(0);
    }

    @Transactional
    public Map<String, Object> create(String name, Map<String, Object> body) {
        ResourceCatalog.Resource resource = ResourceCatalog.get(name);
        MapSqlParameterSource params = validate(resource, body, false);
        String columns = body.keySet().stream().collect(Collectors.joining(", "));
        String values = body.keySet().stream().map(key -> ":" + key).collect(Collectors.joining(", "));
        List<Map<String, Object>> created = rows("INSERT INTO " + resource.table() + " (" + columns + ") VALUES (" + values + ") RETURNING *", params);
        return created.get(0);
    }

    @Transactional
    public Map<String, Object> replace(String name, long id, Map<String, Object> body) {
        ResourceCatalog.Resource resource = ResourceCatalog.get(name);
        requireId(id);
        MapSqlParameterSource params = validate(resource, body, true).addValue("id", id);
        List<String> assignments = new ArrayList<>();
        resource.fields().keySet().forEach(column -> assignments.add(column + " = :" + column));
        if (resource.table().equals("teaching_demand") || resource.table().equals("class_subject_applicability")) {
            assignments.add("updated_at = CURRENT_TIMESTAMP");
        }
        List<Map<String, Object>> updated = rows("UPDATE " + resource.table() + " SET " + String.join(", ", assignments) + " WHERE id = :id RETURNING *", params);
        if (updated.isEmpty()) throw new NotFoundException("Không tìm thấy " + name + " với id=" + id);
        return updated.get(0);
    }

    @Transactional
    public void delete(String name, long id) {
        ResourceCatalog.Resource resource = ResourceCatalog.get(name);
        requireId(id);
        int deleted = jdbc.update("DELETE FROM " + resource.table() + " WHERE id = :id", new MapSqlParameterSource("id", id));
        if (deleted == 0) throw new NotFoundException("Không tìm thấy " + name + " với id=" + id);
    }

    private MapSqlParameterSource validate(ResourceCatalog.Resource resource, Map<String, Object> body, boolean replace) {
        if (body == null || body.isEmpty()) throw new BadRequestException("Body JSON không được rỗng");
        for (String key : body.keySet()) {
            if (!resource.fields().containsKey(key)) throw new BadRequestException("Trường không được phép: " + key);
        }
        MapSqlParameterSource params = new MapSqlParameterSource();
        resource.fields().forEach((key, field) -> {
            Object raw = body.get(key);
            if (field.required() && raw == null) throw new BadRequestException("Thiếu trường bắt buộc: " + key);
            if (replace || body.containsKey(key)) params.addValue(key, field.kind().convert(raw, key));
        });
        return params;
    }

    private static void requireId(long id) {
        if (id < 1) throw new BadRequestException("id phải là số nguyên dương");
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
