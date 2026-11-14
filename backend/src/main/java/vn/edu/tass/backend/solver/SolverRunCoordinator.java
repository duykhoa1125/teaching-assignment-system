package vn.edu.tass.backend.solver;

import jakarta.annotation.PreDestroy;
import java.security.Principal;
import java.sql.Connection;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.edu.tass.backend.exception.*;
import vn.edu.tass.backend.payload.dto.SolverRunDto;
import vn.edu.tass.backend.payload.request.StartSolverRunRequest;
import vn.edu.tass.backend.repository.*;
import vn.edu.tass.backend.service.PlanActorResolver;
import vn.edu.tass.solver.*;

/** One bounded in-process queue, with PostgreSQL session ownership for restart recovery. */
@Component
public class SolverRunCoordinator {
    private static final Logger LOG=LoggerFactory.getLogger(SolverRunCoordinator.class);
    private static final long OWNER_KEY=836209340611L;
    private final SolverInputPreparation preparation;
    private final SolverInputRepository inputs;
    private final SolverRunRepository runs;
    private final AssignmentPlanRepository plans;
    private final PlanActorResolver actors;
    private final SolverRunEngine engine;
    private final SolverResultApplier applier;
    private final TransactionTemplate tx;
    private final DataSource dataSource;
    private final ThreadPoolExecutor executor;
    private final Semaphore capacity;
    private final ConcurrentHashMap<Long,Job> jobs=new ConcurrentHashMap<>();
    private Connection owner;
    private boolean ready,closed;

    public SolverRunCoordinator(SolverInputPreparation preparation,SolverInputRepository inputs,SolverRunRepository runs,
            AssignmentPlanRepository plans,PlanActorResolver actors,SolverRunEngine engine,SolverResultApplier applier,PlatformTransactionManager transactions,
            DataSource dataSource,@Value("${tass.solver.concurrent-runs:1}") int workers,@Value("${tass.solver.queue-capacity:8}") int queue) {
        if (workers<1 || workers>8 || queue<1 || queue>1000) throw new IllegalArgumentException("Invalid solver executor capacity");
        this.preparation=preparation; this.inputs=inputs; this.runs=runs; this.plans=plans; this.actors=actors;
        this.engine=engine; this.tx=new TransactionTemplate(transactions); this.dataSource=dataSource;
        this.applier=applier;
        this.capacity=new Semaphore(workers+queue);
        this.executor=new ThreadPoolExecutor(workers,workers,0,TimeUnit.MILLISECONDS,new ArrayBlockingQueue<>(queue),r->{
            var thread=new Thread(r,"tass-solver-run"); thread.setDaemon(true); return thread;
        },new ThreadPoolExecutor.AbortPolicy());
    }

    @EventListener(ApplicationReadyEvent.class)
    public synchronized void initialize() {
        if (ready || closed) return;
        try {
            owner=dataSource.getConnection();
            if (!owner.getMetaData().getDatabaseProductName().equals("PostgreSQL")) {
                // H2 CRUD tests do not have the PostgreSQL business schema.
                owner.close(); owner=null; return;
            }
            try (var query=owner.prepareStatement("SELECT pg_try_advisory_lock(?)")) {
                query.setLong(1,OWNER_KEY);
                try (var result=query.executeQuery()) {
                    result.next();
                    if (!result.getBoolean(1)) throw new IllegalStateException("Another solver coordinator already owns this database");
                }
            }
            int interrupted=runs.recover();
            if (interrupted>0) LOG.warn("Marked {} interrupted solver runs FAILED",interrupted);
            ready=true;
        } catch (Exception e) {
            releaseOwner();
            throw new IllegalStateException("Cannot initialize solver coordinator; install migrations 06/07 and use one backend instance",e);
        }
    }

    public synchronized SolverRunDto submit(long versionId,StartSolverRunRequest request,Principal principal) {
        long actor=actors.requireActor(principal);
        var version=plans.version(versionId).orElseThrow(()->new NotFoundException("Không tìm thấy version."));
        authorize(actor,version.roundId());
        if (!ready || closed || !ownerHealthy()) throw error(HttpStatus.SERVICE_UNAVAILABLE,"SOLVER_UNAVAILABLE","Bộ điều phối solver chưa sẵn sàng.");
        runs.active(versionId).ifPresent(id->{ throw new SolverRunActiveException(id); });
        if (!capacity.tryAcquire()) throw error(HttpStatus.SERVICE_UNAVAILABLE,"SOLVER_QUEUE_FULL","Hàng chờ solver đã đầy; thử lại sau.");
        long before=System.nanoTime();
        SolverInputPreparation.PreparedRun prepared;
        try {
            prepared=tx.execute(status->{
                var saved=preparation.prepare(versionId,request.expectedRevision(),request.optimizationConfigId(),request.ruleSetVersionId(),principal);
                // prepare holds plan/version/round locks until this outer transaction commits.
                runs.active(versionId).ifPresent(id->{ throw new SolverRunActiveException(id); });
                runs.enqueue(saved.runId(),millis(before));
                return saved;
            });
        } catch (RuntimeException | Error e) { capacity.release(); throw e; }
        var job=new Job(prepared); jobs.put(prepared.runId(),job);
        try { executor.execute(job); }
        catch (RejectedExecutionException e) {
            jobs.remove(prepared.runId()); job.release();
            runs.start(prepared.runId());
            runs.finish(prepared.runId(),"FAILED",null,SolverRunSummary.create(prepared.input().snapshot(),null,"EXECUTOR_REJECTED").toString(),0,0,"EXECUTOR_REJECTED");
            throw error(HttpStatus.SERVICE_UNAVAILABLE,"SOLVER_UNAVAILABLE","Không thể đưa lượt giải vào executor.");
        }
        return get(prepared.runId(),principal);
    }

