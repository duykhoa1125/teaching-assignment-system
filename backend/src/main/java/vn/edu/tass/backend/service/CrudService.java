package vn.edu.tass.backend.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.model.ResourceCatalog;
import vn.edu.tass.backend.model.ResourceCatalog.Resource;
import vn.edu.tass.backend.repository.CrudRepository;

@Service
public class CrudService {
    private final CrudRepository repository;

    public CrudService(CrudRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(String name, int limit, int offset) {
        Resource resource = ResourceCatalog.get(name);
        if (limit < 1 || limit > 100 || offset < 0) {
            throw new BadRequestException("limit phải từ 1 đến 100 và offset phải >= 0");
        }
        return repository.list(resource, limit, offset);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get(String name, long id) {
        Resource resource = ResourceCatalog.get(name);
        requireId(id);
        return repository.get(resource, id)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy " + name + " với id=" + id));
    }

    @Transactional
    public Map<String, Object> create(String name, Map<String, Object> body) {
        Resource resource = ResourceCatalog.get(name);
        return repository.create(resource, validate(resource, body, false));
    }

    @Transactional
    public Map<String, Object> replace(String name, long id, Map<String, Object> body) {
        Resource resource = ResourceCatalog.get(name);
        requireId(id);
        return repository.replace(resource, id, validate(resource, body, true))
            .orElseThrow(() -> new NotFoundException("Không tìm thấy " + name + " với id=" + id));
    }

    @Transactional
    public void delete(String name, long id) {
        Resource resource = ResourceCatalog.get(name);
        requireId(id);
        if (repository.delete(resource, id) == 0) {
            throw new NotFoundException("Không tìm thấy " + name + " với id=" + id);
        }
    }

    private Map<String, Object> validate(Resource resource, Map<String, Object> body, boolean replace) {
        if (body == null || body.isEmpty()) throw new BadRequestException("Body JSON không được rỗng");
        for (String key : body.keySet()) {
            if (!resource.fields().containsKey(key)) throw new BadRequestException("Trường không được phép: " + key);
        }
        Map<String, Object> fields = new LinkedHashMap<>();
        resource.fields().forEach((key, field) -> {
            Object raw = body.get(key);
            if (field.required() && raw == null) throw new BadRequestException("Thiếu trường bắt buộc: " + key);
            if (replace || body.containsKey(key)) fields.put(key, field.kind().convert(raw, key));
        });
        return fields;
    }

    private static void requireId(long id) {
        if (id < 1) throw new BadRequestException("id phải là số nguyên dương");
    }
}
