package vn.edu.tass.backend.service.impl;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.exception.PlanConflictException;
import vn.edu.tass.backend.payload.dto.AssignmentPlanDto;
import vn.edu.tass.backend.payload.request.CreateAssignmentPlanRequest;
import vn.edu.tass.backend.service.AssignmentPlanService;
import vn.edu.tass.backend.utils.CrudParameters;

@Service
@RequiredArgsConstructor
public class AssignmentPlanServiceImpl implements AssignmentPlanService {
    private final JdbcTemplate jdbc;

    @Override
    @Transactional(readOnly = true)
    public AssignmentPlanDto retrieve(long roundId) {
        CrudParameters.requireId(roundId);
        requireRound(roundId, false);
        return loadPlan(roundId);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AssignmentPlanDto create(long roundId, CreateAssignmentPlanRequest request) {
        CrudParameters.requireId(roundId);
        RoundContext round = requireRound(roundId, true);
        if (jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM assignment_plan WHERE round_id = ?)",
                Boolean.class, roundId)) {
            throw new PlanConflictException("PLAN_ALREADY_EXISTS", "Đợt đã có phương án làm việc");
        }
        if (!Objects.equals(round.sourceRevisionToken(), request.sourceRevisionToken())) {
            throw new PlanConflictException("STALE_SOURCE_REVISION", "Dữ liệu nguồn đã thay đổi; hãy tải lại readiness");
        }
        if (!exists("SELECT EXISTS(SELECT 1 FROM user_account WHERE id = ? AND school_id = ?)",
                request.createdBy(), round.schoolId())) {
            throw new BadRequestException("created_by phải là tài khoản của trường thuộc đợt");
        }
        if (!exists("SELECT EXISTS(SELECT 1 FROM optimization_config WHERE id = ? AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL)",
                request.optimizationConfigId())) {
            throw new BadRequestException("optimization_config_id phải là cấu hình đã xác nhận");
        }
        if (!exists("""
                SELECT EXISTS(SELECT 1 FROM rule_set_version r WHERE r.id = ?
                    AND r.confirmed_by IS NOT NULL AND r.confirmed_at IS NOT NULL
                    AND r.valid_from <= ? AND (r.valid_to IS NULL OR r.valid_to >= ?)
                    AND EXISTS(SELECT 1 FROM rule_definition d WHERE d.rule_set_version_id = r.id
                        AND d.valid_from <= ? AND (d.valid_to IS NULL OR d.valid_to >= ?)))
                """, request.ruleSetVersionId(), round.startsOn(), round.endsOn(),
                round.startsOn(), round.endsOn())) {
            throw new BadRequestException("rule_set_version_id phải là bộ quy tắc đã xác nhận và có hiệu lực cả học kỳ");
        }
        String planCode = request.planCode().strip();
        // The database function captures the snapshot itself; the client cannot supply its contents.
        Long snapshotId = jdbc.queryForObject("SELECT tass_capture_snapshot(?, ?, ?, '[]'::jsonb)",
            Long.class, roundId, request.optimizationConfigId(), request.ruleSetVersionId());
        Long planId = jdbc.queryForObject("""
            INSERT INTO assignment_plan(round_id, plan_code, created_by)
            VALUES (?, ?, ?) RETURNING id
            """, Long.class, roundId, planCode, request.createdBy());
        Long versionId = jdbc.queryForObject("""
            INSERT INTO plan_version(plan_id, version_no, status, revision_no, input_snapshot_id, created_by)
            VALUES (?, 1, 'DRAFT', 0, ?, ?) RETURNING id
            """, Long.class, planId, snapshotId, request.createdBy());
        jdbc.update("UPDATE assignment_plan SET current_version_id = ? WHERE id = ?", versionId, planId);
        return loadPlan(roundId);
    }

    private RoundContext requireRound(long roundId, boolean lock) {
        String sql = """
            SELECT r.source_revision_token, y.school_id, s.starts_on, s.ends_on
            FROM assignment_round r
            JOIN semester s ON s.id = r.semester_id
            JOIN academic_year y ON y.id = s.academic_year_id
            WHERE r.id = ?
            """ + (lock ? " FOR UPDATE OF r" : "");
        return jdbc.query(sql, (rs, row) -> new RoundContext(rs.getString("source_revision_token"),
            rs.getLong("school_id"), rs.getDate("starts_on").toLocalDate(),
            rs.getDate("ends_on").toLocalDate()), roundId).stream().findFirst()
            .orElseThrow(() -> new NotFoundException("assignment_round id=" + roundId + " does not exist"));
    }

    private AssignmentPlanDto loadPlan(long roundId) {
        return jdbc.query("""
            SELECT p.id plan_id, p.round_id, p.plan_code, p.created_by plan_created_by,
                p.created_at plan_created_at, v.id version_id, v.version_no, v.status,
                v.revision_no, v.input_snapshot_id, v.created_by version_created_by,
                v.created_at version_created_at, sn.source_revision_token,
                sn.optimization_config_id, sn.rule_set_version_id
            FROM assignment_plan p
            JOIN plan_version v ON v.id = p.current_version_id AND v.plan_id = p.id
            JOIN input_snapshot sn ON sn.id = v.input_snapshot_id AND sn.round_id = p.round_id
            WHERE p.round_id = ?
            """, (rs, row) -> toDto(rs), roundId).stream().findFirst()
            .orElseThrow(() -> new NotFoundException("assignment_plan for round id=" + roundId + " does not exist"));
    }

    private boolean exists(String sql, Object... args) {
        return Boolean.TRUE.equals(jdbc.queryForObject(sql, Boolean.class, args));
    }

    private static AssignmentPlanDto toDto(ResultSet rs) throws SQLException {
        return new AssignmentPlanDto(rs.getLong("plan_id"), rs.getLong("round_id"),
            rs.getString("plan_code"), rs.getLong("plan_created_by"),
            rs.getObject("plan_created_at", OffsetDateTime.class),
            new AssignmentPlanDto.CurrentVersion(rs.getLong("version_id"), rs.getInt("version_no"),
                rs.getString("status"), rs.getLong("revision_no"), rs.getLong("input_snapshot_id"),
                rs.getString("source_revision_token"), rs.getLong("optimization_config_id"),
                rs.getLong("rule_set_version_id"), rs.getLong("version_created_by"),
                rs.getObject("version_created_at", OffsetDateTime.class)));
    }

    private record RoundContext(String sourceRevisionToken, long schoolId, LocalDate startsOn,
                                LocalDate endsOn) {}
}
