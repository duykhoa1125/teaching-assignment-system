package vn.edu.tass.backend.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import vn.edu.tass.backend.solver.SolverInputArchive;

@Repository
public class SolverInputRepository {
    public record Assignment(long demandId,Long teacherId,boolean locked,Long lockedBy,OffsetDateTime lockedAt,String lockReason) {}
    public record Archive(long id,long versionId,long planId,long roundId,long snapshotId,long revision,
                          String token,String schemaVersion,String canonical,String hash) {}
    private final JdbcTemplate jdbc;
    public SolverInputRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }

    public List<Assignment> assignments(long versionId) {
        return jdbc.query("SELECT * FROM plan_demand WHERE plan_version_id=? ORDER BY demand_id",(rs,row)->new Assignment(
            rs.getLong("demand_id"),rs.getObject("teacher_id")==null?null:rs.getLong("teacher_id"),rs.getBoolean("is_locked"),
            rs.getObject("locked_by")==null?null:rs.getLong("locked_by"),rs.getObject("locked_at",OffsetDateTime.class),rs.getString("lock_reason")),versionId);
    }

    public long insert(SolverInputArchive input,long actorId) {
        var id=input.snapshot().identity();
        return jdbc.queryForObject("""
            INSERT INTO solver_run(plan_version_id,input_snapshot_id,base_revision_no,requested_by,status,
                source_revision_token,solver_input_schema_version,solver_input_json,solver_input_canonical,solver_input_hash)
            VALUES(?,?,?,?,'PREPARED',?,'tass-solver/2',?::jsonb,?,?) RETURNING id
            """,Long.class,Long.parseLong(id.versionId()),Long.parseLong(id.snapshotId()),id.baseRevision(),actorId,
            id.sourceRevisionToken(),input.canonicalJson(),input.canonicalJson(),input.sha256());
    }

    public Optional<Archive> read(long runId) {
        return jdbc.query("""
            SELECT sr.*,p.id plan_id,p.round_id FROM solver_run sr JOIN plan_version v ON v.id=sr.plan_version_id
            JOIN assignment_plan p ON p.id=v.plan_id WHERE sr.id=?
            """,(rs,row)->new Archive(rs.getLong("id"),rs.getLong("plan_version_id"),rs.getLong("plan_id"),
                rs.getLong("round_id"),rs.getLong("input_snapshot_id"),rs.getLong("base_revision_no"),
                rs.getString("source_revision_token"),rs.getString("solver_input_schema_version"),
                rs.getString("solver_input_canonical"),rs.getString("solver_input_hash")),runId).stream().findFirst();
    }

    public boolean fresh(long runId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM solver_run sr JOIN plan_version v ON v.id=sr.plan_version_id
            JOIN assignment_plan p ON p.id=v.plan_id JOIN assignment_round r ON r.id=p.round_id
            JOIN input_snapshot sn ON sn.id=sr.input_snapshot_id
            WHERE sr.id=? AND p.current_version_id=v.id AND v.status='DRAFT'
                AND v.revision_no=sr.base_revision_no AND v.input_snapshot_id=sr.input_snapshot_id
                AND sr.source_revision_token=r.source_revision_token AND sn.source_revision_token=r.source_revision_token)
            """,Boolean.class,runId));
    }
}
