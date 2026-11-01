-- TASS - DỮ LIỆU DEMO cho schema.sql (PostgreSQL 15+)
-- Chạy sau schema.sql, chỉ trên database thử nghiệm chưa có dữ liệu.
-- Toàn bộ tên người/trường, chứng cứ và quy tắc dưới đây là GIẢ LẬP.
-- Không sao chép dữ liệu cá nhân từ các file Excel nguồn.
-- Không phải dữ liệu danh mục production, KHÔNG đặt trong migration production.
-- Các status ngoài enum schema là quy ước DEMO, nhóm cần chốt trước làm API.
-- Mật khẩu không được tạo: tài khoản DISABLED, credential_hash là marker không
-- thể dùng đăng nhập. Khi làm auth, tạo mật khẩu/hash bằng PasswordEncoder.
-- Chạy toàn bộ file trong một lần. Có transaction và chặn chạy lại; không xóa
-- hoặc ghi đè dữ liệu đã có. Muốn thử lại, dùng database demo mới.
--
-- Kết quả: 1 trường, 4 GV (1 nghỉ thai sản), 3 lớp, 2 môn, 5 nhu cầu.
-- Lý 10A1: STANDARD=2, SPECIALIZED_TOPIC=1; Lý 10A2: STANDARD=3.
-- Toán 10A1=4, Toán 10A2=5. Lớp 10A3 không áp dụng Lý;
-- Toán 10A3 chưa xác định, ở đợt chuẩn bị riêng, không thuộc plan đang demo.
-- V1: DRAFT thiếu gán -> sửa đủ -> mở -> nhận/đóng phản hồi.
-- V2: DRAFT mới hiện hành, đổi GV chuyên đề theo phản hồi; giữ nguyên V1.
-- DRAFT ban đầu thiếu gán được giữ trong audit.before/after_json và validation
-- rev1, không tạo version_no mới cho mỗi lần sửa nháp.
-- Theo ERD, cho phép GV phần cơ bản và chuyên đề khác nhau.
-- Không tạo ExportRecord: chưa xuất PDF, không dùng đường dẫn PDF giả.
-- Quy tắc demo không phải căn cứ pháp lý được giảng viên phê duyệt.
-- Các validation_run là kết quả minh họa, không phải thực thi validator backend.
-- Cảnh báo thiếu dữ liệu năm chỉ cho phép mô phỏng mở theo chính sách demo
-- BR-09; không tuyên bố đã đủ điều kiện xuất hay đạt toàn bộ quy tắc thực tế.

BEGIN;
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';

-- Chặn nạp vào database đã có dữ liệu; danh sách đúng 41 bảng của schema.
DO $$
DECLARE table_name TEXT; has_data BOOLEAN;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['school','department','academic_year','semester','education_level','grade','school_class','subject','teacher','user_account','role','user_role','teacher_employment','teaching_qualification','teaching_experience','manager_scope','assignment_round','round_subject_scope','class_subject_applicability','teaching_demand','optimization_config','rule_set_version','rule_definition','input_snapshot','assignment_plan','plan_version','plan_demand','feedback','validation_run','validation_result','solver_run','export_record','audit_log','calculation_period','teacher_duty','teacher_reduction','converted_activity','school_context','school_fund','fund_allocation','teacher_period_workload'] LOOP
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I LIMIT 1)', table_name) INTO has_data;
        IF has_data THEN
            RAISE EXCEPTION 'Seed requires empty tables; % already has data. No data was overwritten.', table_name;
        END IF;
    END LOOP;
END;
$$;

-- 1. Trường, năm học, học kỳ và danh mục.
INSERT INTO school (id, school_code, name, status) VALUES
(1, 'DEMO_THPT', 'Trường THPT Minh Họa (demo)', 'ACTIVE');
INSERT INTO department (id, school_id, department_code, name, valid_from) VALUES
(1, 1, 'LY', 'Tổ Vật lý', '2026-08-01'),
(2, 1, 'TOAN', 'Tổ Toán', '2026-08-01');
INSERT INTO academic_year (id, school_id, year_code, starts_on, ends_on) VALUES
(1, 1, '2026-2027', '2026-08-01', '2027-07-31');
INSERT INTO semester (id, academic_year_id, semester_no, starts_on, ends_on) VALUES
(1, 1, 1, '2026-08-01', '2026-12-31');
INSERT INTO education_level (id, level_code, name) VALUES (1, 'THPT', 'Trung học phổ thông');
INSERT INTO grade (id, education_level_id, grade_code, name) VALUES (1, 1, '10', 'Khối 10');
INSERT INTO school_class (id, academic_year_id, grade_id, class_code, status) VALUES
(1, 1, 1, '10A1', 'ACTIVE'), (2, 1, 1, '10A2', 'ACTIVE'), (3, 1, 1, '10A3', 'ACTIVE');
INSERT INTO subject (id, subject_code, name, valid_from) VALUES
(1, 'VAT_LY', 'Vật lý', '2026-08-01'), (2, 'TOAN', 'Toán', '2026-08-01');

