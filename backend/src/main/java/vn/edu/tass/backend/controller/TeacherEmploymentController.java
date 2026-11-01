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

import vn.edu.tass.backend.entity.TeacherEmployment;
import vn.edu.tass.backend.payload.dto.TeacherEmploymentDto;
import vn.edu.tass.backend.payload.request.TeacherEmploymentRequest;
import vn.edu.tass.backend.service.TeacherEmploymentService;

@RestController
@RequestMapping("/api/teacher-employments")
public class TeacherEmploymentController {
    private final TeacherEmploymentService service;

    public TeacherEmploymentController(TeacherEmploymentService service) { this.service = service; }

    @GetMapping
    public List<TeacherEmploymentDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(TeacherEmploymentDto::from).toList();
    }

    @GetMapping("/{id}")
    public TeacherEmploymentDto get(@PathVariable long id) { return TeacherEmploymentDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<TeacherEmploymentDto> create(@RequestBody TeacherEmploymentRequest request) {
        TeacherEmployment created = service.create(request);
        return ResponseEntity.created(URI.create("/api/teacher-employments/" + created.id()))
            .body(TeacherEmploymentDto.from(created));
    }

    @PutMapping("/{id}")
    public TeacherEmploymentDto replace(@PathVariable long id, @RequestBody TeacherEmploymentRequest request) {
        return TeacherEmploymentDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
