package vn.edu.tass.backend.repository;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Types;
import java.time.LocalDate;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import vn.edu.tass.backend.payload.dto.RoundReadinessDto.Coverage;

@Repository
public class RoundReadinessRepository {
    public record Context(String sourceToken, LocalDate startsOn, LocalDate endsOn,
                          boolean validationAllowsRelease, boolean pendingFeedback) {}
    public record Finding(String code, String severity, String category, String entityType, Long entityId, Long relatedId) {}

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    private final String issuesSql;

    public RoundReadinessRepository(JdbcTemplate jdbc) throws IOException {
        this.jdbc = jdbc;
        this.named = new NamedParameterJdbcTemplate(jdbc);
        this.issuesSql = new ClassPathResource("db/round-readiness-issues.sql").getContentAsString(StandardCharsets.UTF_8);
    }

    public Context context(long roundId) {
        return jdbc.queryForObject("""
            WITH scoped AS (
                SELECT d.valid_from,d.valid_to FROM teaching_demand d JOIN assignment_round rr ON rr.semester_id=d.semester_id
                WHERE rr.id=? AND d.status='ACTIVE' AND EXISTS (
                    SELECT 1 FROM round_subject_scope sc JOIN class_subject_applicability a ON a.scope_id=sc.id
                    WHERE sc.round_id=rr.id AND sc.subject_id=d.subject_id AND a.class_id=d.class_id AND a.status='APPLICABLE')
            )
            SELECT r.source_revision_token,
                coalesce((SELECT min(valid_from) FROM scoped),se.starts_on) starts_on,
                coalesce((SELECT max(valid_to) FROM scoped),se.ends_on) ends_on,
                EXISTS(SELECT 1 FROM validation_run vr WHERE vr.plan_version_id=p.current_version_id
                    AND vr.id=(SELECT latest.id FROM validation_run latest WHERE latest.plan_version_id=p.current_version_id
                        AND tass_validation_is_fresh(latest.id) ORDER BY latest.checked_at DESC,latest.id DESC LIMIT 1)
                    AND tass_validation_is_fresh(vr.id) AND vr.overall_status<>'VIOLATION'
                    AND EXISTS(SELECT 1 FROM validation_result x WHERE x.validation_run_id=vr.id)
                    AND NOT EXISTS(SELECT 1 FROM validation_result x WHERE x.validation_run_id=vr.id AND
                        (x.result_status='VIOLATION' OR (x.result_status='INSUFFICIENT_DATA' AND x.calculation_period NOT LIKE 'ACADEMIC_YEAR:%')))) validation_ready,
                EXISTS(SELECT 1 FROM feedback f WHERE f.plan_id=p.id AND f.status='PENDING') pending_feedback
            FROM assignment_round r JOIN semester se ON se.id=r.semester_id
            LEFT JOIN assignment_plan p ON p.round_id=r.id WHERE r.id=?
            """, (rs, row) -> new Context(rs.getString("source_revision_token"),rs.getObject("starts_on",LocalDate.class),
                rs.getObject("ends_on",LocalDate.class),rs.getBoolean("validation_ready"),rs.getBoolean("pending_feedback")), roundId,roundId);
    }

    public Coverage coverage(long roundId) {
        return jdbc.queryForObject("""
            SELECT count(*) total,count(*) FILTER(WHERE coverage_status='ASSIGNED') assigned,
                count(*) FILTER(WHERE coverage_status='UNASSIGNED') unassigned,
                count(*) FILTER(WHERE coverage_status='MISSING_DEMAND') missing_demand,
                count(*) FILTER(WHERE coverage_status='MISSING_PLAN_ROW') missing_plan
            FROM v_tass_required_coverage WHERE round_id=?
            """, (rs,row) -> new Coverage(rs.getLong("total"),rs.getLong("assigned"),rs.getLong("unassigned"),
                rs.getLong("missing_demand"),rs.getLong("missing_plan")), roundId);
    }

    public List<Finding> findings(long roundId, Long configId, Long rulesId) {
        var params = new MapSqlParameterSource().addValue("roundId",roundId)
            .addValue("configId",configId,Types.BIGINT).addValue("rulesId",rulesId,Types.BIGINT);
        return named.query(issuesSql,params,(rs,row) -> new Finding(rs.getString("code"),rs.getString("severity"),
            rs.getString("category"),rs.getString("entity_type"),
            rs.getObject("entity_id") == null ? null : rs.getLong("entity_id"),
            rs.getObject("related_id") == null ? null : rs.getLong("related_id")));
    }
}
