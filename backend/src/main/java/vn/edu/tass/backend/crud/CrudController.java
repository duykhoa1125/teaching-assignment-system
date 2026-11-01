package vn.edu.tass.backend.crud;

import java.net.URI;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CrudController {
    private final CrudService service;

    public CrudController(CrudService service) { this.service = service; }

    @GetMapping("/{resource}")
    public List<Map<String, Object>> list(@PathVariable String resource,
            @RequestParam(defaultValue = "20") int limit, @RequestParam(defaultValue = "0") int offset) {
        return service.list(resource, limit, offset);
    }

    @GetMapping("/{resource}/{id}")
    public Map<String, Object> get(@PathVariable String resource, @PathVariable long id) {
        return service.get(resource, id);
    }

    @PostMapping("/{resource}")
    public ResponseEntity<Map<String, Object>> create(@PathVariable String resource, @RequestBody Map<String, Object> body) {
        Map<String, Object> created = service.create(resource, body);
        return ResponseEntity.created(URI.create("/api/" + resource + "/" + created.get("id"))).body(created);
    }

    @PutMapping("/{resource}/{id}")
    public Map<String, Object> replace(@PathVariable String resource, @PathVariable long id,
            @RequestBody Map<String, Object> body) {
        return service.replace(resource, id, body);
    }

    @DeleteMapping("/{resource}/{id}")
    public ResponseEntity<Void> delete(@PathVariable String resource, @PathVariable long id) {
        service.delete(resource, id);
        return ResponseEntity.noContent().build();
    }
}
