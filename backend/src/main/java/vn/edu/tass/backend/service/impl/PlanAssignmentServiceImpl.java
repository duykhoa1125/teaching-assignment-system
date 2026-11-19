package vn.edu.tass.backend.service.impl;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Date;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.exception.PlanConflictException;
import vn.edu.tass.backend.exception.PlanValidationException;
import vn.edu.tass.backend.payload.dto.PlanAssignmentDto;
import vn.edu.tass.backend.payload.dto.PlanAssignmentUpdateDto;
import vn.edu.tass.backend.payload.request.UpdatePlanAssignmentRequest;
import vn.edu.tass.backend.service.PlanAssignmentService;
import vn.edu.tass.backend.utils.CrudParameters;

@Service
@RequiredArgsConstructor
public class PlanAssignmentServiceImpl implements PlanAssignmentService {
    private static final Set<String> DEMAND_TYPES = Set.of("STANDARD", "SPECIALIZED_TOPIC", "ENRICHMENT");
    private final JdbcTemplate jdbc;

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PlanAssignmentUpdateDto update(long versionId, long demandId,
            UpdatePlanAssignmentRequest request) {
        CrudParameters.requireId(versionId);
        CrudParameters.requireId(demandId);
        if (request == null) throw new BadRequestException("Request body is required");
        String reasonCode = request.unassignedReasonCode();
        String reasonText = request.unassignedReasonText();
        if (request.teacherId() == null) {
            if (reasonCode == null || reasonCode.isBlank() || reasonText == null || reasonText.isBlank()) {
                throw new BadRequestException("unassigned_reason_code and unassigned_reason_text are required when teacher_id is null");
            }
            reasonCode = reasonCode.strip();
            reasonText = reasonText.strip();
        } else if (reasonCode != null || reasonText != null) {
            throw new BadRequestException("Unassigned reasons must be omitted when teacher_id is set");
        }

        // The plan, version and round are locked in one transaction before comparing revision and source token.
        VersionContext context = jdbc.query("""
            SELECT p.current_version_id, v.status, v.revision_no, v.input_snapshot_id,
                sn.source_revision_token snapshot_token, r.source_revision_token live_token
            FROM plan_version v JOIN assignment_plan p ON p.id = v.plan_id
            JOIN input_snapshot sn ON sn.id = v.input_snapshot_id
            JOIN assignment_round r ON r.id = p.round_id
            WHERE v.id = ? FOR UPDATE OF p, v, r
            """, (rs, row) -> new VersionContext(rs.getLong("current_version_id"),
                rs.getString("status"), rs.getLong("revision_no"),
                rs.getLong("input_snapshot_id"), rs.getString("snapshot_token"),
                rs.getString("live_token")), versionId).stream().findFirst()
            .orElseThrow(() -> new NotFoundException("plan_version id=" + versionId + " does not exist"));
        if (context.currentVersionId() != versionId) {
            throw new PlanConflictException("PLAN_VERSION_NOT_CURRENT", "Only the current plan version can be edited");
        }
        if (!"DRAFT".equals(context.status())) {
            throw new PlanConflictException("PLAN_VERSION_NOT_DRAFT", "Only a DRAFT version can be edited");
        }
        if (!context.snapshotToken().equals(context.liveToken())
                || !context.liveToken().equals(request.sourceRevisionToken())) {
            throw new PlanConflictException("STALE_SOURCE_REVISION", "Source data changed; reload readiness and the plan");
        }
        if (context.revisionNo() != request.expectedRevisionNo()) {
            throw new PlanConflictException("STALE_REVISION", "Plan revision changed; reload assignments");
        }

        ExistingAssignment existing = jdbc.query("""
            SELECT id, teacher_id, is_locked, unassigned_reason_code, unassigned_reason_text
            FROM plan_demand WHERE plan_version_id = ? AND demand_id = ? FOR UPDATE
            """, (rs, row) -> new ExistingAssignment(rs.getLong("id"),
                rs.getObject("teacher_id", Long.class), rs.getBoolean("is_locked"),
                rs.getString("unassigned_reason_code"), rs.getString("unassigned_reason_text")),
                versionId, demandId).stream().findFirst().orElse(null);
        DemandContext demand = jdbc.query("""
            SELECT (d->>'periods_per_week')::numeric periods_per_week,
                (d->>'valid_from')::date valid_from, (d->>'valid_to')::date valid_to
            FROM input_snapshot sn CROSS JOIN LATERAL jsonb_array_elements(sn.payload_json->'demands') d
            WHERE sn.id = ? AND (d->>'id')::bigint = ?
            """, (rs, row) -> new DemandContext(rs.getBigDecimal("periods_per_week"),
                rs.getObject("valid_from", LocalDate.class),
                rs.getObject("valid_to", LocalDate.class)), context.snapshotId(), demandId)
            .stream().findFirst().orElseThrow(() -> new PlanValidationException(
                "DEMAND_NOT_IN_SNAPSHOT", "Demand is not active in this version's snapshot"));

        if (existing == null && !Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM input_snapshot sn,
                    jsonb_array_elements(sn.payload_json->'required_components') rc,
                    jsonb_array_elements(sn.payload_json->'applicability') a,
                    jsonb_array_elements(sn.payload_json->'demands') d
                    WHERE sn.id = ? AND (rc->>'demand_id')::bigint = ?
                        AND (d->>'id')::bigint = ?
                        AND (a->>'id')::bigint = (rc->>'applicability_id')::bigint
                        AND a->>'status' = 'APPLICABLE'
                        AND rc->>'demand_type' = d->>'demand_type'
                        AND rc->>'valid_from' = d->>'valid_from'
                        AND rc->>'valid_to' = d->>'valid_to')
                """, Boolean.class, context.snapshotId(), demandId, demandId))) {
            throw new PlanValidationException("DEMAND_NOT_IN_REQUIRED_SNAPSHOT",
                "A new assignment row requires a linked applicable required component");
        }
        if (existing != null && existing.isLocked()
                && !java.util.Objects.equals(existing.teacherId(), request.teacherId())) {
            throw new PlanConflictException("LOCK_CONFLICT", "Unlock this assignment before changing its teacher");
        }

        if (request.teacherId() != null
                && (existing == null || !request.teacherId().equals(existing.teacherId()))) {
            if (!Boolean.TRUE.equals(jdbc.queryForObject(
                    "SELECT tass_teacher_eligible(?, ?)", Boolean.class, request.teacherId(), demandId))) {
                throw new PlanValidationException("TEACHER_INELIGIBLE",
                    "Teacher lacks effective employment or verified subject and education-level qualification");
            }
            requireLoadWithinConfiguredLimit(versionId, context.snapshotId(), request.teacherId(), demand);
        }

        if (existing == null) {
            jdbc.update("""
                INSERT INTO plan_demand(plan_version_id, demand_id, periods_per_week_snapshot,
                    teacher_id, unassigned_reason_code, unassigned_reason_text)
                VALUES (?, ?, ?, ?, ?, ?)
                """, versionId, demandId, demand.periodsPerWeek(), request.teacherId(), reasonCode, reasonText);
        } else if (!java.util.Objects.equals(existing.teacherId(), request.teacherId())
                || !java.util.Objects.equals(existing.reasonCode(), reasonCode)
                || !java.util.Objects.equals(existing.reasonText(), reasonText)) {
            jdbc.update("""
                UPDATE plan_demand SET teacher_id = ?, unassigned_reason_code = ?,
                    unassigned_reason_text = ? WHERE id = ?
                """, request.teacherId(), reasonCode, reasonText, existing.id());
        }

        // The PostgreSQL plan_demand trigger owns the revision increment and audit row.
        return jdbc.queryForObject("""
            SELECT v.revision_no, pd.id, pd.teacher_id, pd.is_locked,
                pd.unassigned_reason_code, pd.unassigned_reason_text
            FROM plan_version v JOIN plan_demand pd ON pd.plan_version_id = v.id
            WHERE v.id = ? AND pd.demand_id = ?
            """, (rs, row) -> new PlanAssignmentUpdateDto(versionId,
                rs.getLong("revision_no"), rs.getLong("id"), demandId,
                rs.getObject("teacher_id", Long.class),
                rs.getObject("teacher_id") == null ? "UNASSIGNED" : "ASSIGNED",
                rs.getBoolean("is_locked"), rs.getString("unassigned_reason_code"),
                rs.getString("unassigned_reason_text")), versionId, demandId);
    }

    private void requireLoadWithinConfiguredLimit(long versionId, long snapshotId,
            long teacherId, DemandContext demand) {
        BigDecimal cap = jdbc.queryForObject("""
            SELECT CASE WHEN jsonb_typeof(payload_json #>
                    '{optimization_config,criteria_weights_json,hard_limits,max_total_weekly}') = 'number'
                THEN (payload_json #>>
                    '{optimization_config,criteria_weights_json,hard_limits,max_total_weekly}')::numeric END
            FROM input_snapshot WHERE id = ?
            """, BigDecimal.class, snapshotId);
        if (cap == null || cap.signum() <= 0) {
            throw new PlanValidationException("LOAD_RULE_UNAVAILABLE",
                "Snapshot has no configured weekly workload limit; assignment cannot be checked");
        }
        LoadCheck load = jdbc.queryForObject("""
            SELECT count(*) total_days, count(w.teacher_id) assessed_days,
                bool_and(w.weekly_complete AND w.is_teaching AND w.t IS NOT NULL) complete,
                max(w.t + ?) peak_total
            FROM generate_series(?::date, ?::date, interval '1 day') day_range(day)
            LEFT JOIN LATERAL (
                SELECT teacher_id, weekly_complete, is_teaching, t
                FROM tass_snapshot_weekly_load(?, day_range.day::date)
                WHERE teacher_id = ?
            ) w ON TRUE
            """, (rs, row) -> new LoadCheck(rs.getLong("total_days"),
                rs.getLong("assessed_days"), rs.getObject("complete", Boolean.class),
                rs.getBigDecimal("peak_total")), demand.periodsPerWeek(),
            Date.valueOf(demand.validFrom()), Date.valueOf(demand.validTo()), versionId, teacherId);
        if (load == null || load.totalDays() == 0 || load.assessedDays() != load.totalDays()
                || !Boolean.TRUE.equals(load.complete()) || load.peakTotal() == null) {
            throw new PlanValidationException("INSUFFICIENT_WORKLOAD_DATA",
                "Weekly workload inputs are missing for at least one day of the demand interval");
        }
        if (load.peakTotal().compareTo(cap) > 0) {
            throw new PlanValidationException("WORKLOAD_LIMIT_EXCEEDED",
                "Assignment exceeds the configured snapshot weekly workload limit");
        }
    }

    private record VersionContext(long currentVersionId, String status, long revisionNo,
        long snapshotId, String snapshotToken, String liveToken) {}
    private record DemandContext(BigDecimal periodsPerWeek, LocalDate validFrom, LocalDate validTo) {}
    private record ExistingAssignment(long id, Long teacherId, boolean isLocked,
        String reasonCode, String reasonText) {}
    private record LoadCheck(long totalDays, long assessedDays, Boolean complete,
        BigDecimal peakTotal) {}

    @Override
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public List<PlanAssignmentDto> retrieve(long versionId, int limit, long offset, Long teacherId,
            Long classId, Long subjectId, String demandType, LocalDate asOf) {
        CrudParameters.requireId(versionId);
        CrudParameters.requirePage(limit, offset);
        if (teacherId != null) CrudParameters.requireId(teacherId);
        if (classId != null) CrudParameters.requireId(classId);
        if (subjectId != null) CrudParameters.requireId(subjectId);
        if (demandType != null && !DEMAND_TYPES.contains(demandType)) {
            throw new BadRequestException("demand_type must be STANDARD, SPECIALIZED_TOPIC or ENRICHMENT");
        }
        if (!Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM plan_version WHERE id = ?)", Boolean.class, versionId))) {
            throw new NotFoundException("plan_version id=" + versionId + " does not exist");
        }

        // All descriptive fields and effective dates come from this version's immutable snapshot.
        // Live source rows may have changed since an older version was captured.
        StringBuilder sql = new StringBuilder("""
            WITH version_context AS (
                SELECT v.id version_id, sn.payload_json payload
                FROM plan_version v JOIN input_snapshot sn ON sn.id = v.input_snapshot_id
                WHERE v.id = ?
            ), captured_scope AS (
                SELECT x.* FROM version_context vc
                CROSS JOIN LATERAL jsonb_to_recordset(vc.payload->'scope') AS x(id BIGINT, subject_id BIGINT)
            ), captured_applicability AS (
                SELECT x.* FROM version_context vc
                CROSS JOIN LATERAL jsonb_to_recordset(vc.payload->'applicability')
                    AS x(id BIGINT, scope_id BIGINT, class_id BIGINT, status TEXT)
            ), captured_required AS (
                SELECT x.* FROM version_context vc
                CROSS JOIN LATERAL jsonb_to_recordset(vc.payload->'required_components')
                    AS x(id BIGINT, applicability_id BIGINT, demand_id BIGINT,
                         demand_type TEXT, valid_from DATE, valid_to DATE)
            ), captured_demands AS (
                SELECT x.* FROM version_context vc
                CROSS JOIN LATERAL jsonb_to_recordset(vc.payload->'demands')
                    AS x(id BIGINT, class_id BIGINT, subject_id BIGINT, demand_type TEXT,
                         valid_from DATE, valid_to DATE, periods_per_week NUMERIC, unit TEXT)
            ), captured_classes AS (
                SELECT x.* FROM version_context vc
                CROSS JOIN LATERAL jsonb_to_recordset(vc.payload->'classes')
                    AS x(id BIGINT, class_code TEXT)
            ), captured_subjects AS (
                SELECT x.* FROM version_context vc
                CROSS JOIN LATERAL jsonb_to_recordset(vc.payload->'subjects')
                    AS x(id BIGINT, subject_code TEXT)
            ), captured_teachers AS (
                SELECT x.* FROM version_context vc
                CROSS JOIN LATERAL jsonb_to_recordset(vc.payload->'teachers')
                    AS x(id BIGINT, teacher_code TEXT, full_name TEXT)
            ), required_rows AS (
                SELECT rc.id required_component_id, rc.demand_id, a.class_id, sc.subject_id,
                    rc.demand_type, rc.valid_from, rc.valid_to, d.periods_per_week, d.unit
                FROM captured_required rc
                JOIN captured_applicability a ON a.id = rc.applicability_id AND a.status = 'APPLICABLE'
                JOIN captured_scope sc ON sc.id = a.scope_id
                LEFT JOIN captured_demands d ON d.id = rc.demand_id
            ), assignment_rows AS (
                SELECT * FROM required_rows
                UNION ALL
                SELECT NULL::BIGINT, pd.demand_id, d.class_id, d.subject_id, d.demand_type,
                    d.valid_from, d.valid_to, d.periods_per_week, d.unit
                FROM plan_demand pd
                JOIN version_context vc ON vc.version_id = pd.plan_version_id
                JOIN captured_demands d ON d.id = pd.demand_id
                WHERE NOT EXISTS (SELECT 1 FROM required_rows r WHERE r.demand_id = pd.demand_id)
            )
            SELECT ar.required_component_id, pd.id plan_demand_id, ar.demand_id,
                ar.class_id, c.class_code, ar.subject_id, s.subject_code,
                ar.demand_type, ar.valid_from, ar.valid_to,
                COALESCE(pd.periods_per_week_snapshot, ar.periods_per_week) periods_per_week,
                ar.unit, pd.teacher_id, t.teacher_code, t.full_name teacher_name,
                CASE WHEN ar.demand_id IS NULL OR ar.periods_per_week IS NULL THEN 'MISSING_DEMAND'
                     WHEN pd.id IS NULL THEN 'MISSING_PLAN_ROW'
                     WHEN pd.teacher_id IS NULL THEN 'UNASSIGNED'
                     ELSE 'ASSIGNED' END coverage_status,
                pd.is_locked, pd.locked_by, pd.locked_at, pd.lock_reason,
                pd.unassigned_reason_code, pd.unassigned_reason_text
            FROM assignment_rows ar
            LEFT JOIN plan_demand pd ON pd.plan_version_id = ? AND pd.demand_id = ar.demand_id
            LEFT JOIN captured_classes c ON c.id = ar.class_id
            LEFT JOIN captured_subjects s ON s.id = ar.subject_id
            LEFT JOIN captured_teachers t ON t.id = pd.teacher_id
            WHERE 1=1
            """);
        List<Object> args = new ArrayList<>();
        args.add(versionId);
        args.add(versionId);
        if (teacherId != null) { sql.append(" AND pd.teacher_id = ?"); args.add(teacherId); }
        if (classId != null) { sql.append(" AND ar.class_id = ?"); args.add(classId); }
        if (subjectId != null) { sql.append(" AND ar.subject_id = ?"); args.add(subjectId); }
        if (demandType != null) { sql.append(" AND ar.demand_type = ?"); args.add(demandType); }
        if (asOf != null) {
            sql.append(" AND ? BETWEEN ar.valid_from AND ar.valid_to");
            args.add(asOf);
        }
        sql.append("""

            ORDER BY ar.class_id, ar.subject_id, ar.valid_from, ar.demand_type,
                ar.required_component_id NULLS LAST, ar.demand_id NULLS LAST
            LIMIT ? OFFSET ?
            """);
        args.add(limit);
        args.add(offset);
        return jdbc.query(sql.toString(), (rs, row) -> toDto(rs), args.toArray());
    }

    private static PlanAssignmentDto toDto(ResultSet rs) throws SQLException {
        return new PlanAssignmentDto(
            rs.getObject("required_component_id", Long.class),
            rs.getObject("plan_demand_id", Long.class),
            rs.getObject("demand_id", Long.class),
            rs.getObject("class_id", Long.class), rs.getString("class_code"),
            rs.getObject("subject_id", Long.class), rs.getString("subject_code"),
            rs.getString("demand_type"), rs.getObject("valid_from", LocalDate.class),
            rs.getObject("valid_to", LocalDate.class), rs.getBigDecimal("periods_per_week"),
            rs.getString("unit"), rs.getObject("teacher_id", Long.class),
            rs.getString("teacher_code"), rs.getString("teacher_name"),
            rs.getString("coverage_status"), rs.getObject("is_locked", Boolean.class),
            rs.getObject("locked_by", Long.class), rs.getObject("locked_at", OffsetDateTime.class),
            rs.getString("lock_reason"), rs.getString("unassigned_reason_code"),
            rs.getString("unassigned_reason_text"));
    }
}
