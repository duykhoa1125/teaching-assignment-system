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
import vn.edu.tass.backend.payload.dto.SchoolDto;
import vn.edu.tass.backend.payload.request.SchoolRequest;
import vn.edu.tass.backend.service.SchoolService;

@RestController
@RequestMapping("/api/schools")
public class SchoolController {
    private final SchoolService service;

    public SchoolController(SchoolService service) {
        this.service = service;
    }

    @GetMapping
    public List<SchoolDto> retrieveAllSchool(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.retrieveAllSchool(limit, offset);
    }

    @GetMapping("/{id}")
    public SchoolDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<SchoolDto> createSchool(@Valid @RequestBody SchoolRequest request) {
        SchoolDto created = service.createSchool(request);
        return ResponseEntity.created(URI.create("/api/schools/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public SchoolDto updateSchool(@PathVariable long id, @Valid @RequestBody SchoolRequest request) {
        return service.updateSchool(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSchool(@PathVariable long id) {
        service.deleteSchool(id);
        return ResponseEntity.noContent().build();
    }
}