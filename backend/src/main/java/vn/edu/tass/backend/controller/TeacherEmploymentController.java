package vn.edu.tass.backend.controller;

import java.net.URI;
import java.util.List;
import jakarta.validation.Valid;
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
import vn.edu.tass.backend.payload.dto.TeacherEmploymentDto;
import vn.edu.tass.backend.payload.request.TeacherEmploymentRequest;
import vn.edu.tass.backend.service.TeacherEmploymentService;

@RestController
@RequestMapping("/api/teacher-employments")
public class TeacherEmploymentController {
    private final TeacherEmploymentService service;

    public TeacherEmploymentController(TeacherEmploymentService service) {
        this.service = service;
    }

    @GetMapping
    public List<TeacherEmploymentDto> retrieveAllTeacherEmployment(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.retrieveAllTeacherEmployment(limit, offset);
    }

    @GetMapping("/{id}")
    public TeacherEmploymentDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<TeacherEmploymentDto> createTeacherEmployment(@Valid @RequestBody TeacherEmploymentRequest request) {
        TeacherEmploymentDto created = service.createTeacherEmployment(request);
        return ResponseEntity.created(URI.create("/api/teacher-employments/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public TeacherEmploymentDto updateTeacherEmployment(@PathVariable long id, @Valid @RequestBody TeacherEmploymentRequest request) {
        return service.updateTeacherEmployment(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeacherEmployment(@PathVariable long id) {
        service.deleteTeacherEmployment(id);
        return ResponseEntity.noContent().build();
    }
}