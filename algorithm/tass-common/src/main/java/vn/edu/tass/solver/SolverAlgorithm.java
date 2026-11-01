package vn.edu.tass.solver;

import static vn.edu.tass.solver.Contract.*;

/** Same immutable input/output and cancellation contract for every algorithm. */
public interface SolverAlgorithm {
    String name();
    Result solve(Snapshot snapshot, Cancellation cancellation);
    default Result solve(Snapshot snapshot) { return solve(snapshot, new Cancellation()); }
}
