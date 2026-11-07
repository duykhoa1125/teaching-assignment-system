-- TASS - TRUY VẤN DEMO / KIỂM TRA DỮ LIỆU (PostgreSQL 15+)
-- Thứ tự chạy: 01_schema.sql -> 02_seed.sql -> 03_queries.sql.
-- File chỉ SELECT trong transaction READ ONLY, không sửa dữ liệu.
-- Có thể chạy từng Q riêng trong pgAdmin. Q01-Q20 dùng được độc lập;
-- các mã DEMO_MAIN / DEMO_PLAN_HK1 dùng để chọn đúng dữ liệu seed.
-- ACTIVE, VERIFIED, TEACHING là quy ước demo khớp 02_seed.sql.
-- Q kiểm tra là chẩn đoán từng phần, KHÔNG thay validator nghiệp vụ đầy đủ.
-- Không coi "đã gán đủ" là đã đạt tải tối đa, quy tắc pháp lý hay quyền xuất.
-- Dữ liệu nguồn hiện hành dùng cho màn hình chuẩn bị; lịch sử lấy snapshot.
-- Các tổng tải dưới đây là tiết/tuần của phân công, không phải tổng tiết năm.
-- Các bảng giảm trừ/quy đổi/quỹ giữ NULL khi chưa biết, không COALESCE thành 0.

BEGIN TRANSACTION READ ONLY;

-- Q01. Kiểm tra nhanh kết quả seed. Cả 7 dòng phải is_expected = TRUE.
SELECT check_name, actual, expected, actual = expected AS is_expected
FROM (VALUES
 ('teachers', (SELECT count(*) FROM teacher), 4::bigint),
 ('classes', (SELECT count(*) FROM school_class), 3::bigint),
 ('demands', (SELECT count(*) FROM teaching_demand), 5::bigint),
 ('versions', (SELECT count(*) FROM plan_version), 2::bigint),
 ('plan_demands_all_versions', (SELECT count(*) FROM plan_demand), 10::bigint),
 ('feedbacks', (SELECT count(*) FROM feedback), 1::bigint),
 ('exports', (SELECT count(*) FROM export_record), 0::bigint)
) AS checks(check_name, actual, expected)
ORDER BY check_name;

-- Q02. Danh mục trường -> năm học -> học kỳ -> lớp. Mong đợi 3 lớp.
SELECT s.school_code, y.year_code, se.semester_no, g.grade_code, c.class_code, c.status
FROM school s JOIN academic_year y ON y.school_id = s.id
JOIN semester se ON se.academic_year_id = y.id
JOIN school_class c ON c.academic_year_id = y.id
JOIN grade g ON g.id = c.grade_id
ORDER BY s.school_code, y.year_code, se.semester_no, c.class_code;

-- Q03. Ma trận áp dụng theo đợt; thấy APPLICABLE/NOT_APPLICABLE/UNDETERMINED.
SELECT r.round_code, g.grade_code, sub.subject_code, c.class_code,
       COALESCE(a.status, 'MISSING_RECORD') AS applicability, a.reason
FROM round_subject_scope sc JOIN assignment_round r ON r.id = sc.round_id
JOIN semester se ON se.id = r.semester_id
JOIN grade g ON g.id = sc.grade_id
JOIN subject sub ON sub.id = sc.subject_id
JOIN school_class c ON c.grade_id = sc.grade_id AND c.academic_year_id = se.academic_year_id
LEFT JOIN class_subject_applicability a ON a.scope_id = sc.id AND a.class_id = c.id
ORDER BY r.round_code, sub.subject_code, c.class_code;

-- Q04. Nhu cầu hiện hành; có 5 dòng, Lý 10A1 tách 2+1, Toán 4 và 5.
SELECT y.year_code, se.semester_no, c.class_code, sub.subject_code,
       d.demand_type, d.periods_per_week, d.status
FROM teaching_demand d JOIN semester se ON se.id = d.semester_id
JOIN academic_year y ON y.id = se.academic_year_id
JOIN school_class c ON c.id = d.class_id
JOIN subject sub ON sub.id = d.subject_id
ORDER BY c.class_code, sub.subject_code, d.demand_type;

