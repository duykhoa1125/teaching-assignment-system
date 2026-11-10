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
import vn.edu.tass.backend.payload.dto.AssignmentRoundDto;
import vn.edu.tass.backend.payload.request.AssignmentRoundRequest;
import vn.edu.tass.backend.service.AssignmentRoundService;

@RestController
@RequestMapping("/api/assignment-rounds")
public class AssignmentRoundController {
    private final AssignmentRoundService service;

    public AssignmentRoundController(AssignmentRoundService service) {
        this.service = service;
    }

    @GetMapping
    public List<AssignmentRoundDto> retrieveAllAssignmentRound(@RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(name = "semester_id", required = false) Long semesterId,
            @RequestParam(name = "status", required = false) String status) {
        if (semesterId == null && status == null) return service.retrieveAllAssignmentRound(limit, offset);
        return service.searchAssignmentRound(limit, offset, semesterId, status);
    }

    @GetMapping("/{id}")
    public AssignmentRoundDto retrieveById(@PathVariable long id) {
        return service.retrieveById(id);
    }

    @PostMapping
    public ResponseEntity<AssignmentRoundDto> createAssignmentRound(@Valid @RequestBody AssignmentRoundRequest request) {
        AssignmentRoundDto created = service.createAssignmentRound(request);
        return ResponseEntity.created(URI.create("/api/assignment-rounds/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public AssignmentRoundDto updateAssignmentRound(@PathVariable long id, @Valid @RequestBody AssignmentRoundRequest request) {
        return service.updateAssignmentRound(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAssignmentRound(@PathVariable long id) {
        service.deleteAssignmentRound(id);
        return ResponseEntity.noContent().build();
    }
}