    public SolverRunDto get(long runId,Principal principal) {
        long actor=actors.requireActor(principal);
        var saved=inputs.read(runId).orElseThrow(()->new NotFoundException("Không tìm thấy lượt giải."));
        authorize(actor,saved.roundId());
        return runs.read(runId).orElseThrow(()->new NotFoundException("Không tìm thấy lượt giải."));
    }

    public synchronized SolverRunDto cancel(long runId,Principal principal) {
        var current=get(runId,principal);
        if (!java.util.Set.of("QUEUED","RUNNING","CANCEL_REQUESTED").contains(current.status())) return current;
        var saved=preparation.replay(runId,principal);
        runs.cancel(runId,SolverRunSummary.create(saved.input().snapshot(),null,"CANCELLED").put("apply_outcome","CANCELLED").toString());
        var job=jobs.get(runId);
        if (job!=null) {
            job.cancellation.cancel();
            if (executor.remove(job)) { jobs.remove(runId,job); job.release(); }
        }
        return get(runId,principal);
    }

    private final class Job implements Runnable {
        final SolverInputPreparation.PreparedRun prepared;
        final Cancellation cancellation=new Cancellation();
        final AtomicBoolean released=new AtomicBoolean();
        Job(SolverInputPreparation.PreparedRun prepared) { this.prepared=prepared; }
        void release() { if (released.compareAndSet(false,true)) capacity.release(); }
        @Override public void run() {
            long before=System.nanoTime();
            Contract.Result result=null;
            long solveMs=-1;
            try {
                if (!runs.start(prepared.runId())) return;
                before=System.nanoTime();
                result=engine.solve(prepared.input().snapshot(),cancellation);
                solveMs=millis(before);
                applier.complete(prepared,result,cancellation,solveMs);
            } catch (Throwable e) {
                LOG.error("Solver run {} failed",prepared.runId(),e);
                try {
                    String failure=result==null?"EXECUTION_FAILED":"APPLY_FAILED";
                    var summary=SolverRunSummary.create(prepared.input().snapshot(),result,failure);
                    summary.put("apply_outcome",result==null?"NOT_APPLIED":"FAILED");
                    runs.finish(prepared.runId(),"FAILED",null,summary.toString(),solveMs<0?millis(before):solveMs,0,failure);
                } catch (RuntimeException failedWrite) { LOG.error("Cannot persist failure for solver run {}",prepared.runId(),failedWrite); }
            } finally { jobs.remove(prepared.runId(),this); release(); }
        }
    }
    private void authorize(long actor,long round) {
        if (!plans.canManage(actor,round)) throw error(HttpStatus.FORBIDDEN,"PLAN_ACCESS_DENIED","Không có quyền quản lý toàn bộ phạm vi đợt.");
    }
    private boolean ownerHealthy() {
        try { return owner!=null && owner.isValid(1); } catch (java.sql.SQLException e) { return false; }
    }
    /** Container readiness: initialization, native bean load and DB coordinator ownership must have completed. */
    public synchronized boolean isReady() { return ready && !closed && ownerHealthy(); }
    private void releaseOwner() {
        if (owner==null) return;
        try (var query=owner.prepareStatement("SELECT pg_advisory_unlock(?)")) { query.setLong(1,OWNER_KEY); query.execute(); }
        catch (java.sql.SQLException ignored) { /* A lost connection releases its session lock. */ }
        try { owner.close(); } catch (java.sql.SQLException ignored) {}
        owner=null;
    }
    @PreDestroy
    public synchronized void close() {
        closed=true;
        jobs.values().forEach(j->j.cancellation.cancel());
        executor.shutdownNow();
        try { executor.awaitTermination(5,TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        releaseOwner();
    }
    private static long millis(long before) { return Math.max(0,TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-before)); }
    private static PlanOperationException error(HttpStatus status,String code,String message) { return new PlanOperationException(status,code,message); }
}