-- Q05. Phiên bản hiện hành và lịch sử. V1=FEEDBACK_PROCESSING, V2=DRAFT/current.
-- Không tạo ARCHIVED chỉ để đánh dấu lịch sử; dùng current_version_id.
SELECT p.plan_code, v.version_no, v.status, v.revision_no, v.source_version_id,
       (p.current_version_id = v.id) AS is_current, v.created_at
FROM assignment_plan p JOIN plan_version v ON v.plan_id = p.id
ORDER BY p.plan_code, v.version_no;

-- Q06. Phân công hiện hành, 5 dòng. Đọc tên/mã/loại từ snapshot để giữ lịch sử.
WITH current_data AS (
 SELECT p.plan_code, v.version_no, pd.*, sn.payload_json
 FROM assignment_plan p JOIN plan_version v ON v.id = p.current_version_id
 JOIN input_snapshot sn ON sn.id = v.input_snapshot_id
 JOIN plan_demand pd ON pd.plan_version_id = v.id
 WHERE p.plan_code = 'DEMO_PLAN_HK1'
)
SELECT x.plan_code, x.version_no, c.class_code, sub.subject_code,
       d.demand_type, x.periods_per_week_snapshot, t.teacher_code, t.full_name,
       x.unassigned_reason_code
FROM current_data x
CROSS JOIN LATERAL jsonb_to_recordset(x.payload_json->'demands')
 AS d(id bigint, class_id bigint, subject_id bigint, demand_type text)
CROSS JOIN LATERAL jsonb_to_recordset(x.payload_json->'classes') AS c(id bigint, class_code text)
CROSS JOIN LATERAL jsonb_to_recordset(x.payload_json->'subjects') AS sub(id bigint, subject_code text)
LEFT JOIN LATERAL (
 SELECT z.* FROM jsonb_to_recordset(x.payload_json->'teachers')
 AS z(id bigint, teacher_code text, full_name text) WHERE z.id = x.teacher_id
) t ON TRUE
WHERE d.id = x.demand_id AND c.id = d.class_id AND sub.id = d.subject_id
ORDER BY c.class_code, sub.subject_code, d.demand_type;

-- Q07. Tải phân công hiện hành, gồm cả GV không có gán.
-- Mong đợi A=2, B=3, C=10, D=0; tổng=15, không cộng V1 với V2.
-- D=0 ở đây chỉ nghĩa là không có gán trong phương án, không phải actual load=0.
WITH selected AS (
 SELECT p.current_version_id, sn.payload_json
 FROM assignment_plan p JOIN plan_version v ON v.id = p.current_version_id
 JOIN input_snapshot sn ON sn.id = v.input_snapshot_id
 WHERE p.plan_code = 'DEMO_PLAN_HK1'
), teachers_in_snapshot AS (
 SELECT x.current_version_id, t.* FROM selected x
 CROSS JOIN LATERAL jsonb_to_recordset(x.payload_json->'teachers')
 AS t(id bigint, teacher_code text, full_name text)
)
SELECT t.teacher_code, t.full_name, count(pd.id) AS assigned_components,
       COALESCE(sum(pd.periods_per_week_snapshot), 0) AS assigned_periods_per_week
FROM teachers_in_snapshot t LEFT JOIN plan_demand pd
 ON pd.teacher_id = t.id AND pd.plan_version_id = t.current_version_id
GROUP BY t.teacher_code, t.full_name ORDER BY t.teacher_code;

