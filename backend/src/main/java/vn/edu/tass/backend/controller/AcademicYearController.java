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

import vn.edu.tass.backend.entity.AcademicYear;
import vn.edu.tass.backend.payload.dto.AcademicYearDto;
import vn.edu.tass.backend.payload.request.AcademicYearRequest;
import vn.edu.tass.backend.service.AcademicYearService;

@RestController
@RequestMapping("/api/academic-years")
public class AcademicYearController {
    private final AcademicYearService service;

    public AcademicYearController(AcademicYearService service) { this.service = service; }

    @GetMapping
    public List<AcademicYearDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(AcademicYearDto::from).toList();
    }

    @GetMapping("/{id}")
    public AcademicYearDto get(@PathVariable long id) { return AcademicYearDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<AcademicYearDto> create(@RequestBody AcademicYearRequest request) {
        AcademicYear created = service.create(request);
        return ResponseEntity.created(URI.create("/api/academic-years/" + created.id()))
            .body(AcademicYearDto.from(created));
    }

    @PutMapping("/{id}")
    public AcademicYearDto replace(@PathVariable long id, @RequestBody AcademicYearRequest request) {
        return AcademicYearDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
