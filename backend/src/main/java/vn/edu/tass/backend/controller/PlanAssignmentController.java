package vn.edu.tass.backend.controller;

import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import vn.edu.tass.backend.payload.dto.AssignmentMutationDto;
import vn.edu.tass.backend.payload.request.*;
import vn.edu.tass.backend.service.PlanAssignmentService;

@RestController
@RequestMapping("/api/plan-versions/{id}/assignments")
public class PlanAssignmentController {
    private final PlanAssignmentService assignments;
    public PlanAssignmentController(PlanAssignmentService assignments) { this.assignments=assignments; }
    @PatchMapping("/{assignmentId}")
    @Operation(summary="Edit one saved assignment",description="Current DRAFT, manager scope, expected_revision and fresh snapshot required. assignmentId is the saved row id, not demand_id. teacher_id is required and nullable; null requires both unassigned reasons. Cannot change periods or edit a locked row. Shared eligibility/workload checks reject hard violations; partial DRAFT and missing annual data are allowed. Does not run solver or publish the plan.")
    public AssignmentMutationDto update(@PathVariable("id") long id,@PathVariable long assignmentId,@Valid @RequestBody UpdateAssignmentRequest request,Principal principal) {
        return assignments.update(id,assignmentId,request,principal);
    }
    @PostMapping("/{assignmentId}/lock")
    @Operation(summary="Lock one assigned component",description="Preserves teacher and captured periods. Fresh current DRAFT and expected_revision required. Already locked is a no-op, preserving original lock metadata. Locks are respected by subsequent solver runs.")
    public AssignmentMutationDto lock(@PathVariable("id") long id,@PathVariable long assignmentId,@Valid @RequestBody AssignmentLockRequest request,Principal principal) {
        return assignments.lock(id,assignmentId,request,true,principal);
    }
    @PostMapping("/{assignmentId}/unlock")
    @Operation(summary="Unlock one component",description="Metadata-only operation on current DRAFT, with expected_revision and audit reason. Allowed even when source is stale to resolve refresh/lock conflicts. Does not change teacher/periods or refresh snapshot. Already unlocked is a no-op.")
    public AssignmentMutationDto unlock(@PathVariable("id") long id,@PathVariable long assignmentId,@Valid @RequestBody AssignmentLockRequest request,Principal principal) {
        return assignments.lock(id,assignmentId,request,false,principal);
    }
    @PostMapping("/locks")
    @Operation(summary="Atomically lock selected components or a whole class-subject group",description="Select assignment_ids OR class_id+subject_id. Group selection includes every captured component, even with different teachers. Any unassigned/invalid row rejects the whole transaction; no silent skip. Fresh current DRAFT and expected_revision required. Revision increases per changed row, not once per request.")
    public AssignmentMutationDto locks(@PathVariable("id") long id,@Valid @RequestBody AssignmentBatchLockRequest request,Principal principal) {
        return assignments.changeLocks(id,request,true,principal);
    }
    @PostMapping("/unlocks")
    @Operation(summary="Atomically unlock selected components or a whole group",description="Same selector as locks. Audit reason, current DRAFT and expected_revision required. Stale source is allowed for metadata-only unlocking; no decision or snapshot changes. No-op rows keep revision unchanged.")
    public AssignmentMutationDto unlocks(@PathVariable("id") long id,@Valid @RequestBody AssignmentBatchLockRequest request,Principal principal) {
        return assignments.changeLocks(id,request,false,principal);
    }
}
