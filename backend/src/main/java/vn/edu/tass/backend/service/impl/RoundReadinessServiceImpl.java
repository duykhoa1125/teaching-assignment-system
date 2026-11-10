package vn.edu.tass.backend.service.impl;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.payload.dto.ReadinessIssueDto;
import vn.edu.tass.backend.payload.dto.ReadinessScopeDto;
import vn.edu.tass.backend.payload.dto.RoundReadinessDto;
import vn.edu.tass.backend.service.RoundReadinessService;
import vn.edu.tass.backend.utils.CrudParameters;

@Service
@RequiredArgsConstructor
public class RoundReadinessServiceImpl implements RoundReadinessService {
    private final JdbcTemplate jdbc;

    @Override
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public RoundReadinessDto getReadiness(long roundId) {
        CrudParameters.requireId(roundId);
        RoundContext context = jdbc.query("""
            SELECT r.id round_id, r.semester_id, r.source_revision_token,
              s.academic_year_id, s.starts_on, s.ends_on, y.school_id
            FROM assignment_round r
            JOIN semester s ON s.id = r.semester_id
            JOIN academic_year y ON y.id = s.academic_year_id
            WHERE r.id = ?
            """, (rs, row) -> new RoundContext(rs.getLong("round_id"), rs.getLong("semester_id"),
                rs.getLong("academic_year_id"), rs.getLong("school_id"),
                rs.getDate("starts_on").toLocalDate(), rs.getDate("ends_on").toLocalDate(),
                rs.getString("source_revision_token")), roundId)
            .stream().findFirst()
            .orElseThrow(() -> new NotFoundException("assignment_round id=" + roundId + " does not exist"));

        List<ReadinessIssueDto> missing = new ArrayList<>();
        List<ReadinessIssueDto> incomplete = new ArrayList<>();
        List<ReadinessIssueDto> warnings = new ArrayList<>();
        List<ReadinessScopeDto> scopes = checkScope(roundId, context.academicYearId(), incomplete);
        checkConfiguration(context.startsOn(), context.endsOn(), missing);
        List<Period> periods = checkPeriods(context.semesterId(), context.startsOn(), context.endsOn(), missing);
        checkTeachers(context.schoolId(), context.semesterId(), periods, missing, warnings);
        checkDemands(roundId, context.schoolId(), warnings);
        checkSchoolContext(context.semesterId(), warnings);

        return new RoundReadinessDto(context.roundId(), context.semesterId(), context.sourceRevisionToken(),
            missing.isEmpty() && incomplete.isEmpty(), scopes, missing, incomplete, warnings);
    }