-- Q08. Bao phủ các nhu cầu ACTIVE thuộc đợt chính, không nhân bản qua scope.
-- Mong đợi 5 nhu cầu, đủ 5 dòng/gán, 15 tiết, 0 thiếu dòng và 0 chưa gán.
WITH selected AS (
 SELECT p.current_version_id, r.id AS round_id, r.semester_id
 FROM assignment_plan p JOIN assignment_round r ON r.id = p.round_id
 WHERE p.plan_code = 'DEMO_PLAN_HK1'
), expected_demands AS (
 SELECT d.*, p.current_version_id FROM selected p
 JOIN teaching_demand d ON d.semester_id = p.semester_id AND d.status = 'ACTIVE'
 WHERE EXISTS (
  SELECT 1 FROM round_subject_scope sc
  JOIN class_subject_applicability a ON a.scope_id = sc.id
  WHERE sc.round_id = p.round_id AND sc.subject_id = d.subject_id
    AND a.class_id = d.class_id AND a.status = 'APPLICABLE'
 )
)
SELECT count(*) AS expected_components,
       count(pd.id) AS represented_components,
       count(pd.teacher_id) AS assigned_components,
       count(*) FILTER (WHERE pd.id IS NULL) AS missing_rows,
       count(*) FILTER (WHERE pd.id IS NOT NULL AND pd.teacher_id IS NULL) AS unassigned_components,
       sum(d.periods_per_week) AS source_periods_per_week,
       sum(pd.periods_per_week_snapshot) AS snapshot_periods_per_week
FROM expected_demands d LEFT JOIN plan_demand pd
 ON pd.demand_id = d.id AND pd.plan_version_id = d.current_version_id;

-- Q09. Nhu cầu còn thiếu gán ở phiên bản hiện hành: seed phải 0 dòng.
-- Trạng thái DRAFT thiếu gán ban đầu xem Q17 (audit) và Q13 (validation rev1).
SELECT p.plan_code, v.version_no, pd.demand_id, pd.unassigned_reason_code, pd.unassigned_reason_text
FROM assignment_plan p JOIN plan_version v ON v.id = p.current_version_id
JOIN plan_demand pd ON pd.plan_version_id = v.id
WHERE pd.teacher_id IS NULL ORDER BY p.plan_code, pd.demand_id;

-- Q10. So sánh V1 và V2 theo demand_id; chỉ 1 dòng khác: Lý chuyên đề GV_B -> GV_C.
-- So sánh ID gán và số tiết đóng băng, không đọc số tiết từ TeachingDemand hiện tại.
WITH versions AS (
 SELECT v.id, v.version_no FROM plan_version v
 JOIN assignment_plan p ON p.id = v.plan_id WHERE p.plan_code = 'DEMO_PLAN_HK1'
), old_data AS (
 SELECT pd.* FROM plan_demand pd JOIN versions v ON v.id = pd.plan_version_id WHERE v.version_no = 1
), new_data AS (
 SELECT pd.* FROM plan_demand pd JOIN versions v ON v.id = pd.plan_version_id WHERE v.version_no = 2
)
SELECT COALESCE(o.demand_id, n.demand_id) AS demand_id,
       o.teacher_id AS old_teacher_id, n.teacher_id AS new_teacher_id,
       o.periods_per_week_snapshot AS old_periods, n.periods_per_week_snapshot AS new_periods
FROM old_data o FULL JOIN new_data n ON n.demand_id = o.demand_id
WHERE o.teacher_id IS DISTINCT FROM n.teacher_id
   OR o.periods_per_week_snapshot IS DISTINCT FROM n.periods_per_week_snapshot
   OR o.id IS NULL OR n.id IS NULL
ORDER BY demand_id;

-- Q11. Phản hồi nguồn và DRAFT kết quả. Mong đợi 1 dòng V1 -> V2, RESOLVED.
SELECT f.id, src.version_no AS source_version, f.teacher_id, f.feedback_type,
       f.content, f.status, f.resolution, dst.version_no AS resulting_version,
       f.submitted_at, f.handled_at
FROM feedback f JOIN plan_version src ON src.id = f.plan_version_id
LEFT JOIN plan_version dst ON dst.id = f.resulting_version_id
ORDER BY f.id;

-- Q12. Snapshot checksum. TRUE; không chứa mật khẩu, lưu rõ dữ liệu chưa xác nhận.
SELECT id, source_revision_token, snapshot_schema_version,
       content_hash = md5(payload_json::text) AS demo_checksum_matches,
       jsonb_array_length(payload_json->'demands') AS demand_count,
       payload_json->'quotas' AS quotas, payload_json->'yearly_data' AS yearly_data,
       payload_json->'limitations' AS limitations