-- 2. GV A/B/C là ba người có thể nhận gán; GV D nghỉ toàn học kỳ.
INSERT INTO teacher (id, school_id, teacher_code, full_name) VALUES
(1, 1, 'GV_A', 'Giáo viên A (demo)'), (2, 1, 'GV_B', 'Giáo viên B (demo)'),
(3, 1, 'GV_C', 'Giáo viên C (demo)'), (4, 1, 'GV_D', 'Giáo viên D - nghỉ thai sản (demo)');
INSERT INTO user_account (id, school_id, teacher_id, login_name, credential_hash, status) VALUES
(1, 1, NULL, 'demo.manager', '!DEMO_DISABLED_NO_PASSWORD!', 'DISABLED'),
(2, 1, 1, 'demo.teacher.a', '!DEMO_DISABLED_NO_PASSWORD!', 'DISABLED'),
(3, 1, 2, 'demo.teacher.b', '!DEMO_DISABLED_NO_PASSWORD!', 'DISABLED'),
(4, 1, 3, 'demo.teacher.c', '!DEMO_DISABLED_NO_PASSWORD!', 'DISABLED'),
(5, 1, 4, 'demo.teacher.d', '!DEMO_DISABLED_NO_PASSWORD!', 'DISABLED');
INSERT INTO role (id, role_code, name) VALUES
(1, 'ACADEMIC_MANAGER', 'Quản lý chuyên môn'), (2, 'TEACHER', 'Giáo viên');
INSERT INTO user_role (id, user_id, role_id) VALUES
(1, 1, 1), (2, 2, 2), (3, 3, 2), (4, 4, 2), (5, 5, 2);
INSERT INTO manager_scope (id, user_id, grade_id, academic_year_id, valid_from, valid_to) VALUES
(1, 1, 1, 1, '2026-08-01', '2027-07-31');
INSERT INTO teacher_employment
(id, teacher_id, department_id, semester_id, employment_status, position_code, valid_from, valid_to) VALUES
(1, 1, 1, 1, 'TEACHING', 'TEACHER', '2026-08-01', '2026-12-31'),
(2, 2, 1, 1, 'TEACHING', 'TEACHER', '2026-08-01', '2026-12-31'),
(3, 3, 2, 1, 'TEACHING', 'TEACHER', '2026-08-01', '2026-12-31'),
(4, 4, 1, 1, 'MATERNITY_LEAVE', 'TEACHER', '2026-08-01', '2026-12-31');
INSERT INTO teaching_qualification
(id, teacher_id, subject_id, education_level_id, verification_status, verified_by, verified_at, evidence_ref, valid_from, valid_to) VALUES
(1, 1, 1, 1, 'VERIFIED', 1, '2026-10-19 08:00+07', 'demo:qualification:A:physics', '2026-08-01', '2026-12-31'),
(2, 2, 1, 1, 'VERIFIED', 1, '2026-10-19 08:00+07', 'demo:qualification:B:physics', '2026-08-01', '2026-12-31'),
(3, 3, 1, 1, 'VERIFIED', 1, '2026-10-19 08:00+07', 'demo:qualification:C:physics', '2026-08-01', '2026-12-31'),
(4, 3, 2, 1, 'VERIFIED', 1, '2026-10-19 08:00+07', 'demo:qualification:C:math', '2026-08-01', '2026-12-31'),
(5, 4, 1, 1, 'VERIFIED', 1, '2026-10-19 08:00+07', 'demo:qualification:D:physics', '2026-08-01', '2026-12-31');
INSERT INTO teaching_experience
(id, teacher_id, subject_id, grade_id, experience_level, experience_period, recorded_by, recorded_at) VALUES
(1, 1, 1, 1, 'EXPERIENCED', '2024-2026 (demo)', 1, '2026-10-19 08:00+07'),
(2, 2, 1, 1, 'EXPERIENCED', '2025-2026 (demo)', 1, '2026-10-19 08:00+07'),
(3, 3, 2, 1, 'EXPERIENCED', '2024-2026 (demo)', 1, '2026-10-19 08:00+07');

