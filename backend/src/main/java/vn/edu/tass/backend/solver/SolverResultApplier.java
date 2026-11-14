package vn.edu.tass.backend.solver;

import java.util.*;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.edu.tass.backend.repository.*;
import vn.edu.tass.solver.*;
import static vn.edu.tass.solver.AssignmentService.ApplyOutcome.*;

/** Validates outside the write transaction, then atomically checks identity and saves all rows and run metadata. */
@Component
public class SolverResultApplier {
    private final SolverInputPreparation preparation;
    private final SolverInputRepository inputs;
    private final AssignmentPlanRepository plans;
    private final SolverRunRepository runs;
    private final SolverAssignmentRepository assignments;
    private final SolutionValidator validator;
    private final TransactionTemplate tx;
    public SolverResultApplier(SolverInputPreparation preparation,SolverInputRepository inputs,AssignmentPlanRepository plans,
            SolverRunRepository runs,SolverAssignmentRepository assignments,SolutionValidator validator,PlatformTransactionManager transactions) {
        this.preparation=preparation; this.inputs=inputs; this.plans=plans; this.runs=runs;
        this.assignments=assignments; this.validator=validator; this.tx=new TransactionTemplate(transactions);
    }
    public void complete(SolverInputPreparation.PreparedRun prepared,Contract.Result result,Cancellation cancellation,long solveMs) {
        long before=System.nanoTime();
        var checked=validate(prepared.input().snapshot(),result,cancellation);
        // Keep the token monitor through the actual transaction commit, including shutdown cancellation.
        // HTTP cancel also arbitrates through the persisted run row lock, not an in-memory flag alone.
        synchronized(cancellation) {
            tx.executeWithoutResult(status->{
                var saved=inputs.read(prepared.runId()).orElseThrow();
                plans.lockPlan(saved.planId()); plans.lockVersion(saved.versionId()); plans.lockRound(saved.roundId());
                var run=runs.lock(prepared.runId());
                if (!Set.of("RUNNING","CANCEL_REQUESTED").contains(run.status())) return; // already finalized; never apply twice
                var verified=preparation.decode(saved);
                if (!verified.input().equals(prepared.input())) throw new IllegalStateException("Execution input differs from immutable archive");
                var outcome=checked;
                Long applied=null;
                String failure=null;
                if (cancellation.isCancelled() || run.status().equals("CANCEL_REQUESTED")) outcome=CANCELLED;
                else if (outcome==APPLIED) {
                    var version=plans.version(saved.versionId()).orElseThrow();
                    if (!version.isCurrent() || !version.status().equals("DRAFT")) outcome=NOT_DRAFT;
                    else if (!inputs.fresh(prepared.runId())) outcome=STALE;
                    else if (!plans.canManage(run.requestedBy(),saved.roundId())) { outcome=REJECTED; failure="AUTHORIZATION_CHANGED"; }
                    else {
                        plans.setActor(run.requestedBy());
                        assignments.write(saved.versionId(),result);
                        applied=plans.version(saved.versionId()).orElseThrow().revisionNo();
                        assignments.audit(prepared.runId(),run.requestedBy(),saved.revision(),applied);
                    }
                }
                if (outcome==REJECTED && failure==null) failure="POST_VALIDATION_FAILED";
                String state=outcome==CANCELLED?"CANCELLED":outcome==REJECTED?"FAILED":result.hasCandidate()?"SUCCEEDED":
                    Set.of("UNKNOWN","INFEASIBLE").contains(result.status())?"COMPLETED":"FAILED";
                if (state.equals("FAILED") && failure==null) failure="SOLVER_ERROR";
                long applyMs=millis(before),encoding=System.nanoTime();
                var summary=SolverRunSummary.create(prepared.input().snapshot(),result,outcome==CANCELLED?"CANCELLED":termination(result));
                summary.put("apply_outcome",outcome.name()).put("apply_ms",applyMs);
                summary.put("post_validation_status",checked==APPLIED?"PASS":checked==REJECTED?"REJECTED":"NOT_RUN");
                if (checked==REJECTED) {
                    summary.path("stages").forEach(s->((com.fasterxml.jackson.databind.node.ObjectNode)s).put("exactOptimalityProven",false));
                    ((com.fasterxml.jackson.databind.node.ObjectNode)summary.path("coverage")).put("optimality_proven",false);
                }
                if (applied!=null) summary.put("applied_revision_no",applied);
                try {
                    String canonical=outcome==CANCELLED?null:Json.MAPPER.writeValueAsString(result);
                    runs.applied(prepared.runId(),applied,applyMs);
                    runs.finish(prepared.runId(),state,canonical,summary.toString(),solveMs,millis(encoding),failure);
                } catch(java.io.IOException e) { throw new IllegalStateException("Cannot serialize solver result",e); }
            });
        }
    }
    private AssignmentService.ApplyOutcome validate(Contract.Snapshot input,Contract.Result result,Cancellation cancel) {
        if (result.status().equals("CANCELLED")) return CANCELLED;
        try {
            var checked=new AssignmentService((snapshot,candidate,token)->{
                if (!candidate.errors().isEmpty()) throw new IllegalArgumentException("Candidate contains errors");
                Map<String,String> values=new LinkedHashMap<>(); candidate.assignments().forEach(a->values.put(a.demandId(),a.teacherId()));
                var evaluated=validator.evaluate(snapshot,values,candidate.coverageOptimalityProven());
                if (!evaluated.loads().equals(candidate.loads()) || !evaluated.checks().equals(candidate.checks()) || !evaluated.metrics().equals(candidate.metrics())) {
                    throw new IllegalArgumentException("Result loads/checks/objectives differ from independent validation");
                }
                if (candidate.phases().size()!=5) throw new IllegalArgumentException("Missing lexicographic stages");
                boolean all=true;
                for(int i=0;i<5;i++) {
                    var phase=candidate.phases().get(i);
                    if (!AssignmentSolver.STAGES.get(i).equals(phase.name())) throw new IllegalArgumentException("Wrong stage order");
                    if (phase.exactOptimalityProven() && (!phase.status().equals("OPTIMAL") || phase.objective()==null || phase.bestBound()==null
                        || !Double.isFinite(phase.bestBound())
                        || java.math.BigDecimal.valueOf(phase.bestBound()).compareTo(java.math.BigDecimal.valueOf(phase.objective()))!=0
                        || !phase.objective().equals(candidate.metrics().objectiveVector().get(i)))) throw new IllegalArgumentException("Invalid optimality proof");
                    if(i==0 && candidate.coverageOptimalityProven()!=phase.exactOptimalityProven()) throw new IllegalArgumentException("Coverage proof mismatch");
                    if(i>0) all &= phase.exactOptimalityProven();
                }
                if (candidate.softOptimalityProven()!=all || candidate.status().equals("OPTIMAL")!=(all&&candidate.coverageOptimalityProven())) throw new IllegalArgumentException("Result proof mismatch");
                return new AssignmentService.ApplyResult(APPLIED,null,"Independently validated");
            }).apply(input,result,cancel);
            return checked.outcome();
        } catch (RuntimeException e) { return REJECTED; }
    }
    private static long millis(long before) { return Math.max(0,TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-before)); }
    private static String termination(Contract.Result result) {
        if (result.status().equals("CANCELLED")) return "CANCELLED";
        if (result.budgetExceeded()) return "TOTAL_BUDGET_EXHAUSTED";
        if (result.status().equals("OPTIMAL")) return "EXACT_OPTIMUM";
        return result.phases().stream().filter(p->!p.exactOptimalityProven()).map(Contract.Phase::stopReason).findFirst().orElse(result.status());
    }
}
