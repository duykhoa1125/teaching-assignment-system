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
import vn.edu.tass.backend.payload.dto.SubjectDto;
import vn.edu.tass.backend.payload.request.SubjectRequest;
import vn.edu.tass.backend.service.SubjectService;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {
    private final SubjectService service;

    public SubjectController(SubjectService service) {
        this.service = service;
    }

    @GetMapping
    public List<SubjectDto> retrieveAllSubject(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.retrieveAllSubject(limit, offset);
    }

    @GetMapping("/{id}")
    public SubjectDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<SubjectDto> createSubject(@Valid @RequestBody SubjectRequest request) {
        SubjectDto created = service.createSubject(request);
        return ResponseEntity.created(URI.create("/api/subjects/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public SubjectDto updateSubject(@PathVariable long id, @Valid @RequestBody SubjectRequest request) {
        return service.updateSubject(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSubject(@PathVariable long id) {
        service.deleteSubject(id);
        return ResponseEntity.noContent().build();
    }
}