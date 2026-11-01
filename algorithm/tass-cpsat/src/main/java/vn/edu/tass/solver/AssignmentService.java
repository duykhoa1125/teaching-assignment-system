package vn.edu.tass.solver;

import static vn.edu.tass.solver.Contract.*;
import java.util.*;

/** Host application authorizes the manager, captures a trusted snapshot, then calls this service. */
public final class AssignmentService {
    public enum ApplyOutcome { APPLIED, STALE, NOT_DRAFT, CANCELLED, NO_CANDIDATE, REJECTED }
    public record ApplyResult(ApplyOutcome outcome,Long appliedRevision,String message) {}
    public interface PlanStore {
        /** Atomic CAS of ALL identity fields, snapshot hash, current DRAFT and cancellation at commit. */
        ApplyResult compareAndApply(Snapshot expected,Result candidate,Cancellation cancellation);
    }
    private final PlanStore store;
    public AssignmentService(PlanStore store){this.store=Objects.requireNonNull(store);}
    public ApplyResult apply(Snapshot snapshot,Result result,Cancellation cancel) {
        if(cancel.isCancelled())return new ApplyResult(ApplyOutcome.CANCELLED,null,"Cancelled run");
        if(!result.hasCandidate())return new ApplyResult(ApplyOutcome.NO_CANDIDATE,null,"No usable solver candidate");
        if(!Objects.equals(snapshot.identity(),result.identity()) || !Json.hash(snapshot).equals(result.snapshotHash()))return new ApplyResult(ApplyOutcome.REJECTED,null,"Candidate identity/hash mismatch");
        try {
            Map<String,String> values=new LinkedHashMap<>();
            for(Assignment a:result.assignments()) {
                InputValidator.require(!values.containsKey(a.demandId()),"assignment","Duplicate result demand");values.put(a.demandId(),a.teacherId());
                if(a.teacherId()==null){InputValidator.text(a.reasonCode(),"unassigned.reasonCode");InputValidator.text(a.reason(),"unassigned.reason");}
                else InputValidator.require(a.reasonCode()==null && a.reason()==null,"assignment.reason","Assigned row has stale unassigned reason");
            }
            new SolutionValidator().evaluate(snapshot,values,result.coverageOptimalityProven());
            // Reject forged display values as well as invalid decisions; regenerate from the immutable snapshot.
            for(Assignment a:result.assignments()) {
                Demand d=snapshot.demands().stream().filter(v->v.id().equals(a.demandId())).findFirst().orElseThrow();
                InputValidator.require(Objects.equals(d.classId(),a.classId()) && Objects.equals(d.subjectId(),a.subjectId()) && d.type()==a.type() && d.periods().compareTo(a.periods())==0,"assignment","Display values differ from snapshot");
            }
        } catch(RuntimeException ex){return new ApplyResult(ApplyOutcome.REJECTED,null,ex.getMessage());}
        return store.compareAndApply(snapshot,result,cancel);
    }
    /** Executable reference/test adapter, not a substitute for database transactions. */
    public static final class InMemoryPlanStore implements PlanStore {
        private Snapshot current;private String state="DRAFT";private long revision;private List<Assignment> saved=List.of();
        public InMemoryPlanStore(Snapshot snapshot){current=snapshot;revision=snapshot.identity().baseRevision();}
        public synchronized ApplyResult compareAndApply(Snapshot expected,Result result,Cancellation cancel) {
            return cancel.atCommit(()->{
                if(!state.equals("DRAFT"))return new ApplyResult(ApplyOutcome.NOT_DRAFT,null,"Only current DRAFT accepts a solver result");
                if(revision!=expected.identity().baseRevision() || !current.identity().equals(expected.identity()) || !Json.hash(current).equals(Json.hash(expected)))return new ApplyResult(ApplyOutcome.STALE,null,"Version/revision/snapshot/source token changed");
                saved=List.copyOf(result.assignments());revision++;
                return new ApplyResult(ApplyOutcome.APPLIED,revision,"Saved atomically; state remains DRAFT; old validation is stale");
            },()->new ApplyResult(ApplyOutcome.CANCELLED,null,"Cancelled before commit"));
        }
        public synchronized List<Assignment> saved(){return saved;}
        public synchronized long revision(){return revision;}
        public synchronized String state(){return state;}
        /** Test/host simulation; real host mutations must use its own authorization + transaction guards. */
        public synchronized void replaceCurrent(Snapshot snapshot,String newState){current=snapshot;revision=snapshot.identity().baseRevision();state=newState;}
    }
}
