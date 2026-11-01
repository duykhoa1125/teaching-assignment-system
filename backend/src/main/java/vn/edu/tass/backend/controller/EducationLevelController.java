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
import vn.edu.tass.backend.payload.dto.EducationLevelDto;
import vn.edu.tass.backend.payload.request.EducationLevelRequest;
import vn.edu.tass.backend.service.EducationLevelService;

@RestController
@RequestMapping("/api/education-levels")
public class EducationLevelController {
    private final EducationLevelService service;

    public EducationLevelController(EducationLevelService service) {
        this.service = service;
    }

    @GetMapping
    public List<EducationLevelDto> retrieveAllEducationLevel(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.retrieveAllEducationLevel(limit, offset);
    }

    @GetMapping("/{id}")
    public EducationLevelDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<EducationLevelDto> createEducationLevel(@Valid @RequestBody EducationLevelRequest request) {
        EducationLevelDto created = service.createEducationLevel(request);
        return ResponseEntity.created(URI.create("/api/education-levels/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public EducationLevelDto updateEducationLevel(@PathVariable long id, @Valid @RequestBody EducationLevelRequest request) {
        return service.updateEducationLevel(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEducationLevel(@PathVariable long id) {
        service.deleteEducationLevel(id);
        return ResponseEntity.noContent().build();
    }
}