-- 3. Phạm vi đợt chính và một đợt chuẩn bị chưa đủ dữ liệu (chưa có plan).
INSERT INTO assignment_round
(id, semester_id, round_code, status, scope_confirmed_by, scope_confirmed_at, opens_at, closes_at) VALUES
(1, 1, 'DEMO_MAIN', 'IN_PROGRESS', 1, '2026-10-19 09:00+07', '2026-10-20 08:00+07', NULL),
(2, 1, 'DEMO_PREPARATION', 'PREPARING', NULL, NULL, NULL, NULL);
INSERT INTO round_subject_scope (id, round_id, grade_id, subject_id, confirmed_by, confirmed_at) VALUES
(1, 1, 1, 1, 1, '2026-10-19 09:00+07'),
(2, 1, 1, 2, 1, '2026-10-19 09:00+07'),
(3, 2, 1, 2, NULL, NULL);
INSERT INTO class_subject_applicability (id, scope_id, class_id, status, reason, updated_by, updated_at) VALUES
(1, 1, 1, 'APPLICABLE', NULL, 1, '2026-10-19 09:00+07'),
(2, 1, 2, 'APPLICABLE', NULL, 1, '2026-10-19 09:00+07'),
(3, 1, 3, 'NOT_APPLICABLE', 'Lớp demo không chọn môn Vật lý.', 1, '2026-10-19 09:00+07'),
(4, 2, 1, 'APPLICABLE', NULL, 1, '2026-10-19 09:00+07'),
(5, 2, 2, 'APPLICABLE', NULL, 1, '2026-10-19 09:00+07'),
(6, 2, 3, 'NOT_APPLICABLE', 'Ngoài phạm vi Toán của đợt chính demo.', 1, '2026-10-19 09:00+07'),
(7, 3, 1, 'APPLICABLE', NULL, 1, '2026-10-19 09:00+07'),
(8, 3, 2, 'APPLICABLE', NULL, 1, '2026-10-19 09:00+07'),
(9, 3, 3, 'UNDETERMINED', 'Chờ xác nhận; đợt phụ chưa có phương án.', 1, '2026-10-19 09:00+07');
INSERT INTO teaching_demand
(id, semester_id, class_id, subject_id, periods_per_week, status, updated_by, updated_at, demand_type) VALUES
(1, 1, 1, 1, 2.00, 'ACTIVE', 1, '2026-10-19 09:00+07', 'STANDARD'),
(2, 1, 1, 1, 1.00, 'ACTIVE', 1, '2026-10-19 09:00+07', 'SPECIALIZED_TOPIC'),
(3, 1, 2, 1, 3.00, 'ACTIVE', 1, '2026-10-19 09:00+07', 'STANDARD'),
(4, 1, 1, 2, 4.00, 'ACTIVE', 1, '2026-10-19 09:00+07', 'STANDARD'),
(5, 1, 2, 2, 5.00, 'ACTIVE', 1, '2026-10-19 09:00+07', 'STANDARD');

-- 4. Quy tắc và dữ liệu tải phụ trợ GIẢ LẬP, không gán căn cứ pháp lý thật.
-- Không xác nhận hệ số/giảm trừ/quỹ khi chưa có quyết định: giữ NULL + PENDING.
INSERT INTO optimization_config
(id, config_code, version_no, criteria_weights_json, time_limit_seconds, confirmed_by, confirmed_at) VALUES
(1, 'DEMO_ONLY', 1, '{"demo_only":true,"objective":"illustration_only","weights_confirmed":false}', 60, NULL, NULL);
INSERT INTO rule_set_version
(id, rule_set_code, version_no, institution_type, status, valid_from, valid_to) VALUES
(1, 'DEMO_UNCONFIRMED', 1, 'THPT', 'DRAFT', '2026-08-01', '2026-12-31');
INSERT INTO rule_definition
(id, rule_set_version_id, rule_code, rule_type, source_document, source_clause, source_ref,
 conditions_json, value_and_unit_json, valid_from, valid_to) VALUES
