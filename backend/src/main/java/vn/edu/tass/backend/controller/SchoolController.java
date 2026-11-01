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

import vn.edu.tass.backend.entity.School;
import vn.edu.tass.backend.payload.dto.SchoolDto;
import vn.edu.tass.backend.payload.request.SchoolRequest;
import vn.edu.tass.backend.service.SchoolService;

@RestController
@RequestMapping("/api/schools")
public class SchoolController {
    private final SchoolService service;

    public SchoolController(SchoolService service) { this.service = service; }

    @GetMapping
    public List<SchoolDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(SchoolDto::from).toList();
    }

    @GetMapping("/{id}")
    public SchoolDto get(@PathVariable long id) { return SchoolDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<SchoolDto> create(@RequestBody SchoolRequest request) {
        School created = service.create(request);
        return ResponseEntity.created(URI.create("/api/schools/" + created.id()))
            .body(SchoolDto.from(created));
    }

    @PutMapping("/{id}")
    public SchoolDto replace(@PathVariable long id, @RequestBody SchoolRequest request) {
        return SchoolDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
