package vn.edu.tass.backend.controller;

import java.net.URI;
import java.util.List;

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

import vn.edu.tass.backend.entity.SchoolClass;
import vn.edu.tass.backend.payload.dto.SchoolClassDto;
import vn.edu.tass.backend.payload.request.SchoolClassRequest;
import vn.edu.tass.backend.service.SchoolClassService;

@RestController
@RequestMapping("/api/classes")
public class SchoolClassController {
    private final SchoolClassService service;

    public SchoolClassController(SchoolClassService service) { this.service = service; }

    @GetMapping
    public List<SchoolClassDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(SchoolClassDto::from).toList();
    }

    @GetMapping("/{id}")
    public SchoolClassDto get(@PathVariable long id) { return SchoolClassDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<SchoolClassDto> create(@RequestBody SchoolClassRequest request) {
        SchoolClass created = service.create(request);
        return ResponseEntity.created(URI.create("/api/classes/" + created.id()))
            .body(SchoolClassDto.from(created));
    }

    @PutMapping("/{id}")
    public SchoolClassDto replace(@PathVariable long id, @RequestBody SchoolClassRequest request) {
        return SchoolClassDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
