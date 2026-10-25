package vn.edu.tass.solver;

import static vn.edu.tass.solver.Contract.*;
import java.util.*;

/** Deterministic, most-constrained-first constructive baseline. Does not invoke CP-SAT. */
public final class GreedySolver implements SolverAlgorithm {
    public String name() {return "GREEDY";}
    public Result solve(Snapshot input,Cancellation cancel) {
        long start=System.nanoTime();
        try {
            HeuristicProblem problem=new HeuristicProblem(input);
            if(cancel.isCancelled())return HeuristicResults.failure(input,"CANCELLED",List.of(),name(),start);
            long deadline=HeuristicResults.deadline(input,start);int[] preference=new int[problem.demandCount()];Arrays.fill(preference,-1);
            var candidate=problem.decode(problem.greedyOrder(),preference,()->cancel.isCancelled() || System.nanoTime()>=deadline);
            return HeuristicResults.success(input,problem,candidate,name(),System.nanoTime()>=deadline?"TIME_LIMIT":"CONSTRUCTION_FINISHED",start,cancel);
        } catch(RuntimeException error){return HeuristicResults.error(input,error,name(),start);}
    }
}
