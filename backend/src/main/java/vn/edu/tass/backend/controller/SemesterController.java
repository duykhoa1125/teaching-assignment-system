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

import vn.edu.tass.backend.entity.Semester;
import vn.edu.tass.backend.payload.dto.SemesterDto;
import vn.edu.tass.backend.payload.request.SemesterRequest;
import vn.edu.tass.backend.service.SemesterService;

@RestController
@RequestMapping("/api/semesters")
public class SemesterController {
    private final SemesterService service;

    public SemesterController(SemesterService service) { this.service = service; }

    @GetMapping
    public List<SemesterDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(SemesterDto::from).toList();
    }

    @GetMapping("/{id}")
    public SemesterDto get(@PathVariable long id) { return SemesterDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<SemesterDto> create(@RequestBody SemesterRequest request) {
        Semester created = service.create(request);
        return ResponseEntity.created(URI.create("/api/semesters/" + created.id()))
            .body(SemesterDto.from(created));
    }

    @PutMapping("/{id}")
    public SemesterDto replace(@PathVariable long id, @RequestBody SemesterRequest request) {
        return SemesterDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