(1, 1, 'DEMO_HOMEROOM', 'DEMO', 'Dữ liệu giả lập, chưa xác nhận', 'Không áp dụng pháp lý', 'demo:rule:homeroom',
 '{"demo_only":true}', '{"value":null,"unit":"PERIOD_PER_WEEK"}', '2026-08-01', '2026-12-31'),
(2, 1, 'DEMO_PERSONAL', 'DEMO', 'Dữ liệu giả lập, chưa xác nhận', 'Không áp dụng pháp lý', 'demo:rule:personal',
 '{"demo_only":true}', '{"value":null,"unit":"PERIOD_PER_WEEK"}', '2026-08-01', '2026-12-31'),
(3, 1, 'DEMO_CONVERSION', 'DEMO', 'Dữ liệu giả lập, chưa xác nhận', 'Không áp dụng pháp lý', 'demo:rule:conversion',
 '{"demo_only":true}', '{"factor":null,"unit":"PERIOD"}', '2026-08-01', '2026-12-31'),
(4, 1, 'DEMO_FUND', 'DEMO', 'Dữ liệu giả lập, chưa xác nhận', 'Không áp dụng pháp lý', 'demo:rule:fund',
 '{"demo_only":true}', '{"value":null,"unit":"PERIOD_PER_WEEK"}', '2026-08-01', '2026-12-31');
INSERT INTO calculation_period
(id, semester_id, period_code, starts_on, ends_on, planned_teaching_weeks, actual_teaching_weeks) VALUES
(1, 1, 'HK1', '2026-08-01', '2026-12-31', 18.00, NULL);
INSERT INTO teacher_duty
(id, teacher_id, semester_id, rule_definition_id, duty_type, class_id, scope_description,
 valid_from, valid_to, reduction_value, verification_status, payment_status, evidence_ref) VALUES
(1, 1, 1, 1, 'HOMEROOM', 1, 'Chủ nhiệm 10A1, ví dụ chưa duyệt',
 '2026-08-01', '2026-12-31', NULL, 'PENDING', 'UNKNOWN', 'demo:pending:homeroom');
INSERT INTO teacher_reduction
(id, teacher_id, semester_id, rule_definition_id, reduction_type, valid_from, valid_to,
 reduction_value, conditions_json, verification_status, evidence_ref) VALUES
(1, 2, 1, 2, 'DEMO_PERSONAL', '2026-08-01', '2026-12-31', NULL,
 '{"demo_only":true,"decision_pending":true}', 'PENDING', 'demo:pending:personal');
INSERT INTO converted_activity
(id, teacher_id, calculation_period_id, rule_definition_id, activity_type, quantity, original_unit,
 approved_factor, converted_periods, include_in_workload, payment_status, verification_status, evidence_ref) VALUES
(1, 3, 1, 3, 'DEMO_ACTIVITY', 1, 'SESSION', NULL, NULL, FALSE, 'UNKNOWN', 'PENDING', 'demo:pending:conversion');
INSERT INTO school_context
(id, semester_id, institution_type, region_code, class_counts_json, staffed_positions_json, verification_status, evidence_ref) VALUES
(1, 1, 'THPT', NULL, '{"grade_10":3}', '{"teacher_count":4}', 'PENDING', 'demo:school-context');
INSERT INTO school_fund
(id, school_context_id, rule_definition_id, fund_type, total_periods, period_unit, verification_status) VALUES
(1, 1, 4, 'DEMO_PENDING_FUND', NULL, 'PERIOD_PER_WEEK', 'PENDING');
-- Không cấp quỹ khi tổng quỹ chưa biết; fund_allocation để trống có chủ đích.
INSERT INTO teacher_period_workload
(id, teacher_id, calculation_period_id, record_type, teaching_periods, converted_periods,
 target_periods, overtime_periods, source_version_id, verification_status, evidence_ref) VALUES
(1, 1, 1, 'EXTERNAL_BASELINE', NULL, NULL, NULL, NULL, NULL, 'PENDING', 'demo:unknown-actuals:A'),
(2, 2, 1, 'EXTERNAL_BASELINE', NULL, NULL, NULL, NULL, NULL, 'PENDING', 'demo:unknown-actuals:B'),
(3, 3, 1, 'EXTERNAL_BASELINE', NULL, NULL, NULL, NULL, NULL, 'PENDING', 'demo:unknown-actuals:C'),
(4, 4, 1, 'EXTERNAL_BASELINE', NULL, NULL, NULL, NULL, NULL, 'PENDING', 'demo:unknown-actuals:D');