    private List<ReadinessScopeDto> checkScope(long roundId, long academicYearId,
            List<ReadinessIssueDto> incomplete) {
        List<ReadinessIssueDto> preparation = jdbc.query("""
            SELECT issue, record_id FROM v_tass_preparation_issues
            WHERE round_id = ? ORDER BY issue, record_id
            """, (rs, row) -> viewIssue(rs.getString("issue"), rs.getLong("record_id")), roundId);
        incomplete.addAll(preparation);
        if (count("SELECT count(*) FROM round_subject_scope WHERE round_id = ?", roundId) == 0) {
            incomplete.add(issue("NO_SUBJECT_SCOPE", "assignment_round", roundId,
                "Đợt chưa có phạm vi môn/khối."));
        }
        jdbc.query("""
            SELECT sc.id FROM round_subject_scope sc WHERE sc.round_id = ?
              AND NOT EXISTS (SELECT 1 FROM school_class c
                WHERE c.grade_id = sc.grade_id AND c.academic_year_id = ?)
            ORDER BY sc.id
            """, (RowCallbackHandler) rs -> incomplete.add(issue("SCOPE_WITHOUT_CLASS", "round_subject_scope", rs.getLong(1),
                "Phạm vi môn/khối không có lớp trong năm học của đợt.")), roundId, academicYearId);
        return jdbc.query("""
            SELECT sc.id scope_id, sc.grade_id, sc.subject_id,
              (sc.confirmed_by IS NOT NULL AND sc.confirmed_at IS NOT NULL) confirmed,
              count(c.id) class_count,
              count(c.id) FILTER (WHERE a.status = 'APPLICABLE') applicable_count,
              count(c.id) FILTER (WHERE a.status = 'NOT_APPLICABLE') not_applicable_count,
              count(c.id) FILTER (WHERE a.status = 'UNDETERMINED') undetermined_count,
              count(c.id) FILTER (WHERE a.id IS NULL) missing_applicability_count,
              count(c.id) FILTER (WHERE a.status = 'APPLICABLE' AND
                (NOT EXISTS (SELECT 1 FROM required_demand_component rc WHERE rc.applicability_id = a.id)
                 OR EXISTS (SELECT 1 FROM required_demand_component rc
                   LEFT JOIN teaching_demand d ON d.id = rc.demand_id
                   WHERE rc.applicability_id = a.id AND (d.id IS NULL OR d.status <> 'ACTIVE'
                     OR d.class_id <> c.id OR d.subject_id <> sc.subject_id
                     OR d.semester_id <> r.semester_id OR d.demand_type <> rc.demand_type
                     OR d.valid_from <> rc.valid_from OR d.valid_to <> rc.valid_to)))) applicable_missing_demand_count
            FROM round_subject_scope sc JOIN assignment_round r ON r.id = sc.round_id
            LEFT JOIN school_class c ON c.grade_id = sc.grade_id AND c.academic_year_id = ?
            LEFT JOIN class_subject_applicability a ON a.scope_id = sc.id AND a.class_id = c.id
            WHERE sc.round_id = ?
            GROUP BY sc.id, sc.grade_id, sc.subject_id, sc.confirmed_by, sc.confirmed_at, r.semester_id
            ORDER BY sc.id
            """, (rs, row) -> new ReadinessScopeDto(rs.getLong("scope_id"), rs.getLong("grade_id"),
                rs.getLong("subject_id"), rs.getBoolean("confirmed"), rs.getLong("class_count"),
                rs.getLong("applicable_count"), rs.getLong("not_applicable_count"),
                rs.getLong("undetermined_count"), rs.getLong("missing_applicability_count"),
                rs.getLong("applicable_missing_demand_count")), academicYearId, roundId);
    }

    private void checkConfiguration(LocalDate startsOn, LocalDate endsOn,
            List<ReadinessIssueDto> missing) {
        if (count("SELECT count(*) FROM optimization_config WHERE confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL") == 0) {
            missing.add(issue("MISSING_OPTIMIZATION_CONFIG", "optimization_config", null,
                "Chưa có cấu hình tối ưu hóa đã xác nhận."));
        }
        if (count("""
            SELECT count(*) FROM rule_set_version r
            WHERE r.valid_from <= ? AND (r.valid_to IS NULL OR r.valid_to >= ?)
              AND r.confirmed_by IS NOT NULL AND r.confirmed_at IS NOT NULL
              AND EXISTS (SELECT 1 FROM rule_definition d WHERE d.rule_set_version_id = r.id
                AND d.valid_from <= ? AND (d.valid_to IS NULL OR d.valid_to >= ?))
            """, startsOn, endsOn, startsOn, endsOn) == 0) {
            missing.add(issue("MISSING_CONFIRMED_RULE_SET", "rule_set_version", null,
                "Chưa có bộ quy tắc đã xác nhận với định nghĩa còn hiệu lực cho cả học kỳ."));
        }
    }

