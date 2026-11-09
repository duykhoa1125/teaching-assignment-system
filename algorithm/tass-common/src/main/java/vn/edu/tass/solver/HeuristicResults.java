package vn.edu.tass.solver;

import static vn.edu.tass.solver.Contract.*;
import java.util.*;

public final class HeuristicResults {
    private HeuristicResults() {}
    public static double seconds(long start) {return (System.nanoTime()-start)/1e9;}
    public static long deadline(Snapshot s,long start) {return start+(long)(s.config().totalSeconds()*1e9);}
    public static Result success(Snapshot input,HeuristicProblem problem,HeuristicProblem.Candidate candidate,
                                 String algorithm,String stopReason,long start,Cancellation cancel) {
        if(cancel.isCancelled())return failure(input,"CANCELLED",List.of(),algorithm,start);
        SolutionValidator validator=new SolutionValidator();var assignment=problem.toAssignments(candidate);
        var evaluation=validator.evaluate(input,assignment,false);
        if(!evaluation.metrics().objectiveVector().equals(candidate.score().vector()))
            throw new IllegalStateException("Heuristic score differs from shared independent validator");
        List<String> warnings=new ArrayList<>();warnings.add("Heuristic candidate: no proof of global optimality or full-coverage impossibility.");
        if(input.config().demoAssumptions())warnings.add("DEMO ASSUMPTIONS: "+input.config().decisionSource());
        for(CheckResult check:evaluation.checks())if(check.status()==CheckStatus.INSUFFICIENT_DATA)warnings.add("INSUFFICIENT_DATA "+check.teacherId()+" / "+check.checkId()+": "+String.join(", ",check.missingData()));
        warnings.add("dataReadyForOpening covers data only; lifecycle/RBAC/fresh revision/feedback guards remain the host application's responsibility.");
        double elapsed=seconds(start);
        if(cancel.isCancelled())return failure(input,"CANCELLED",List.of(),algorithm,start);
        return new Result("FEASIBLE",input.identity(),Json.hash(input),List.of(),validator.explain(input,assignment),evaluation.loads(),evaluation.checks(),evaluation.metrics(),
            List.of(new Phase("HEURISTIC","FEASIBLE",stopReason,candidate.score().soft(),null,elapsed,false)),"HEURISTIC",false,false,evaluation.metrics().unassignedComponents()==0,warnings,elapsed,elapsed>input.config().totalSeconds(),algorithm+"/1.0",0,0);
    }
    public static Result failure(Snapshot input,String status,List<Issue> errors,String algorithm,long start) {
        double elapsed=seconds(start);return new Result(status,input==null?null:input.identity(),input==null?null:Json.hash(input),errors,List.of(),List.of(),List.of(),null,List.of(),null,false,false,false,List.of(),elapsed,input!=null && input.config()!=null && elapsed>input.config().totalSeconds(),algorithm+"/1.0",0,0);
    }
    public static Result error(Snapshot input,RuntimeException error,String algorithm,long start) {
        if(error instanceof InputValidator.InvalidInput invalid)return failure(input,invalid.issues().stream().anyMatch(i->i.path().equals("LOCK_CONFLICT"))?"LOCK_CONFLICT":"INVALID_INPUT",invalid.issues(),algorithm,start);
        if(error instanceof HeuristicProblem.BaselineViolation)return failure(input,"INFEASIBLE",List.of(new Issue("BASELINE_HARD_VIOLATION","hardChecks",error.getMessage())),algorithm,start);
        return failure(input,"ERROR",List.of(new Issue("RUN_ERROR","heuristic",error.toString())),algorithm,start);
    }
}
