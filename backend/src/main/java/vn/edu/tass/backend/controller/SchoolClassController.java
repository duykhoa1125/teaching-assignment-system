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
import vn.edu.tass.backend.payload.dto.SchoolClassDto;
import vn.edu.tass.backend.payload.request.SchoolClassRequest;
import vn.edu.tass.backend.service.SchoolClassService;

@RestController
@RequestMapping("/api/classes")
public class SchoolClassController {
    private final SchoolClassService service;

    public SchoolClassController(SchoolClassService service) {
        this.service = service;
    }

    @GetMapping
    public List<SchoolClassDto> retrieveAllSchoolClass(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.retrieveAllSchoolClass(limit, offset);
    }

    @GetMapping("/{id}")
    public SchoolClassDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<SchoolClassDto> createSchoolClass(@Valid @RequestBody SchoolClassRequest request) {
        SchoolClassDto created = service.createSchoolClass(request);
        return ResponseEntity.created(URI.create("/api/classes/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public SchoolClassDto updateSchoolClass(@PathVariable long id, @Valid @RequestBody SchoolClassRequest request) {
        return service.updateSchoolClass(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSchoolClass(@PathVariable long id) {
        service.deleteSchoolClass(id);
        return ResponseEntity.noContent().build();
    }
}