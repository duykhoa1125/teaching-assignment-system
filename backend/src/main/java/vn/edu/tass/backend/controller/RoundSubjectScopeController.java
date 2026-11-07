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
import vn.edu.tass.backend.payload.dto.RoundSubjectScopeDto;
import vn.edu.tass.backend.payload.request.RoundSubjectScopeRequest;
import vn.edu.tass.backend.service.RoundSubjectScopeService;

@RestController
@RequestMapping("/api/round-subject-scopes")
public class RoundSubjectScopeController {
    private final RoundSubjectScopeService service;

    public RoundSubjectScopeController(RoundSubjectScopeService service) {
        this.service = service;
    }

    @GetMapping
    public List<RoundSubjectScopeDto> retrieveAllRoundSubjectScope(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.retrieveAllRoundSubjectScope(limit, offset);
    }

    @GetMapping("/{id}")
    public RoundSubjectScopeDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<RoundSubjectScopeDto> createRoundSubjectScope(@Valid @RequestBody RoundSubjectScopeRequest request) {
        RoundSubjectScopeDto created = service.createRoundSubjectScope(request);
        return ResponseEntity.created(URI.create("/api/round-subject-scopes/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public RoundSubjectScopeDto updateRoundSubjectScope(@PathVariable long id, @Valid @RequestBody RoundSubjectScopeRequest request) {
        return service.updateRoundSubjectScope(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoundSubjectScope(@PathVariable long id) {
        service.deleteRoundSubjectScope(id);
        return ResponseEntity.noContent().build();
    }
}