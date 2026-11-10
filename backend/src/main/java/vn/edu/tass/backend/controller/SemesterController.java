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
import vn.edu.tass.backend.payload.dto.SemesterDto;
import vn.edu.tass.backend.payload.request.SemesterRequest;
import vn.edu.tass.backend.service.SemesterService;

@RestController
@RequestMapping("/api/semesters")
public class SemesterController {
    private final SemesterService service;

    public SemesterController(SemesterService service) {
        this.service = service;
    }

    @GetMapping
    public List<SemesterDto> retrieveAllSemester(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(name = "academic_year_id", required = false) Long academicYearId) {
        if (academicYearId == null) return service.retrieveAllSemester(limit, offset);
        return service.searchSemester(limit, offset, academicYearId);
    }

    @GetMapping("/{id}")
    public SemesterDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<SemesterDto> createSemester(@Valid @RequestBody SemesterRequest request) {
        SemesterDto created = service.createSemester(request);
        return ResponseEntity.created(URI.create("/api/semesters/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public SemesterDto updateSemester(@PathVariable long id, @Valid @RequestBody SemesterRequest request) {
        return service.updateSemester(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSemester(@PathVariable long id) {
        service.deleteSemester(id);
        return ResponseEntity.noContent().build();
    }
}
