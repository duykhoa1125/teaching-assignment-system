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

import vn.edu.tass.backend.entity.EducationLevel;
import vn.edu.tass.backend.payload.dto.EducationLevelDto;
import vn.edu.tass.backend.payload.request.EducationLevelRequest;
import vn.edu.tass.backend.service.EducationLevelService;

@RestController
@RequestMapping("/api/education-levels")
public class EducationLevelController {
    private final EducationLevelService service;

    public EducationLevelController(EducationLevelService service) { this.service = service; }

    @GetMapping
    public List<EducationLevelDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(EducationLevelDto::from).toList();
    }

    @GetMapping("/{id}")
    public EducationLevelDto get(@PathVariable long id) { return EducationLevelDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<EducationLevelDto> create(@RequestBody EducationLevelRequest request) {
        EducationLevel created = service.create(request);
        return ResponseEntity.created(URI.create("/api/education-levels/" + created.id()))
            .body(EducationLevelDto.from(created));
    }

    @PutMapping("/{id}")
    public EducationLevelDto replace(@PathVariable long id, @RequestBody EducationLevelRequest request) {
        return EducationLevelDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
