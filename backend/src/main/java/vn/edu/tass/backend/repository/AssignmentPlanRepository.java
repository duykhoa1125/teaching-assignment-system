package vn.edu.tass.backend.repository;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import vn.edu.tass.backend.payload.dto.PlanVersionDto;

/** SQL persistence keeps PostgreSQL trigger-owned revision/audit behavior explicit. */
@Repository
public class AssignmentPlanRepository {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    private final String captureSql;

    public AssignmentPlanRepository(JdbcTemplate jdbc) throws IOException {
        this.jdbc = jdbc;
        this.named = new NamedParameterJdbcTemplate(jdbc);
        this.captureSql = new ClassPathResource("db/capture-plan-source.sql").getContentAsString(StandardCharsets.UTF_8);
    }

    public boolean roundExists(long roundId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM assignment_round WHERE id=?)", Boolean.class, roundId));
    }

    public boolean canManage(long actorId, long roundId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM user_account u
            JOIN academic_year y ON y.school_id=u.school_id JOIN semester se ON se.academic_year_id=y.id
            JOIN assignment_round r ON r.semester_id=se.id
            WHERE u.id=? AND u.status='ACTIVE' AND r.id=?
              AND EXISTS(SELECT 1 FROM user_role ur JOIN role ro ON ro.id=ur.role_id
                         WHERE ur.user_id=u.id AND ro.role_code='ACADEMIC_MANAGER')
              AND NOT EXISTS(SELECT 1 FROM round_subject_scope sc WHERE sc.round_id=r.id
                AND NOT EXISTS(SELECT 1 FROM manager_scope ms WHERE ms.user_id=u.id
                  AND ms.grade_id=sc.grade_id AND ms.academic_year_id=y.id
                  AND ms.valid_from<=se.starts_on AND (ms.valid_to IS NULL OR ms.valid_to>=se.ends_on))))
            """, Boolean.class, actorId, roundId));
    }

    public void lockRound(long roundId) {
        jdbc.queryForObject("SELECT id FROM assignment_round WHERE id=? FOR UPDATE", Long.class, roundId);
    }

    public boolean planExists(long roundId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM assignment_plan WHERE round_id=?)", Boolean.class, roundId));
    }

    public void setActor(long actorId) {
        jdbc.queryForObject("SELECT set_config('tass.actor_id', ?, true)", String.class, Long.toString(actorId));
    }

    public boolean configurationConfirmed(long roundId, long configId, long rulesId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM optimization_config c CROSS JOIN rule_set_version rules
              CROSS JOIN assignment_round r JOIN semester se ON se.id=r.semester_id
            WHERE r.id=? AND c.id=? AND rules.id=?
              AND c.confirmed_by IS NOT NULL AND c.confirmed_at IS NOT NULL
              AND rules.confirmed_by IS NOT NULL AND rules.confirmed_at IS NOT NULL
              AND rules.valid_from<=se.starts_on AND (rules.valid_to IS NULL OR rules.valid_to>=se.ends_on))
            """, Boolean.class, roundId, configId, rulesId));
    }

    public long capture(long roundId, long configId, long rulesId, long versionId) {
        return named.queryForObject(captureSql,
            Map.of("roundId", roundId, "configId", configId, "rulesId", rulesId, "versionId", versionId), Long.class);
    }

    public long insertPlan(long roundId, long actorId) {
        return jdbc.queryForObject("""
            INSERT INTO assignment_plan(round_id,plan_code,created_by) VALUES(?, ?, ?) RETURNING id
            """, Long.class, roundId, "ROUND-" + roundId, actorId);
    }

    public long insertVersion(long planId, long snapshotId, long actorId) {
        return jdbc.queryForObject("""
            INSERT INTO plan_version(plan_id,version_no,status,input_snapshot_id,created_by)
            VALUES(?,1,'DRAFT',?,?) RETURNING id
            """, Long.class, planId, snapshotId, actorId);
    }

    public void setCurrent(long planId, long versionId) {
        jdbc.update("UPDATE assignment_plan SET current_version_id=? WHERE id=?", versionId, planId);
    }

    public void lockPlan(long planId) {
        jdbc.queryForObject("SELECT id FROM assignment_plan WHERE id=? FOR UPDATE", Long.class, planId);
    }

    public void lockVersion(long versionId) {
        jdbc.queryForObject("SELECT id FROM plan_version WHERE id=? FOR UPDATE", Long.class, versionId);
    }

    public boolean incompatibleLocks(long versionId, long snapshotId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM plan_demand pd WHERE pd.plan_version_id=? AND pd.is_locked
              AND (tass_teacher_eligible(pd.teacher_id,pd.demand_id) IS DISTINCT FROM TRUE OR NOT EXISTS (
                SELECT 1 FROM input_snapshot sn CROSS JOIN LATERAL jsonb_array_elements(sn.payload_json->'demands') d
                WHERE sn.id=? AND (d->>'id')::bigint=pd.demand_id
                  AND (d->>'periods_per_week')::numeric=pd.periods_per_week_snapshot)))
            """, Boolean.class, versionId, snapshotId));
    }

    public void replaceSnapshot(long versionId, long snapshotId) {
        // b_guard_version increments revision for the changed snapshot identity.
        jdbc.update("UPDATE plan_version SET input_snapshot_id=? WHERE id=?", snapshotId, versionId);
    }

    public void synchronizeDemands(long versionId, long snapshotId) {
        jdbc.update("""
            DELETE FROM plan_demand pd WHERE pd.plan_version_id=? AND NOT EXISTS (
              SELECT 1 FROM input_snapshot sn CROSS JOIN LATERAL jsonb_array_elements(sn.payload_json->'demands') d
              WHERE sn.id=? AND (d->>'id')::bigint=pd.demand_id)
            """, versionId, snapshotId);
        jdbc.update("""
            WITH desired AS (
              SELECT pd.id,(d->>'periods_per_week')::numeric AS periods,
                CASE WHEN pd.teacher_id IS NOT NULL AND tass_teacher_eligible(pd.teacher_id,pd.demand_id)
                     THEN pd.teacher_id END AS teacher_id
              FROM plan_demand pd CROSS JOIN input_snapshot sn
              CROSS JOIN LATERAL jsonb_array_elements(sn.payload_json->'demands') d
              WHERE pd.plan_version_id=? AND sn.id=? AND (d->>'id')::bigint=pd.demand_id
            )
            UPDATE plan_demand pd SET periods_per_week_snapshot=d.periods,teacher_id=d.teacher_id,
              unassigned_reason_code=CASE WHEN d.teacher_id IS NOT NULL THEN NULL
                WHEN pd.teacher_id IS NOT NULL THEN 'INELIGIBLE_AFTER_REFRESH' ELSE pd.unassigned_reason_code END,
              unassigned_reason_text=CASE WHEN d.teacher_id IS NOT NULL THEN NULL
                WHEN pd.teacher_id IS NOT NULL THEN 'Giáo viên không còn đủ điều kiện sau khi làm mới dữ liệu.' ELSE pd.unassigned_reason_text END
            FROM desired d WHERE pd.id=d.id AND
              (pd.periods_per_week_snapshot IS DISTINCT FROM d.periods OR pd.teacher_id IS DISTINCT FROM d.teacher_id)
            """, versionId, snapshotId);
        jdbc.update("""
            INSERT INTO plan_demand(plan_version_id,demand_id,periods_per_week_snapshot,unassigned_reason_code,unassigned_reason_text)
            SELECT ?, (d->>'id')::bigint,(d->>'periods_per_week')::numeric,'NOT_ASSIGNED','Chưa được phân công.'
            FROM input_snapshot sn CROSS JOIN LATERAL jsonb_array_elements(sn.payload_json->'demands') d
            WHERE sn.id=? AND NOT EXISTS (SELECT 1 FROM plan_demand pd
              WHERE pd.plan_version_id=? AND pd.demand_id=(d->>'id')::bigint)
            ORDER BY (d->>'id')::bigint
            """, versionId, snapshotId, versionId);
    }

    private static final String READ = """
        SELECT p.id plan_id,p.round_id,p.plan_code,p.current_version_id,v.id version_id,v.version_no,
          v.source_version_id,v.status,v.revision_no,v.id=p.current_version_id is_current,
          sn.id input_snapshot_id,sn.snapshot_schema_version,sn.content_hash,sn.source_revision_token,
          r.source_revision_token live_source_revision_token,
          sn.source_revision_token=r.source_revision_token snapshot_fresh,
          sn.optimization_config_id,sn.rule_set_version_id,sn.captured_at,v.created_by,v.created_at,
          (SELECT count(*) FROM plan_demand pd WHERE pd.plan_version_id=v.id) demand_count,
          (SELECT count(*) FROM plan_demand pd WHERE pd.plan_version_id=v.id AND pd.is_locked) locked_count
        FROM assignment_plan p JOIN plan_version v ON v.plan_id=p.id
        JOIN input_snapshot sn ON sn.id=v.input_snapshot_id JOIN assignment_round r ON r.id=p.round_id
        """;

    public Optional<PlanVersionDto> current(long roundId) {
        return jdbc.query(READ + " WHERE p.round_id=? AND v.id=p.current_version_id", this::map, roundId).stream().findFirst();
    }

    public Optional<PlanVersionDto> version(long versionId) {
        return jdbc.query(READ + " WHERE v.id=?", this::map, versionId).stream().findFirst();
    }

    private PlanVersionDto map(ResultSet rs, int row) throws SQLException {
        Long source = rs.getObject("source_version_id") == null ? null : rs.getLong("source_version_id");
        return new PlanVersionDto(rs.getLong("plan_id"),rs.getLong("round_id"),rs.getString("plan_code"),
            rs.getLong("current_version_id"),rs.getLong("version_id"),rs.getInt("version_no"),source,
            rs.getString("status"),rs.getLong("revision_no"),rs.getBoolean("is_current"),rs.getLong("input_snapshot_id"),
            rs.getInt("snapshot_schema_version"),rs.getString("content_hash"),rs.getString("source_revision_token"),
            rs.getString("live_source_revision_token"),rs.getBoolean("snapshot_fresh"),rs.getLong("optimization_config_id"),
            rs.getLong("rule_set_version_id"),rs.getObject("captured_at",OffsetDateTime.class),
            rs.getLong("created_by"),rs.getObject("created_at",OffsetDateTime.class),rs.getLong("demand_count"),rs.getLong("locked_count"));
    }
}
