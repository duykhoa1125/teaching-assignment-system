package vn.edu.tass.testing;

import java.util.concurrent.*;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.edu.tass.backend.solver.SolverRunEngine;
import vn.edu.tass.solver.*;

/** Gate individual inputs while retaining the real database, HTTP and native solver. */
public class ControlledSolverEngine extends SolverRunEngine {
    public static class Gate {
        public final CountDownLatch entered=new CountDownLatch(1),release=new CountDownLatch(1);
        public volatile boolean afterSolve,fail,inTransaction;
        public java.util.function.UnaryOperator<Contract.Result> transform=java.util.function.UnaryOperator.identity();
    }
    public final ConcurrentHashMap<String,Gate> gates=new ConcurrentHashMap<>();
    public ControlledSolverEngine(AssignmentSolver solver) { super(solver); }
    public Gate block(long version,boolean afterSolve) {
        var gate=new Gate(); gate.afterSolve=afterSolve; gates.put(Long.toString(version),gate); return gate;
    }
    @Override public Contract.Result solve(Contract.Snapshot input,Cancellation cancellation) {
        var gate=gates.get(input.identity().versionId());
        if (gate==null) return super.solve(input,cancellation);
        gate.inTransaction=TransactionSynchronizationManager.isActualTransactionActive();
        var result=gate.afterSolve?super.solve(input,cancellation):null;
        gate.entered.countDown();
        try { if (!gate.release.await(15,TimeUnit.SECONDS)) throw new IllegalStateException("Test gate timed out"); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
        finally { gates.remove(input.identity().versionId(),gate); }
        if (gate.fail) throw new UnsatisfiedLinkError("Controlled native failure");
        return gate.transform.apply(gate.afterSolve?result:super.solve(input,cancellation));
    }
}
