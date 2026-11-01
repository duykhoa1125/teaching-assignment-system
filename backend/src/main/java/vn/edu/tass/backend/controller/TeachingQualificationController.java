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

import vn.edu.tass.backend.entity.TeachingQualification;
import vn.edu.tass.backend.payload.dto.TeachingQualificationDto;
import vn.edu.tass.backend.payload.request.TeachingQualificationRequest;
import vn.edu.tass.backend.service.TeachingQualificationService;

@RestController
@RequestMapping("/api/teaching-qualifications")
public class TeachingQualificationController {
    private final TeachingQualificationService service;

    public TeachingQualificationController(TeachingQualificationService service) { this.service = service; }

    @GetMapping
    public List<TeachingQualificationDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(TeachingQualificationDto::from).toList();
    }

    @GetMapping("/{id}")
    public TeachingQualificationDto get(@PathVariable long id) { return TeachingQualificationDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<TeachingQualificationDto> create(@RequestBody TeachingQualificationRequest request) {
        TeachingQualification created = service.create(request);
        return ResponseEntity.created(URI.create("/api/teaching-qualifications/" + created.id()))
            .body(TeachingQualificationDto.from(created));
    }

    @PutMapping("/{id}")
    public TeachingQualificationDto replace(@PathVariable long id, @RequestBody TeachingQualificationRequest request) {
        return TeachingQualificationDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
