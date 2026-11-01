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

import vn.edu.tass.backend.entity.ClassSubjectApplicability;
import vn.edu.tass.backend.payload.dto.ClassSubjectApplicabilityDto;
import vn.edu.tass.backend.payload.request.ClassSubjectApplicabilityRequest;
import vn.edu.tass.backend.service.ClassSubjectApplicabilityService;

@RestController
@RequestMapping("/api/class-subject-applicabilities")
public class ClassSubjectApplicabilityController {
    private final ClassSubjectApplicabilityService service;

    public ClassSubjectApplicabilityController(ClassSubjectApplicabilityService service) { this.service = service; }

    @GetMapping
    public List<ClassSubjectApplicabilityDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(ClassSubjectApplicabilityDto::from).toList();
    }

    @GetMapping("/{id}")
    public ClassSubjectApplicabilityDto get(@PathVariable long id) { return ClassSubjectApplicabilityDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<ClassSubjectApplicabilityDto> create(@RequestBody ClassSubjectApplicabilityRequest request) {
        ClassSubjectApplicability created = service.create(request);
        return ResponseEntity.created(URI.create("/api/class-subject-applicabilities/" + created.id()))
            .body(ClassSubjectApplicabilityDto.from(created));
    }

    @PutMapping("/{id}")
    public ClassSubjectApplicabilityDto replace(@PathVariable long id, @RequestBody ClassSubjectApplicabilityRequest request) {
        return ClassSubjectApplicabilityDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
