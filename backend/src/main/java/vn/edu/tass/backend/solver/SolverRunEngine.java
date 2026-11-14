package vn.edu.tass.backend.solver;

import org.springframework.stereotype.Component;
import vn.edu.tass.solver.*;

/** Small execution boundary; tests can control scheduling without mocking native classes. */
@Component
public class SolverRunEngine {
    private final AssignmentSolver solver;
    public SolverRunEngine(AssignmentSolver solver) { this.solver=solver; }
    public Contract.Result solve(Contract.Snapshot snapshot,Cancellation cancellation) {
        return solver.solve(snapshot,cancellation);
    }
}
