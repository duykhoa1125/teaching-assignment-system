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

import vn.edu.tass.backend.entity.AssignmentRound;
import vn.edu.tass.backend.payload.dto.AssignmentRoundDto;
import vn.edu.tass.backend.payload.request.AssignmentRoundRequest;
import vn.edu.tass.backend.service.AssignmentRoundService;

@RestController
@RequestMapping("/api/assignment-rounds")
public class AssignmentRoundController {
    private final AssignmentRoundService service;

    public AssignmentRoundController(AssignmentRoundService service) { this.service = service; }

    @GetMapping
    public List<AssignmentRoundDto> list(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return service.list(limit, offset).stream().map(AssignmentRoundDto::from).toList();
    }

    @GetMapping("/{id}")
    public AssignmentRoundDto get(@PathVariable long id) { return AssignmentRoundDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<AssignmentRoundDto> create(@RequestBody AssignmentRoundRequest request) {
        AssignmentRound created = service.create(request);
        return ResponseEntity.created(URI.create("/api/assignment-rounds/" + created.id()))
            .body(AssignmentRoundDto.from(created));
    }

    @PutMapping("/{id}")
    public AssignmentRoundDto replace(@PathVariable long id, @RequestBody AssignmentRoundRequest request) {
        return AssignmentRoundDto.from(service.replace(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
