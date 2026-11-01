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
import vn.edu.tass.backend.payload.dto.TeacherDto;
import vn.edu.tass.backend.payload.request.TeacherRequest;
import vn.edu.tass.backend.service.TeacherService;

@RestController
@RequestMapping("/api/teachers")
public class TeacherController {
    private final TeacherService service;

    public TeacherController(TeacherService service) {
        this.service = service;
    }

    @GetMapping
    public List<TeacherDto> retrieveAllTeacher(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.retrieveAllTeacher(limit, offset);
    }

    @GetMapping("/{id}")
    public TeacherDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<TeacherDto> createTeacher(@Valid @RequestBody TeacherRequest request) {
        TeacherDto created = service.createTeacher(request);
        return ResponseEntity.created(URI.create("/api/teachers/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public TeacherDto updateTeacher(@PathVariable long id, @Valid @RequestBody TeacherRequest request) {
        return service.updateTeacher(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeacher(@PathVariable long id) {
        service.deleteTeacher(id);
        return ResponseEntity.noContent().build();
    }
}