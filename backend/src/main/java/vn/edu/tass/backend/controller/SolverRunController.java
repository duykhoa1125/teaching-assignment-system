package vn.edu.tass.backend.controller;

import jakarta.validation.Valid;
import java.net.URI;
import java.security.Principal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import vn.edu.tass.backend.payload.dto.SolverRunDto;
import vn.edu.tass.backend.payload.request.StartSolverRunRequest;
import vn.edu.tass.backend.solver.SolverRunCoordinator;

@RestController
@RequestMapping("/api")
public class SolverRunController {
    private final SolverRunCoordinator runs;
    public SolverRunController(SolverRunCoordinator runs) { this.runs=runs; }
    @PostMapping("/plan-versions/{id}/solver-runs")
    @Operation(summary="Queue a solver run",description="202 with run ID and Location. Same DRAFT active: 409 SOLVER_RUN_ACTIVE with Location of the active run; no implicit replay/idempotency key. Full queue: 503 SOLVER_QUEUE_FULL. Requires current DRAFT, matching revision/config and fresh ready snapshot. Worker independently validates and atomically applies a candidate only while DRAFT/revision/source remain current.")
    public ResponseEntity<SolverRunDto> start(@PathVariable("id") long id,@Valid @RequestBody StartSolverRunRequest request,Principal principal) {
        var run=runs.submit(id,request,principal);
        return ResponseEntity.accepted().location(URI.create("/api/solver-runs/"+run.id())).body(run);
    }
    @GetMapping("/solver-runs/{id}")
    @Operation(summary="Read a solver run",description="Task status is distinct from summary.cp_sat_status and summary.apply_outcome. Only APPLIED indicates saved assignments; STALE/NOT_DRAFT never overwrite edits. applied_revision_no is the actual trigger revision and can equal base_revision for no-op apply. input_fresh may be false after the run's own writes advance revision. Historical inputs remain readable.")
    public SolverRunDto get(@PathVariable("id") long id,Principal principal) { return runs.get(id,principal); }
    @PostMapping("/solver-runs/{id}/cancel")
    @Operation(summary="Cancel a solver run",description="Idempotent. Queued runs become CANCELLED; running runs become CANCEL_REQUESTED until native solve stops. Terminal runs are returned unchanged. Cancellation never undoes saved assignments.")
    public SolverRunDto cancel(@PathVariable("id") long id,Principal principal) { return runs.cancel(id,principal); }
}
