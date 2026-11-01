package vn.edu.tass.backend.controller;

import vn.edu.tass.backend.payload.dto.CrudRequest;
import vn.edu.tass.backend.payload.dto.CrudResponse;
import vn.edu.tass.backend.service.CrudService;

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
    public List<CrudResponse> list(@PathVariable String resource,
            @RequestParam(defaultValue = "20") int limit, @RequestParam(defaultValue = "0") int offset) {
        return service.list(resource, limit, offset).stream().map(CrudResponse::new).toList();
    }

    @GetMapping("/{resource}/{id}")
    public CrudResponse get(@PathVariable String resource, @PathVariable long id) {
        return new CrudResponse(service.get(resource, id));
    }

    @PostMapping("/{resource}")
    public ResponseEntity<CrudResponse> create(@PathVariable String resource, @RequestBody CrudRequest body) {
        Map<String, Object> created = service.create(resource, body.fields());
        return ResponseEntity.created(URI.create("/api/" + resource + "/" + created.get("id"))).body(new CrudResponse(created));
    }

    @PutMapping("/{resource}/{id}")
    public CrudResponse replace(@PathVariable String resource, @PathVariable long id,
            @RequestBody CrudRequest body) {
        return new CrudResponse(service.replace(resource, id, body.fields()));
    }

    @DeleteMapping("/{resource}/{id}")
    public ResponseEntity<Void> delete(@PathVariable String resource, @PathVariable long id) {
        service.delete(resource, id);
        return ResponseEntity.noContent().build();
    }
}
