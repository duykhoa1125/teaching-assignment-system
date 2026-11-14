package vn.edu.tass.backend.controller;

import jakarta.validation.Valid;
import java.net.URI;
import java.security.Principal;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import vn.edu.tass.backend.payload.dto.PlanResultDto.*;
import vn.edu.tass.backend.payload.request.ValidatePlanRequest;
import vn.edu.tass.backend.service.PlanResultService;

@RestController
@RequestMapping("/api/plan-versions/{id}")
public class PlanResultController {
    private final PlanResultService results;
    public PlanResultController(PlanResultService results) { this.results=results; }
    @GetMapping("/assignments")
    @Operation(summary="Read saved assignments",description="Manager scope required. Snapshot labels and saved rows, never an unapplied solver candidate. Stable demand/id order; total is filtered count. Historical versions remain readable.")
    public AssignmentPage assignments(@PathVariable("id") long id,@RequestParam(name="teacher_id",required=false) Long teacher,
            @RequestParam(name="class_id",required=false) Long classroom,@RequestParam(name="demand_type",required=false) String type,
            @RequestParam(name="is_locked",required=false) Boolean locked,@RequestParam(name="unassigned",required=false) Boolean unassigned,
            @RequestParam(name="valid_on",required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(name="limit",defaultValue="50") int limit,@RequestParam(name="offset",defaultValue="0") int offset,Principal principal) {
        return results.assignments(id,teacher,classroom,type,locked,unassigned,date,limit,offset,principal);
    }
    @GetMapping("/workloads")
    @Operation(summary="Read saved assignment workloads",description="Recomputes B/F/A/C/R/W/T/delta_t using the immutable captured source and current saved rows. Includes weekly violations and annual missing data; stale snapshots are labelled, never mixed with live inputs. Unsupported scope/data: 422.")
    public WorkloadPage workloads(@PathVariable("id") long id,@RequestParam(name="teacher_id",required=false) Long teacher,
            @RequestParam(name="limit",defaultValue="50") int limit,@RequestParam(name="offset",defaultValue="0") int offset,Principal principal) {
        return results.workloads(id,teacher,limit,offset,principal);
    }
    @GetMapping("/optimization")
    @Operation(summary="Read optimization metadata",description="Latest applied run, or latest attempt if none applied. latest_run_id points to newest attempt. matches_version must be true to attribute proof/objectives to the current version. No canonical input/teacher profiles returned.")
    public OptimizationView optimization(@PathVariable("id") long id,Principal principal) { return results.optimization(id,principal); }
    @PostMapping("/validation")
    @Operation(summary="Validate saved assignments",description="Creates an immutable report under plan/version/round locks. Body: expected_revision only. Current version and fresh snapshot required (409 on conflict); does not edit assignments/revision or change lifecycle. 201 may report VIOLATION or INSUFFICIENT_DATA. Unsupported source/scope: 422. Illustrative workload rules only.")
    public ResponseEntity<ValidationReport> validate(@PathVariable("id") long id,@Valid @RequestBody ValidatePlanRequest request,Principal principal) {
        var report=results.validate(id,request.expectedRevision(),principal);
        return ResponseEntity.created(URI.create("/api/plan-versions/"+id+"/validation?validation_run_id="+report.id())).body(report);
    }
    @GetMapping("/validation")
    @Operation(summary="Read saved validation",description="Latest report including stale ones, or validation_run_id belonging to this version. fresh is checked against current version/revision/snapshot/live token. Historical report workloads/results stay readable after edits and restart; no report: 404.")
    public ValidationReport validation(@PathVariable("id") long id,@RequestParam(name="validation_run_id",required=false) Long run,Principal principal) { return results.validation(id,run,principal); }
}