    private List<Period> checkPeriods(long semesterId, LocalDate startsOn, LocalDate endsOn,
            List<ReadinessIssueDto> missing) {
        List<Period> periods = jdbc.query("""
            SELECT id, starts_on, ends_on FROM calculation_period
            WHERE semester_id = ? ORDER BY starts_on, id
            """, (rs, row) -> new Period(rs.getLong("id"),
                rs.getDate("starts_on").toLocalDate(), rs.getDate("ends_on").toLocalDate()), semesterId);
        if (periods.isEmpty()) {
            missing.add(issue("MISSING_CALCULATION_PERIOD", "semester", semesterId,
                "Học kỳ chưa có kỳ tính tải."));
            return periods;
        }
        LocalDate nextDay = startsOn;
        for (Period period : periods) {
            if (period.startsOn().isBefore(startsOn) || period.endsOn().isAfter(endsOn)) {
                missing.add(issue("CALCULATION_PERIOD_OUTSIDE_SEMESTER", "calculation_period", period.id(),
                    "Kỳ tính tải nằm ngoài khoảng ngày của học kỳ."));
            }
            if (period.startsOn().isAfter(nextDay)) {
                missing.add(issue("CALCULATION_PERIOD_GAP", "calculation_period", period.id(),
                    "Thiếu kỳ tính tải từ " + nextDay + " đến " + period.startsOn().minusDays(1) + "."));
            } else if (period.startsOn().isBefore(nextDay) && !nextDay.equals(startsOn)) {
                missing.add(issue("CALCULATION_PERIOD_OVERLAP", "calculation_period", period.id(),
                    "Kỳ tính tải chồng lấn kỳ trước."));
            }
            LocalDate afterPeriod = period.endsOn().plusDays(1);
            if (afterPeriod.isAfter(nextDay)) nextDay = afterPeriod;
        }
        if (!nextDay.isAfter(endsOn)) {
            missing.add(issue("CALCULATION_PERIOD_GAP", "semester", semesterId,
                "Thiếu kỳ tính tải từ " + nextDay + " đến " + endsOn + "."));
        }
        return periods;
    }

    private void checkTeachers(long schoolId, long semesterId, List<Period> periods,
            List<ReadinessIssueDto> missing, List<ReadinessIssueDto> warnings) {
        if (count("SELECT count(*) FROM teacher WHERE school_id = ?", schoolId) == 0) {
            missing.add(issue("MISSING_TEACHERS", "school", schoolId,
                "Trường chưa có giáo viên."));
        }
        if (!periods.isEmpty()) {
            jdbc.query("""
                SELECT t.id teacher_id, cp.id period_id FROM teacher t CROSS JOIN calculation_period cp
                WHERE t.school_id = ? AND cp.semester_id = ?
                  AND EXISTS (SELECT 1 FROM teacher_employment e WHERE e.teacher_id = t.id
                    AND e.semester_id = cp.semester_id AND e.employment_status = 'TEACHING'
                    AND e.valid_from <= cp.ends_on AND COALESCE(e.valid_to, cp.ends_on) >= cp.starts_on)
                  AND NOT EXISTS (
                  SELECT 1 FROM teacher_period_workload w
                  WHERE w.teacher_id = t.id AND w.calculation_period_id = cp.id
                    AND w.record_type = 'OUTSIDE_SCOPE_WEEKLY' AND w.verification_status = 'VERIFIED'
                    AND w.teaching_periods IS NOT NULL AND NULLIF(btrim(w.evidence_ref), '') IS NOT NULL)
                ORDER BY t.id, cp.id
                """, (RowCallbackHandler) rs -> missing.add(issue("MISSING_VERIFIED_WEEKLY_INPUT", "teacher", rs.getLong("teacher_id"),
                    "Thiếu tải ngoài phạm vi đã xác nhận cho kỳ tính tải " + rs.getLong("period_id") + ".")),
                schoolId, semesterId);
            jdbc.query("""
                SELECT t.id teacher_id, cp.id period_id FROM teacher t CROSS JOIN calculation_period cp
                WHERE t.school_id = ? AND cp.semester_id = ?
                  AND EXISTS (SELECT 1 FROM teacher_employment e WHERE e.teacher_id = t.id
                    AND e.semester_id = cp.semester_id AND e.employment_status = 'TEACHING'
                    AND e.valid_from <= cp.ends_on AND COALESCE(e.valid_to, cp.ends_on) >= cp.starts_on)
                  AND NOT COALESCE((
                  SELECT range_agg(daterange(b.valid_from, b.valid_to, '[]'))
                  FROM teacher_workload_basis b WHERE b.teacher_id = t.id AND b.semester_id = cp.semester_id
                    AND b.verification_status = 'VERIFIED' AND b.unit = 'PERIOD_PER_WEEK'
                  ) @> daterange(cp.starts_on, cp.ends_on, '[]'), FALSE)
                ORDER BY t.id, cp.id
                """, (RowCallbackHandler) rs -> missing.add(issue("MISSING_VERIFIED_WORKLOAD_BASIS", "teacher", rs.getLong("teacher_id"),
                    "Thiếu cơ sở định mức đã xác nhận cho kỳ tính tải " + rs.getLong("period_id") + ".")),
                schoolId, semesterId);
        }
        checkUnverifiedWorkloadParts(schoolId, semesterId, missing);
        jdbc.query("""
            SELECT t.id FROM teacher t WHERE t.school_id = ?
              AND EXISTS (SELECT 1 FROM teacher_employment e WHERE e.teacher_id = t.id
                AND e.semester_id = ? AND e.employment_status = 'TEACHING')
              AND NOT EXISTS (SELECT 1 FROM teaching_history h WHERE h.teacher_id = t.id
                AND h.verification_status = 'VERIFIED')
            ORDER BY t.id
            """, (RowCallbackHandler) rs -> warnings.add(issue("NO_VERIFIED_TEACHING_HISTORY", "teacher", rs.getLong(1),
                "Giáo viên chưa có lịch sử thực dạy đã xác nhận; vẫn có thể chạy với dữ liệu khác.")),
            schoolId, semesterId);
    }