-- 5. Snapshot đóng băng dữ liệu đầu vào, không chứa credential_hash.
-- MD5(payload_json::text) chỉ là checksum demo, không phải chữ ký bảo mật.
-- Chưa có thông tin năm và chính sách đã duyệt: ghi rõ trong payload.
WITH snapshot_payload AS (
    SELECT jsonb_build_object(
        'demo_only', true,
        'schema_version', 1,
        'source_revision_token', 'demo-input-r1',
        'school', (SELECT to_jsonb(x) FROM school x WHERE id = 1),
        'academic_year', (SELECT to_jsonb(x) FROM academic_year x WHERE id = 1),
        'semester', (SELECT to_jsonb(x) FROM semester x WHERE id = 1),
        'round', (SELECT to_jsonb(x) FROM assignment_round x WHERE id = 1),
        'education_levels', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM education_level x),
        'grades', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM grade x),
        'classes', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM school_class x),
        'subjects', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM subject x),
        'scope', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM round_subject_scope x WHERE round_id = 1),
        'applicability', (SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) FROM class_subject_applicability x JOIN round_subject_scope sc ON sc.id = x.scope_id WHERE sc.round_id = 1),
        'demands', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM teaching_demand x),
        'teachers', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM teacher x),
        'departments', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM department x),
        'employment', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM teacher_employment x),
        'qualifications', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM teaching_qualification x),
        'experience', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM teaching_experience x),
        'duties', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM teacher_duty x),
        'reductions', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM teacher_reduction x),
        'converted_activities', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM converted_activity x),
        'school_context', (SELECT to_jsonb(x) FROM school_context x WHERE id = 1),
        'funds', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM school_fund x),
        'fund_allocations', '[]'::jsonb,
        'calculation_periods', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM calculation_period x),
        'period_workloads', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM teacher_period_workload x),
        'rule_set', (SELECT to_jsonb(x) FROM rule_set_version x WHERE id = 1),
        'rules', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM rule_definition x),
        'optimization_config', (SELECT to_jsonb(x) FROM optimization_config x WHERE id = 1),
        'quotas', jsonb_build_object('status', 'UNCONFIRMED', 'records', '[]'::jsonb),
        'yearly_data', jsonb_build_object('status', 'INSUFFICIENT_DATA', 'records', '[]'::jsonb),
        'limitations', jsonb_build_array('DEMO: rules and quotas unconfirmed', 'Annual inputs missing', 'Not authorized for real opening/export')
    ) AS payload
)
INSERT INTO input_snapshot
(id, round_id, rule_set_version_id, optimization_config_id, snapshot_schema_version,
 source_revision_token, captured_at, payload_json, content_hash)
SELECT 1, 1, 1, 1, 1, 'demo-input-r1', '2026-10-20 08:00+07', payload, md5(payload::text)
FROM snapshot_payload;

-- 6. Khởi tạo V1; solver mô phỏng sinh DRAFT một phần, thiếu GV chuyên đề.
INSERT INTO assignment_plan (id, round_id, plan_code, created_by, created_at) VALUES
(1, 1, 'DEMO_PLAN_HK1', 1, '2026-10-20 08:05+07');
INSERT INTO plan_version
(id, plan_id, version_no, status, revision_no, input_snapshot_id, created_by, created_at) VALUES
(1, 1, 1, 'DRAFT', 0, 1, 1, '2026-10-20 08:05+07');
UPDATE assignment_plan SET current_version_id = 1 WHERE id = 1;
INSERT INTO plan_demand
(id, plan_version_id, demand_id, periods_per_week_snapshot, teacher_id, unassigned_reason_code, unassigned_reason_text) VALUES
(1, 1, 1, 2.00, 1, NULL, NULL),
(2, 1, 2, 1.00, NULL, 'DEMO_PENDING_MANUAL_ASSIGNMENT', 'Chưa chọn GV cho thành phần chuyên đề.'),
(3, 1, 3, 3.00, 2, NULL, NULL),
(4, 1, 4, 4.00, 3, NULL, NULL),
(5, 1, 5, 5.00, 3, NULL, NULL);
INSERT INTO solver_run
(id, plan_version_id, input_snapshot_id, base_revision_no, requested_by, started_at, finished_at,
 status, result_summary_json, applied_revision_no) VALUES
