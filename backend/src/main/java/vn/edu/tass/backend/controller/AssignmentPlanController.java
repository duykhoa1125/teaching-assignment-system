package vn.edu.tass.backend.controller;

import jakarta.validation.Valid;
import java.net.URI;
import java.security.Principal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.tass.backend.payload.dto.PlanVersionDto;
import vn.edu.tass.backend.payload.request.CreatePlanRequest;
import vn.edu.tass.backend.payload.request.RefreshPlanSnapshotRequest;
import vn.edu.tass.backend.service.AssignmentPlanService;

@RestController
@RequestMapping("/api")
public class AssignmentPlanController {
    private final AssignmentPlanService plans;

    public AssignmentPlanController(AssignmentPlanService plans) { this.plans = plans; }

    @GetMapping("/assignment-rounds/{id}/plan")
    public PlanVersionDto current(@PathVariable("id") long id, Principal principal) {
        return plans.current(id, principal);
    }

    @PostMapping("/assignment-rounds/{id}/plan")
    public ResponseEntity<PlanVersionDto> create(@PathVariable("id") long id,
            @Valid @RequestBody CreatePlanRequest request, Principal principal) {
        var created = plans.create(id, request, principal);
        return ResponseEntity.created(URI.create("/api/plan-versions/" + created.versionId())).body(created);
    }

    @GetMapping("/plan-versions/{id}")
    public PlanVersionDto version(@PathVariable("id") long id, Principal principal) {
        return plans.version(id, principal);
    }

    @PostMapping("/plan-versions/{id}/refresh-snapshot")
    public PlanVersionDto refresh(@PathVariable("id") long id,
            @Valid @RequestBody RefreshPlanSnapshotRequest request, Principal principal) {
        return plans.refresh(id, request, principal);
    }
}
