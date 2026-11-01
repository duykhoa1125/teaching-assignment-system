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
import vn.edu.tass.backend.payload.dto.GradeDto;
import vn.edu.tass.backend.payload.request.GradeRequest;
import vn.edu.tass.backend.service.GradeService;

@RestController
@RequestMapping("/api/grades")
public class GradeController {
    private final GradeService service;

    public GradeController(GradeService service) {
        this.service = service;
    }

    @GetMapping
    public List<GradeDto> retrieveAllGrade(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.retrieveAllGrade(limit, offset);
    }

    @GetMapping("/{id}")
    public GradeDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<GradeDto> createGrade(@Valid @RequestBody GradeRequest request) {
        GradeDto created = service.createGrade(request);
        return ResponseEntity.created(URI.create("/api/grades/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public GradeDto updateGrade(@PathVariable long id, @Valid @RequestBody GradeRequest request) {
        return service.updateGrade(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGrade(@PathVariable long id) {
        service.deleteGrade(id);
        return ResponseEntity.noContent().build();
    }
}