(1, 1, 1, 0, 1, '2026-10-20 08:05+07', '2026-10-20 08:05:10+07',
 'APPLIED', '{"demo_only":true,"assigned":4,"unassigned":1,"not_a_real_solver_run":true}', 1);
UPDATE plan_version SET revision_no = 1 WHERE id = 1;
INSERT INTO audit_log (id, actor_id, action, entity_type, entity_ref, occurred_at, outcome, after_json)
SELECT 1, 1, 'DEMO_GENERATE_PARTIAL_DRAFT', 'PLAN_VERSION', '1', '2026-10-20 08:05:10+07', 'SUCCESS',
       jsonb_build_object('version_no', 1, 'revision_no', 1, 'status', 'DRAFT', 'assigned', 4, 'unassigned', 1,
                          'assignments', (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM plan_demand x WHERE plan_version_id = 1));
INSERT INTO validation_run
(id, plan_version_id, input_snapshot_id, revision_no, checked_at, checked_by, overall_status) VALUES
(1, 1, 1, 1, '2026-10-20 08:06+07', 1, 'VIOLATION');
INSERT INTO validation_result
(id, validation_run_id, br_code, subject_type, subject_ref, calculation_period, result_status, severity, message) VALUES
(1, 1, 'BR-01', 'PLAN_DEMAND', '2', 'SEMESTER:1', 'VIOLATION', 'ERROR',
 'Demo: thiếu giáo viên cho chuyên đề Lý 10A1; DRAFT được lưu nhưng chưa mở/xuất.');

-- 7. Chỉnh gán trong V1, tăng revision, không tạo version_no mới.
UPDATE plan_demand SET teacher_id = 2, unassigned_reason_code = NULL, unassigned_reason_text = NULL WHERE id = 2;
UPDATE plan_version SET revision_no = 2 WHERE id = 1;
INSERT INTO audit_log (id, actor_id, action, entity_type, entity_ref, occurred_at, outcome, before_json, after_json) VALUES
(2, 1, 'DEMO_ASSIGN_TEACHER', 'PLAN_VERSION', '1', '2026-10-20 09:00+07', 'SUCCESS',
 '{"revision_no":1,"plan_demand_id":2,"teacher_id":null}', '{"revision_no":2,"plan_demand_id":2,"teacher_id":2}');
INSERT INTO validation_run
(id, plan_version_id, input_snapshot_id, revision_no, checked_at, checked_by, overall_status) VALUES
(2, 1, 1, 2, '2026-10-21 08:00+07', 1, 'INSUFFICIENT_DATA');
INSERT INTO validation_result
(id, validation_run_id, br_code, subject_type, subject_ref, calculation_period, result_status, severity, missing_data_json, message) VALUES
(2, 2, 'BR-01', 'PLAN_VERSION', '1', 'SEMESTER:1', 'PASS', 'INFO', NULL, 'Demo: 5/5 nhu cầu đã gán; chưa xác nhận toàn bộ BR.'),
(3, 2, 'BR-09', 'PLAN_VERSION', '1', 'ACADEMIC_YEAR:1', 'INSUFFICIENT_DATA', 'WARNING',
 '{"missing":["yearly_actuals","approved_quotas","confirmed_rules"]}',
 'DEMO ONLY: thiếu dữ liệu năm và quy tắc đã duyệt. Không dùng lượt kiểm tra này cho mở/xuất thật.');

-- 8. Chỉ MÔ PHỎNG luồng trạng thái; không phải quyết định mở đã đạt BR-09.
UPDATE plan_version SET status = 'OPEN_FOR_FEEDBACK', revision_no = 3,
    feedback_deadline = '2026-10-22 17:00+07' WHERE id = 1;
INSERT INTO audit_log (id, actor_id, action, entity_type, entity_ref, occurred_at, outcome, before_json, after_json) VALUES
(3, 1, 'DEMO_SIMULATE_OPEN', 'PLAN_VERSION', '1', '2026-10-21 08:10+07', 'SIMULATED',
 '{"revision_no":2,"status":"DRAFT"}', '{"revision_no":3,"status":"OPEN_FOR_FEEDBACK","not_real_authorization":true}');
INSERT INTO feedback
(id, plan_version_id, teacher_id, plan_demand_id, feedback_type, subject_id, content, submitted_at, status) VALUES
(1, 1, 2, 2, 'ASSIGNMENT_CHANGE', 1,
 'Đề nghị chuyển 1 tiết chuyên đề Lý 10A1 sang giáo viên C; giữ 3 tiết Lý 10A2 của tôi.',
 '2026-10-21 10:00+07', 'PENDING');
