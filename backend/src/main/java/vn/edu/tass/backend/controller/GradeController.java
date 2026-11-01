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

import vn.edu.tass.backend.entity.Grade;
import vn.edu.tass.backend.payload.dto.GradeDto;
import vn.edu.tass.backend.payload.request.GradeRequest;
import vn.edu.tass.backend.service.GradeService;

@RestController
@RequestMapping("/api/grades")
public class GradeController {
    private final GradeService service;

    public GradeController(GradeService service) { this.service = service; }

    @GetMapping
    public List<GradeDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(GradeDto::from).toList();
    }

    @GetMapping("/{id}")
    public GradeDto get(@PathVariable long id) { return GradeDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<GradeDto> create(@RequestBody GradeRequest request) {
        Grade created = service.create(request);
        return ResponseEntity.created(URI.create("/api/grades/" + created.id()))
            .body(GradeDto.from(created));
    }

    @PutMapping("/{id}")
    public GradeDto replace(@PathVariable long id, @RequestBody GradeRequest request) {
        return GradeDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
