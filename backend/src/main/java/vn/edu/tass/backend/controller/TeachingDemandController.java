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
import vn.edu.tass.backend.payload.dto.TeachingDemandDto;
import vn.edu.tass.backend.payload.request.TeachingDemandRequest;
import vn.edu.tass.backend.service.TeachingDemandService;

@RestController
@RequestMapping("/api/teaching-demands")
public class TeachingDemandController {
    private final TeachingDemandService service;

    public TeachingDemandController(TeachingDemandService service) {
        this.service = service;
    }

    @GetMapping
    public List<TeachingDemandDto> retrieveAllTeachingDemand(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.retrieveAllTeachingDemand(limit, offset);
    }

    @GetMapping("/{id}")
    public TeachingDemandDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<TeachingDemandDto> createTeachingDemand(@Valid @RequestBody TeachingDemandRequest request) {
        TeachingDemandDto created = service.createTeachingDemand(request);
        return ResponseEntity.created(URI.create("/api/teaching-demands/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public TeachingDemandDto updateTeachingDemand(@PathVariable long id, @Valid @RequestBody TeachingDemandRequest request) {
        return service.updateTeachingDemand(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeachingDemand(@PathVariable long id) {
        service.deleteTeachingDemand(id);
        return ResponseEntity.noContent().build();
    }
}