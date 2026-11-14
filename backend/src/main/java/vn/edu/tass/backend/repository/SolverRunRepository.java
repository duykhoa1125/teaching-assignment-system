package vn.edu.tass.backend.repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.payload.dto.SolverRunDto;
import vn.edu.tass.solver.Json;

@Repository
public class SolverRunRepository {
    public record LockedRun(long requestedBy,String status) {}
    private final JdbcTemplate jdbc;
    private final SolverInputRepository inputs;
    public SolverRunRepository(JdbcTemplate jdbc,SolverInputRepository inputs) { this.jdbc=jdbc; this.inputs=inputs; }
    public Optional<Long> active(long version) {
        return jdbc.query("SELECT id FROM solver_run WHERE plan_version_id=? AND queued_at IS NOT NULL AND status IN ('QUEUED','RUNNING','CANCEL_REQUESTED')",
            (rs,n)->rs.getLong(1),version).stream().findFirst();
    }
    public void enqueue(long id,long preparationMs) {
        jdbc.update("UPDATE solver_run SET status='QUEUED',queued_at=clock_timestamp(),preparation_ms=? WHERE id=? AND status='PREPARED'",preparationMs,id);
    }
    public boolean start(long id) {
        return jdbc.update("UPDATE solver_run SET status='RUNNING',execution_started_at=clock_timestamp() WHERE id=? AND status='QUEUED'",id)==1;
    }
    public LockedRun lock(long id) {
        return jdbc.queryForObject("SELECT requested_by,status FROM solver_run WHERE id=? FOR UPDATE",
            (rs,n)->new LockedRun(rs.getLong(1),rs.getString(2)),id);
    }
    public void applied(long id,Long revision,long applyMs) {
        jdbc.update("UPDATE solver_run SET applied_revision_no=?,apply_ms=? WHERE id=?",revision,applyMs,id);
    }
    public void cancel(long id,String summary) {
        jdbc.update("""
            UPDATE solver_run SET cancellation_requested_at=clock_timestamp(),
                result_summary_json=CASE WHEN status='QUEUED' THEN ?::jsonb ELSE result_summary_json END,
                finished_at=CASE WHEN status='QUEUED' THEN clock_timestamp() ELSE finished_at END,
                status=CASE WHEN status='QUEUED' THEN 'CANCELLED' ELSE 'CANCEL_REQUESTED' END
            WHERE id=? AND status IN ('QUEUED','RUNNING')
            """,summary,id);
    }
    /** The CAS also arbitrates cancellation that arrives while native solve is finishing. */
    @Transactional
    public void finish(long id,String status,String result,String summary,long solveMs,long archiveMs,String failure) {
        long before=System.nanoTime();
        int changed=jdbc.update("""
            UPDATE solver_run SET status=CASE WHEN status='CANCEL_REQUESTED' THEN 'CANCELLED' ELSE ? END,
                solver_result_json=CASE WHEN status='CANCEL_REQUESTED' THEN NULL ELSE ?::jsonb END,
                result_summary_json=CASE WHEN status='CANCEL_REQUESTED' THEN
                    jsonb_set(jsonb_set(?::jsonb,'{termination_reason}','"CANCELLED"'),'{apply_outcome}','"CANCELLED"') ELSE ?::jsonb END,
                solve_ms=?,archive_write_ms=?,failure_code=CASE WHEN status='CANCEL_REQUESTED' THEN NULL ELSE ? END,finished_at=clock_timestamp()
            WHERE id=? AND status IN ('RUNNING','CANCEL_REQUESTED')
            """,status,result,summary,summary,solveMs,archiveMs,failure,id);
        if (changed==1) jdbc.update("UPDATE solver_run SET archive_write_ms=? WHERE id=?",
            archiveMs+java.util.concurrent.TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-before),id);
    }
    public int recover() {
        return jdbc.update("""
            UPDATE solver_run SET status='FAILED',failure_code='SERVICE_RESTARTED',finished_at=clock_timestamp()
            WHERE queued_at IS NOT NULL AND status IN ('QUEUED','RUNNING','CANCEL_REQUESTED')
            """);
    }
    public Optional<SolverRunDto> read(long id) {
        return jdbc.query("SELECT * FROM solver_run WHERE id=?",(rs,n)-> {
            try {
                var summary=rs.getString("result_summary_json");
                return new SolverRunDto(id,rs.getLong("plan_version_id"),rs.getLong("base_revision_no"),rs.getLong("requested_by"),
                    rs.getString("status"),rs.getObject("queued_at",OffsetDateTime.class),rs.getObject("execution_started_at",OffsetDateTime.class),
                    rs.getObject("finished_at",OffsetDateTime.class),rs.getObject("cancellation_requested_at",OffsetDateTime.class),
                    rs.getObject("preparation_ms",Long.class),rs.getObject("solve_ms",Long.class),rs.getObject("archive_write_ms",Long.class),
                    rs.getString("failure_code"),rs.getString("solver_input_hash"),inputs.fresh(id),rs.getObject("applied_revision_no",Long.class),
                    rs.getObject("apply_ms",Long.class),summary==null?null:Json.MAPPER.readTree(summary));
            } catch (java.io.IOException e) { throw new IllegalStateException("Invalid stored run summary",e); }
        },id).stream().findFirst();
    }
}