FROM input_snapshot ORDER BY id;

-- Q13. Các lượt kiểm tra và độ cũ theo version+revision+snapshot.
-- Hai lượt của V1 đều is_fresh=FALSE (rev1/rev2, V1 hiện là rev4).
SELECT vr.id, v.version_no, vr.revision_no AS checked_revision, v.revision_no AS current_revision,
       vr.overall_status,
       (vr.revision_no = v.revision_no AND vr.input_snapshot_id = v.input_snapshot_id) AS is_fresh,
       vr.checked_at
FROM validation_run vr JOIN plan_version v ON v.id = vr.plan_version_id
ORDER BY vr.id;

-- Q14. Bản hiện hành chưa có kiểm tra còn mới: trả 1 dòng V2, NOT_CHECKED.
-- Không dùng kết quả kiểm tra phiên bản nguồn để tự cho phép mở/xuất V2.
SELECT p.plan_code, v.version_no, v.status, v.revision_no,
       COALESCE(latest.overall_status, 'NOT_CHECKED') AS latest_status,
       CASE WHEN latest.id IS NULL THEN FALSE
            ELSE latest.revision_no = v.revision_no AND latest.input_snapshot_id = v.input_snapshot_id
       END AS has_fresh_check
FROM assignment_plan p JOIN plan_version v ON v.id = p.current_version_id
LEFT JOIN LATERAL (
 SELECT vr.* FROM validation_run vr WHERE vr.plan_version_id = v.id
 ORDER BY vr.checked_at DESC, vr.id DESC LIMIT 1
) latest ON TRUE ORDER BY p.plan_code;

-- Q15. Chi tiết lỗi/cảnh báo kiểm tra: phải thấy thiếu gán rev1 và thiếu dữ liệu.
SELECT vr.id AS validation_run_id, v.version_no, vr.revision_no,
       res.br_code, res.result_status, res.severity, res.missing_data_json, res.message
FROM validation_result res JOIN validation_run vr ON vr.id = res.validation_run_id
JOIN plan_version v ON v.id = vr.plan_version_id
ORDER BY vr.id, res.id;

-- Q16. Chẩn đoán điều kiện sơ bộ của GV đang gán theo dữ liệu nguồn hiện tại.
-- 0 dòng lỗi trong seed; không thay việc kiểm tra tải, quyền hay quy tắc pháp lý.
-- Kinh nghiệm không được dùng thay chuyên môn. GV nghỉ thai sản không được gán.
SELECT p.plan_code, pd.id AS plan_demand_id, pd.teacher_id, d.id AS demand_id
FROM assignment_plan p JOIN plan_version v ON v.id = p.current_version_id
JOIN assignment_round r ON r.id = p.round_id JOIN semester se ON se.id = r.semester_id
JOIN academic_year y ON y.id = se.academic_year_id
JOIN plan_demand pd ON pd.plan_version_id = v.id
JOIN teaching_demand d ON d.id = pd.demand_id
JOIN school_class c ON c.id = d.class_id JOIN grade g ON g.id = c.grade_id
JOIN teacher t ON t.id = pd.teacher_id
WHERE t.school_id <> y.school_id
 OR NOT EXISTS (
  SELECT 1 FROM teacher_employment e JOIN department dep ON dep.id = e.department_id
  WHERE e.teacher_id = t.id AND e.semester_id = se.id AND dep.school_id = y.school_id
    AND e.employment_status = 'TEACHING' AND e.valid_from <= se.starts_on
    AND COALESCE(e.valid_to, se.ends_on) >= se.ends_on
 )
 OR NOT EXISTS (
  SELECT 1 FROM teaching_qualification q WHERE q.teacher_id = t.id
    AND q.subject_id = d.subject_id AND q.education_level_id = g.education_level_id
    AND q.verification_status = 'VERIFIED' AND q.valid_from <= se.starts_on
    AND (q.valid_to IS NULL OR q.valid_to >= se.ends_on)
 )
