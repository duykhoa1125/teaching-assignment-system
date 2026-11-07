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
import vn.edu.tass.backend.payload.dto.TeachingExperienceDto;
import vn.edu.tass.backend.payload.request.TeachingExperienceRequest;
import vn.edu.tass.backend.service.TeachingExperienceService;

@RestController
@RequestMapping("/api/teaching-experiences")
public class TeachingExperienceController {
    private final TeachingExperienceService service;

    public TeachingExperienceController(TeachingExperienceService service) {
        this.service = service;
    }

    @GetMapping
    public List<TeachingExperienceDto> retrieveAllTeachingExperience(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.retrieveAllTeachingExperience(limit, offset);
    }

    @GetMapping("/{id}")
    public TeachingExperienceDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<TeachingExperienceDto> createTeachingExperience(@Valid @RequestBody TeachingExperienceRequest request) {
        TeachingExperienceDto created = service.createTeachingExperience(request);
        return ResponseEntity.created(URI.create("/api/teaching-experiences/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public TeachingExperienceDto updateTeachingExperience(@PathVariable long id, @Valid @RequestBody TeachingExperienceRequest request) {
        return service.updateTeachingExperience(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeachingExperience(@PathVariable long id) {
        service.deleteTeachingExperience(id);
        return ResponseEntity.noContent().build();
    }
}