UPDATE plan_version SET status = 'FEEDBACK_PROCESSING', revision_no = 4 WHERE id = 1;
INSERT INTO audit_log (id, actor_id, action, entity_type, entity_ref, occurred_at, outcome, before_json, after_json) VALUES
(4, 1, 'DEMO_CLOSE_FEEDBACK', 'PLAN_VERSION', '1', '2026-10-22 17:00+07', 'SIMULATED',
 '{"revision_no":3,"status":"OPEN_FOR_FEEDBACK"}', '{"revision_no":4,"status":"FEEDBACK_PROCESSING"}');

-- 9. Chốt xử lý trước khi phiên bản nguồn trở thành lịch sử chỉ đọc.
UPDATE feedback SET status = 'RESOLVED', resolution = 'Chấp nhận trong demo: chuyển chuyên đề sang GV C ở V2.',
    handled_by = 1, handled_at = '2026-10-23 08:00+07' WHERE id = 1;
-- Dữ liệu đầu vào không đổi: V2 tái sử dụng snapshot bất biến số 1.
INSERT INTO plan_version
(id, plan_id, version_no, source_version_id, status, revision_no, input_snapshot_id, created_by, created_at) VALUES
(2, 1, 2, 1, 'DRAFT', 0, 1, 1, '2026-10-23 08:00+07');
INSERT INTO plan_demand (id, plan_version_id, demand_id, periods_per_week_snapshot, teacher_id)
SELECT id + 5, 2, demand_id, periods_per_week_snapshot,
       CASE WHEN demand_id = 2 THEN 3 ELSE teacher_id END
FROM plan_demand WHERE plan_version_id = 1 ORDER BY id;
UPDATE feedback SET resulting_version_id = 2 WHERE id = 1;
UPDATE assignment_plan SET current_version_id = 2 WHERE id = 1;
INSERT INTO audit_log (id, actor_id, action, entity_type, entity_ref, occurred_at, outcome, before_json, after_json) VALUES
(5, 1, 'DEMO_CREATE_NEW_DRAFT', 'ASSIGNMENT_PLAN', '1', '2026-10-23 08:00+07', 'SUCCESS',
 '{"current_version_id":1,"feedback_id":1}', '{"current_version_id":2,"source_version_id":1,"status":"DRAFT","changed_demand_id":2,"teacher_id":3}');
-- Kết quả cũ đều stale theo revision; V2 chưa có lượt kiểm tra riêng.
-- Không tự sao chép kết quả kiểm tra của V1 sang V2.

-- 10. Đồng bộ identity sau khi dùng ID cố định; INSERT tiếp theo không trùng ID.
DO $$
DECLARE t TEXT; seq TEXT; max_id BIGINT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.columns
             WHERE table_schema = current_schema() AND column_name = 'id' AND is_identity = 'YES'
               AND table_name IN ('school', 'department', 'academic_year', 'semester', 'education_level', 'grade', 'school_class', 'subject', 'teacher', 'user_account', 'role', 'user_role', 'teacher_employment', 'teaching_qualification', 'teaching_experience', 'manager_scope', 'assignment_round', 'round_subject_scope', 'class_subject_applicability', 'teaching_demand', 'optimization_config', 'rule_set_version', 'rule_definition', 'input_snapshot', 'assignment_plan', 'plan_version', 'plan_demand', 'feedback', 'validation_run', 'validation_result', 'solver_run', 'export_record', 'audit_log', 'calculation_period', 'teacher_duty', 'teacher_reduction', 'converted_activity', 'school_context', 'school_fund', 'fund_allocation', 'teacher_period_workload')
    LOOP
        seq := pg_get_serial_sequence(format('%I.%I', current_schema(), t), 'id');
        EXECUTE format('SELECT max(id) FROM %I.%I', current_schema(), t) INTO max_id;
        IF max_id IS NOT NULL THEN PERFORM setval(seq::regclass, max_id, TRUE); END IF;
    END LOOP;
END;
$$;
COMMIT;
-- Tiếp theo chạy 03_queries.sql. V2 hiện hành có 5 nhu cầu, tổng 15 tiết/tuần;
-- tải phân công A=2, B=3, C=10, D=0 (không suy ra tải thực tế hay tải năm).
