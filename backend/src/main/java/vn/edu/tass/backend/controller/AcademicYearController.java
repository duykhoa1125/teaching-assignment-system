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
import vn.edu.tass.backend.payload.dto.AcademicYearDto;
import vn.edu.tass.backend.payload.request.AcademicYearRequest;
import vn.edu.tass.backend.service.AcademicYearService;

@RestController
@RequestMapping("/api/academic-years")
public class AcademicYearController {
    private final AcademicYearService service;

    public AcademicYearController(AcademicYearService service) {
        this.service = service;
    }

    @GetMapping
    public List<AcademicYearDto> retrieveAllAcademicYear(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.retrieveAllAcademicYear(limit, offset);
    }

    @GetMapping("/{id}")
    public AcademicYearDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<AcademicYearDto> createAcademicYear(@Valid @RequestBody AcademicYearRequest request) {
        AcademicYearDto created = service.createAcademicYear(request);
        return ResponseEntity.created(URI.create("/api/academic-years/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public AcademicYearDto updateAcademicYear(@PathVariable long id, @Valid @RequestBody AcademicYearRequest request) {
        return service.updateAcademicYear(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAcademicYear(@PathVariable long id) {
        service.deleteAcademicYear(id);
        return ResponseEntity.noContent().build();
    }
}