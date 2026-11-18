package vn.edu.tass.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.tass.backend.payload.dto.AssignmentPlanDto;
import vn.edu.tass.backend.payload.request.CreateAssignmentPlanRequest;
import vn.edu.tass.backend.service.AssignmentPlanService;

@RestController
@RequestMapping("/api/assignment-rounds/{id}/plan")
@RequiredArgsConstructor
public class AssignmentPlanController {
    private final AssignmentPlanService service;

    @GetMapping
    public AssignmentPlanDto retrieve(@PathVariable long id) {
        return service.retrieve(id);
    }

    @PostMapping
    public ResponseEntity<AssignmentPlanDto> create(@PathVariable long id,
            @Valid @RequestBody CreateAssignmentPlanRequest request) {
        return ResponseEntity.created(java.net.URI.create("/api/assignment-rounds/" + id + "/plan"))
            .body(service.create(id, request));
    }
}
