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

import vn.edu.tass.backend.entity.TeachingExperience;
import vn.edu.tass.backend.payload.dto.TeachingExperienceDto;
import vn.edu.tass.backend.payload.request.TeachingExperienceRequest;
import vn.edu.tass.backend.service.TeachingExperienceService;

@RestController
@RequestMapping("/api/teaching-experiences")
public class TeachingExperienceController {
    private final TeachingExperienceService service;

    public TeachingExperienceController(TeachingExperienceService service) { this.service = service; }

    @GetMapping
    public List<TeachingExperienceDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(TeachingExperienceDto::from).toList();
    }

    @GetMapping("/{id}")
    public TeachingExperienceDto get(@PathVariable long id) { return TeachingExperienceDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<TeachingExperienceDto> create(@RequestBody TeachingExperienceRequest request) {
        TeachingExperience created = service.create(request);
        return ResponseEntity.created(URI.create("/api/teaching-experiences/" + created.id()))
            .body(TeachingExperienceDto.from(created));
    }

    @PutMapping("/{id}")
    public TeachingExperienceDto replace(@PathVariable long id, @RequestBody TeachingExperienceRequest request) {
        return TeachingExperienceDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
