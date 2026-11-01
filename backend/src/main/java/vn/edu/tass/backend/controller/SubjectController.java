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

import vn.edu.tass.backend.entity.Subject;
import vn.edu.tass.backend.payload.dto.SubjectDto;
import vn.edu.tass.backend.payload.request.SubjectRequest;
import vn.edu.tass.backend.service.SubjectService;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {
    private final SubjectService service;

    public SubjectController(SubjectService service) { this.service = service; }

    @GetMapping
    public List<SubjectDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(SubjectDto::from).toList();
    }

    @GetMapping("/{id}")
    public SubjectDto get(@PathVariable long id) { return SubjectDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<SubjectDto> create(@RequestBody SubjectRequest request) {
        Subject created = service.create(request);
        return ResponseEntity.created(URI.create("/api/subjects/" + created.id()))
            .body(SubjectDto.from(created));
    }

    @PutMapping("/{id}")
    public SubjectDto replace(@PathVariable long id, @RequestBody SubjectRequest request) {
        return SubjectDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