    private void checkUnverifiedWorkloadParts(long schoolId, long semesterId,
            List<ReadinessIssueDto> missing) {
        jdbc.query("""
            SELECT d.id FROM teacher_duty d JOIN teacher t ON t.id = d.teacher_id
            WHERE t.school_id = ? AND d.semester_id = ?
              AND (d.verification_status <> 'VERIFIED' OR d.reduction_value IS NULL)
            ORDER BY d.id
            """, (RowCallbackHandler) rs -> missing.add(issue("UNVERIFIED_DUTY_LOAD", "teacher_duty", rs.getLong(1),
                "Nhiệm vụ chưa xác nhận hoặc thiếu giá trị giảm tải.")), schoolId, semesterId);
        jdbc.query("""
            SELECT r.id FROM teacher_reduction r JOIN teacher t ON t.id = r.teacher_id
            WHERE t.school_id = ? AND r.semester_id = ?
              AND (r.verification_status <> 'VERIFIED' OR r.reduction_value IS NULL)
            ORDER BY r.id
            """, (RowCallbackHandler) rs -> missing.add(issue("UNVERIFIED_REDUCTION_LOAD", "teacher_reduction", rs.getLong(1),
                "Khoản giảm tải chưa xác nhận hoặc thiếu giá trị.")), schoolId, semesterId);
        jdbc.query("""
            SELECT a.id FROM converted_activity a
            JOIN teacher t ON t.id = a.teacher_id
            JOIN calculation_period cp ON cp.id = a.calculation_period_id
            WHERE t.school_id = ? AND cp.semester_id = ? AND a.include_in_workload
              AND (a.verification_status <> 'VERIFIED' OR a.converted_periods IS NULL
                OR a.original_unit <> 'PERIOD_PER_WEEK')
            ORDER BY a.id
            """, (RowCallbackHandler) rs -> missing.add(issue("UNVERIFIED_CONVERTED_ACTIVITY", "converted_activity", rs.getLong(1),
                "Hoạt động quy đổi chưa xác nhận, thiếu số tiết hoặc sai đơn vị tải tuần.")), schoolId, semesterId);
    }

