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

import vn.edu.tass.backend.entity.RoundSubjectScope;
import vn.edu.tass.backend.payload.dto.RoundSubjectScopeDto;
import vn.edu.tass.backend.payload.request.RoundSubjectScopeRequest;
import vn.edu.tass.backend.service.RoundSubjectScopeService;

@RestController
@RequestMapping("/api/round-subject-scopes")
public class RoundSubjectScopeController {
    private final RoundSubjectScopeService service;

    public RoundSubjectScopeController(RoundSubjectScopeService service) { this.service = service; }

    @GetMapping
    public List<RoundSubjectScopeDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(RoundSubjectScopeDto::from).toList();
    }

    @GetMapping("/{id}")
    public RoundSubjectScopeDto get(@PathVariable long id) { return RoundSubjectScopeDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<RoundSubjectScopeDto> create(@RequestBody RoundSubjectScopeRequest request) {
        RoundSubjectScope created = service.create(request);
        return ResponseEntity.created(URI.create("/api/round-subject-scopes/" + created.id()))
            .body(RoundSubjectScopeDto.from(created));
    }

    @PutMapping("/{id}")
    public RoundSubjectScopeDto replace(@PathVariable long id, @RequestBody RoundSubjectScopeRequest request) {
        return RoundSubjectScopeDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