ORDER BY p.plan_code, pd.id;

-- Q17. Nhật ký 5 bước. Bước đầu giữ phân công chưa gán; không sửa audit lịch sử.
SELECT id, action, entity_type, entity_ref, occurred_at, outcome, before_json, after_json
FROM audit_log ORDER BY occurred_at, id;

-- Q18. Dữ liệu tải chưa xác nhận: NULL được giữ nguyên; không cộng với tải plan.
SELECT t.teacher_code, cp.period_code, w.record_type, w.teaching_periods,
       w.converted_periods, w.target_periods, w.overtime_periods, w.verification_status
FROM teacher_period_workload w JOIN teacher t ON t.id = w.teacher_id
JOIN calculation_period cp ON cp.id = w.calculation_period_id
ORDER BY t.teacher_code;

-- Q19. Phát hiện dữ liệu chuẩn bị cần bổ sung theo từng scope.
-- Seed trả đúng 1 dòng DEMO_PREPARATION / 10A3 / UNDETERMINED.
-- Kiểm tra APPLICABLE thiếu nhu cầu chỉ biết "ít nhất 1"; tập type bắt buộc
-- còn phải do nghiệp vụ xác nhận, không thể suy ra chỉ từ số dòng hiện có.
WITH pairs AS (
 SELECT r.round_code, r.semester_id, sc.id AS scope_id, sc.subject_id,
        c.id AS class_id, c.class_code, a.status
 FROM round_subject_scope sc JOIN assignment_round r ON r.id = sc.round_id
 JOIN semester se ON se.id = r.semester_id
 JOIN school_class c ON c.grade_id = sc.grade_id AND c.academic_year_id = se.academic_year_id
 LEFT JOIN class_subject_applicability a ON a.scope_id = sc.id AND a.class_id = c.id
), counts AS (
 SELECT x.*, (SELECT count(*) FROM teaching_demand d
              WHERE d.semester_id = x.semester_id AND d.class_id = x.class_id
                AND d.subject_id = x.subject_id AND d.status = 'ACTIVE') AS active_demands
 FROM pairs x
)
SELECT round_code, class_code, subject_id, status, active_demands,
       CASE WHEN status IS NULL THEN 'MISSING_APPLICABILITY'
            WHEN status = 'UNDETERMINED' THEN 'UNDETERMINED'
            WHEN status = 'APPLICABLE' THEN 'MISSING_ACTIVE_DEMAND'
            ELSE 'DEMAND_ON_NOT_APPLICABLE' END AS issue
FROM counts WHERE status IS NULL OR status = 'UNDETERMINED'
 OR (status = 'APPLICABLE' AND active_demands = 0)
 OR (status = 'NOT_APPLICABLE' AND active_demands > 0)
ORDER BY round_code, class_code, subject_id;

-- Q20. Kiểm tra liên kết lịch sử/current; seed phải 0 dòng lỗi.
-- Không kiểm tra toàn bộ state machine hoặc luật tối đa tải ở đây.
SELECT 'CURRENT_VERSION_MISSING_OR_WRONG_PLAN' AS issue, p.id AS record_id
FROM assignment_plan p LEFT JOIN plan_version v ON v.id = p.current_version_id
WHERE v.id IS NULL OR v.plan_id <> p.id
UNION ALL
SELECT 'FEEDBACK_RESULT_WRONG_PLAN', f.id
FROM feedback f JOIN plan_version src ON src.id = f.plan_version_id
JOIN plan_version dst ON dst.id = f.resulting_version_id
WHERE src.plan_id <> dst.plan_id OR src.id = dst.id
UNION ALL
SELECT 'FEEDBACK_ENTRY_WRONG_SENDER_OR_VERSION', f.id
FROM feedback f JOIN plan_demand pd ON pd.id = f.plan_demand_id
WHERE pd.plan_version_id <> f.plan_version_id OR pd.teacher_id IS DISTINCT FROM f.teacher_id
ORDER BY issue, record_id;

COMMIT;