    private void checkDemands(long roundId, long schoolId, List<ReadinessIssueDto> warnings) {
        jdbc.query("""
            SELECT DISTINCT d.id FROM required_demand_component c
            JOIN class_subject_applicability a ON a.id = c.applicability_id
            JOIN round_subject_scope sc ON sc.id = a.scope_id
            JOIN teaching_demand d ON d.id = c.demand_id
            WHERE sc.round_id = ? AND a.status = 'APPLICABLE' AND d.status = 'ACTIVE'
              AND NOT EXISTS (SELECT 1 FROM teacher t WHERE t.school_id = ?
                AND tass_teacher_eligible(t.id, d.id))
            ORDER BY d.id
            """, (RowCallbackHandler) rs -> warnings.add(issue("NO_ELIGIBLE_TEACHER", "teaching_demand", rs.getLong(1),
                "Chưa có giáo viên đủ điều kiện cho nhu cầu này; solver có thể giữ nhu cầu chưa gán trong DRAFT kèm lý do.")),
            roundId, schoolId);
    }

    private void checkSchoolContext(long semesterId, List<ReadinessIssueDto> warnings) {
        if (count("SELECT count(*) FROM school_context WHERE semester_id = ?", semesterId) == 0) {
            warnings.add(issue("MISSING_SCHOOL_CONTEXT", "semester", semesterId,
                "Chưa có bối cảnh trường/quỹ cho phần mở rộng; không chặn kiểm tra tải tuần cơ bản."));
        }
    }

    private long count(String sql, Object... args) {
        return jdbc.queryForObject(sql, Long.class, args);
    }

    private static ReadinessIssueDto viewIssue(String code, long id) {
        return switch (code) {
            case "ROUND_SCOPE_UNCONFIRMED" -> issue(code, "assignment_round", id, "Chưa xác nhận phạm vi đợt.");
            case "SCOPE_UNCONFIRMED" -> issue(code, "round_subject_scope", id, "Chưa xác nhận phạm vi môn/khối.");
            case "MISSING_APPLICABILITY" -> issue(code, "school_class", id, "Lớp chưa có trạng thái áp dụng môn.");
            case "UNDETERMINED" -> issue(code, "school_class", id, "Chưa quyết định môn có áp dụng cho lớp hay không.");
            case "APPLICABILITY_UNCONFIRMED" -> issue(code, "school_class", id, "Chưa xác nhận trạng thái áp dụng môn của lớp.");
            case "REQUIRED_SET_UNCONFIRMED" -> issue(code, "school_class", id, "Chưa xác nhận tập thành phần bắt buộc.");
            case "EMPTY_REQUIRED_SET" -> issue(code, "class_subject_applicability", id,
                "Môn áp dụng cho lớp nhưng chưa khai báo thành phần nhu cầu bắt buộc.");
            case "MISSING_OR_INVALID_REQUIRED_DEMAND" -> issue(code, "required_demand_component", id,
                "Thành phần bắt buộc chưa xác nhận hoặc chưa gắn nhu cầu ACTIVE đúng môn, lớp, học kỳ, loại tiết và hiệu lực.");
            case "ACTIVE_DEMAND_NOT_IN_REQUIRED_SET" -> issue(code, "teaching_demand", id,
                "Nhu cầu ACTIVE chưa nằm trong tập thành phần bắt buộc.");
            case "DEMAND_ON_NOT_APPLICABLE" -> issue(code, "teaching_demand", id,
                "Có nhu cầu ACTIVE cho môn đã xác nhận không áp dụng với lớp.");
            default -> issue(code, "unknown", id, "Dữ liệu chuẩn bị đợt chưa hợp lệ theo schema.");
        };
    }

    private static ReadinessIssueDto issue(String code, String resourceType, Long resourceId, String message) {
        return new ReadinessIssueDto(code, resourceType, resourceId, message);
    }

    private record Period(long id, LocalDate startsOn, LocalDate endsOn) {
    }

    private record RoundContext(long roundId, long semesterId, long academicYearId, long schoolId,
                                LocalDate startsOn, LocalDate endsOn, String sourceRevisionToken) {
    }
}
