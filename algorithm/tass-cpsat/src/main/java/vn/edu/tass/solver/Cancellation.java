package vn.edu.tass.solver;

import com.google.ortools.sat.CpSolver;
import java.util.function.Supplier;

/** Application cancellation is separate from CP-SAT status and plan state. */
public final class Cancellation {
    private boolean cancelled;
    private CpSolver running;
    public synchronized void cancel() {cancelled=true;if(running!=null)running.stopSearch();}
    public synchronized boolean isCancelled(){return cancelled;}
    synchronized void register(CpSolver solver){running=solver;if(cancelled)solver.stopSearch();}
    synchronized void clear(){running=null;}
    synchronized <T> T atCommit(Supplier<T> commit,Supplier<T> rejected){return cancelled?rejected.get():commit.get();}
}
