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
import vn.edu.tass.backend.payload.dto.ClassSubjectApplicabilityDto;
import vn.edu.tass.backend.payload.request.ClassSubjectApplicabilityRequest;
import vn.edu.tass.backend.service.ClassSubjectApplicabilityService;

@RestController
@RequestMapping("/api/class-subject-applicabilities")
public class ClassSubjectApplicabilityController {
    private final ClassSubjectApplicabilityService service;

    public ClassSubjectApplicabilityController(ClassSubjectApplicabilityService service) {
        this.service = service;
    }

    @GetMapping
    public List<ClassSubjectApplicabilityDto> retrieveAllClassSubjectApplicability(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(name = "scope_id", required = false) Long scopeId,
            @RequestParam(name = "class_id", required = false) Long classId,
            @RequestParam(name = "status", required = false) String status) {
        if (scopeId == null && classId == null && status == null) return service.retrieveAllClassSubjectApplicability(limit, offset);
        return service.searchClassSubjectApplicability(limit, offset, scopeId, classId, status);
    }

    @GetMapping("/{id}")
    public ClassSubjectApplicabilityDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<ClassSubjectApplicabilityDto> createClassSubjectApplicability(@Valid @RequestBody ClassSubjectApplicabilityRequest request) {
        ClassSubjectApplicabilityDto created = service.createClassSubjectApplicability(request);
        return ResponseEntity.created(URI.create("/api/class-subject-applicabilities/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ClassSubjectApplicabilityDto updateClassSubjectApplicability(@PathVariable long id, @Valid @RequestBody ClassSubjectApplicabilityRequest request) {
        return service.updateClassSubjectApplicability(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteClassSubjectApplicability(@PathVariable long id) {
        service.deleteClassSubjectApplicability(id);
        return ResponseEntity.noContent().build();
    }
}
