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

import vn.edu.tass.backend.entity.Teacher;
import vn.edu.tass.backend.payload.dto.TeacherDto;
import vn.edu.tass.backend.payload.request.TeacherRequest;
import vn.edu.tass.backend.service.TeacherService;

@RestController
@RequestMapping("/api/teachers")
public class TeacherController {
    private final TeacherService service;

    public TeacherController(TeacherService service) { this.service = service; }

    @GetMapping
    public List<TeacherDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(TeacherDto::from).toList();
    }

    @GetMapping("/{id}")
    public TeacherDto get(@PathVariable long id) { return TeacherDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<TeacherDto> create(@RequestBody TeacherRequest request) {
        Teacher created = service.create(request);
        return ResponseEntity.created(URI.create("/api/teachers/" + created.id()))
            .body(TeacherDto.from(created));
    }

    @PutMapping("/{id}")
    public TeacherDto replace(@PathVariable long id, @RequestBody TeacherRequest request) {
        return TeacherDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
