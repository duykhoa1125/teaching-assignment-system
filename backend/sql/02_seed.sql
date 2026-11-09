-- TASS - SEED DONG BO ERD 48 BANG / report 7.1-7.2
-- PostgreSQL 15+. Chay sau 01_schema.sql tren database demo TRONG.
-- Tat ca ten/nguon/quy tac la GIA LAP; khong phai tham dinh phap ly.
-- Accounts DISABLED, khong co mat khau dang nhap. Seed la fixture cua DB owner,
-- khong phai luong API xac thuc. Khong tat trigger de nap seed.
-- 5 GV (D nghi toan ky), 6 lop hien tai + 2 lop lich su, 3 mon.
-- 10 nhu cau: STANDARD/SPECIALIZED_TOPIC/ENRICHMENT, KHTN nguyen mon,
-- Toan 10A2 tach 2 giai doan 5 -> 4 tiet/tuan, tang tiet 10A1 tu thang 11.
-- V1 -> feedback -> V2 DRAFT hien hanh; giu V1 va snapshot bat bien.
-- SolverRun la NOT_RUN demo: KHONG gia lap bang chung da chay 5 buoc.
-- Khong tao ExportRecord/PDF gia. Du lieu nam thieu, giu canh bao BR-09.
BEGIN;
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';
SET LOCAL tass.actor_id='1';
DO $$
DECLARE t TEXT; populated BOOLEAN;
BEGIN
 FOREACH t IN ARRAY ARRAY['school','department','academic_year','semester','education_level','grade','school_class','subject','teacher','user_account','role','user_role','teacher_employment','teaching_qualification','teaching_experience','manager_scope','assignment_round','round_subject_scope','class_subject_applicability','teaching_demand','optimization_config','rule_set_version','rule_definition','input_snapshot','assignment_plan','plan_version','plan_demand','feedback','validation_run','validation_result','solver_run','export_record','audit_log','calculation_period','teacher_duty','teacher_reduction','converted_activity','school_context','school_fund','fund_allocation','teacher_period_workload','teaching_history','teacher_workload_basis','required_demand_component','source_import','teacher_alias','class_alias','subject_alias'] LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I LIMIT 1)',t) INTO populated;
  IF populated THEN RAISE EXCEPTION 'Seed requires empty tables: % already has data',t; END IF;
 END LOOP;
END;
$$;

INSERT INTO school (id, school_code, name, status) VALUES
(1, 'DEMO_LIEN_CAP', 'Trường liên cấp Minh Họa (demo)', 'ACTIVE');

INSERT INTO department (id, school_id, department_code, name, valid_from) VALUES
(1, 1, 'LY', 'Tổ Vật lý', '2025-08-01'),
(2, 1, 'TOAN', 'Tổ Toán', '2025-08-01'),
(3, 1, 'KHTN', 'Tổ Khoa học tự nhiên', '2025-08-01');

INSERT INTO academic_year (id, school_id, year_code, starts_on, ends_on) VALUES
(1, 1, '2026-2027', '2026-08-01', '2027-07-31'),
(2, 1, '2025-2026', '2025-08-01', '2026-07-31');

INSERT INTO semester (id, academic_year_id, semester_no, starts_on, ends_on) VALUES
(1, 1, 1, '2026-08-01', '2026-12-31'),
(2, 2, 2, '2026-01-01', '2026-05-31');

INSERT INTO education_level (id, level_code, name) VALUES
(1, 'THPT', 'Trung học phổ thông'),
(2, 'THCS', 'Trung học cơ sở');

INSERT INTO grade (id, education_level_id, grade_code, name) VALUES
(1, 1, '10', 'Khối 10'),
(2, 2, '8', 'Khối 8'),
(3, 2, '9', 'Khối 9'),
(4, 1, '12', 'Khối 12');

INSERT INTO school_class (id, academic_year_id, grade_id, class_code, status) VALUES
(1, 1, 1, '10A1', 'ACTIVE'),
(2, 1, 1, '10A2', 'ACTIVE'),
(3, 1, 1, '10A3', 'ACTIVE'),
(4, 1, 2, '8A1', 'ACTIVE'),
(5, 1, 3, '9A1', 'ACTIVE'),
(6, 1, 4, '12A1', 'ACTIVE'),
(7, 2, 1, '10A1', 'HISTORICAL'),
(8, 2, 1, '10A2', 'HISTORICAL');

INSERT INTO subject (id, subject_code, name, valid_from) VALUES
(1, 'VAT_LY', 'Vật lý', '2025-08-01'),
(2, 'TOAN', 'Toán', '2025-08-01'),
(3, 'KHTN', 'Khoa học tự nhiên', '2025-08-01');

INSERT INTO teacher (id, school_id, teacher_code, full_name) VALUES
(1, 1, 'GV_A', 'Giáo viên A (demo)'),
(2, 1, 'GV_B', 'Giáo viên B (demo)'),
(3, 1, 'GV_C', 'Giáo viên C (demo)'),
(4, 1, 'GV_D', 'Giáo viên D (demo) - nghỉ thai sản'),
(5, 1, 'GV_E', 'Giáo viên E (demo)');

INSERT INTO user_account (id, school_id, teacher_id, login_name, credential_hash, status) VALUES
(1, 1, NULL, 'demo.manager', '!DEMO_DISABLED_NO_PASSWORD!', 'DISABLED'),
(2, 1, 1, 'demo.teacher.a', '!DEMO_DISABLED_NO_PASSWORD!', 'DISABLED'),
(3, 1, 2, 'demo.teacher.b', '!DEMO_DISABLED_NO_PASSWORD!', 'DISABLED'),
(4, 1, 3, 'demo.teacher.c', '!DEMO_DISABLED_NO_PASSWORD!', 'DISABLED'),
(5, 1, 4, 'demo.teacher.d', '!DEMO_DISABLED_NO_PASSWORD!', 'DISABLED'),
(6, 1, 5, 'demo.teacher.e', '!DEMO_DISABLED_NO_PASSWORD!', 'DISABLED');

INSERT INTO role (id, role_code, name) VALUES
(1, 'ACADEMIC_MANAGER', 'Quản lý chuyên môn'),
(2, 'TEACHER', 'Giáo viên');

INSERT INTO user_role (id, user_id, role_id) VALUES
(1, 1, 1),
(2, 2, 2),
(3, 3, 2),
(4, 4, 2),
(5, 5, 2),
(6, 6, 2);

INSERT INTO manager_scope (id, user_id, grade_id, academic_year_id, valid_from, valid_to) VALUES
(1, 1, 1, 1, '2026-08-01', '2027-07-31'),
(2, 1, 2, 1, '2026-08-01', '2027-07-31'),
(3, 1, 3, 1, '2026-08-01', '2027-07-31'),
(4, 1, 4, 1, '2026-08-01', '2027-07-31');

INSERT INTO source_import (id, school_id, original_file_name, source_file_ref, content_hash, imported_by, status) VALUES
(1, 1, 'DEMO_HOSO_2026.xlsx', 'demo:generated-fixture', 'not-a-real-file-hash-demo-only', 1, 'VERIFIED');

INSERT INTO teacher_alias (id, source_import_id, teacher_id, alias_value, source_sheet, source_cell, raw_value_json, verification_status, verified_by, verified_at) VALUES
(1, 1, 1, 'GV A', 'Hồ sơ', 'A2', '{"value": "GV A", "demo_only": true}'::jsonb, 'VERIFIED', 1, '2026-08-01 08:00+07');

INSERT INTO class_alias (id, source_import_id, class_id, alias_value, source_sheet, source_cell, raw_value_json, verification_status, verified_by, verified_at) VALUES
(1, 1, 1, '10 A 1', 'Nhu cầu', 'B2', '{"value": "10 A 1", "demo_only": true}'::jsonb, 'VERIFIED', 1, '2026-08-01 08:00+07');

INSERT INTO subject_alias (id, source_import_id, subject_id, alias_value, source_sheet, source_cell, raw_value_json, verification_status, verified_by, verified_at) VALUES
(1, 1, 3, 'KHTN nguyên môn', 'Nhu cầu', 'C2', '{"value": "KHTN nguyên môn", "demo_only": true}'::jsonb, 'VERIFIED', 1, '2026-08-01 08:00+07');

INSERT INTO teacher_employment (id, teacher_id, department_id, semester_id, employment_status, position_code, valid_from, valid_to) VALUES
(1, 1, 1, 1, 'TEACHING', 'TEACHER', '2026-08-01', '2026-12-31'),
(2, 2, 1, 1, 'TEACHING', 'TEACHER', '2026-08-01', '2026-12-31'),
(3, 3, 2, 1, 'TEACHING', 'TEACHER', '2026-08-01', '2026-12-31'),
(4, 4, 1, 1, 'MATERNITY_LEAVE', 'TEACHER', '2026-08-01', '2026-12-31'),
(5, 5, 3, 1, 'TEACHING', 'TEACHER', '2026-08-01', '2026-12-31');

INSERT INTO teaching_qualification (id, teacher_id, subject_id, education_level_id, verification_status, verified_by, verified_at, evidence_ref, valid_from, valid_to) VALUES
(1, 1, 1, 1, 'VERIFIED', 1, '2026-08-01 08:00+07', 'demo:qualification:1:1:1', '2026-08-01', '2026-12-31'),
(2, 2, 1, 1, 'VERIFIED', 1, '2026-08-01 08:00+07', 'demo:qualification:2:1:1', '2026-08-01', '2026-12-31'),
(3, 3, 1, 1, 'VERIFIED', 1, '2026-08-01 08:00+07', 'demo:qualification:3:1:1', '2026-08-01', '2026-12-31'),
(4, 3, 2, 1, 'VERIFIED', 1, '2026-08-01 08:00+07', 'demo:qualification:3:2:1', '2026-08-01', '2026-12-31'),
(5, 4, 1, 1, 'VERIFIED', 1, '2026-08-01 08:00+07', 'demo:qualification:4:1:1', '2026-08-01', '2026-12-31'),
(6, 5, 3, 2, 'VERIFIED', 1, '2026-08-01 08:00+07', 'demo:qualification:5:3:2', '2026-08-01', '2026-12-31');

INSERT INTO teaching_experience (id, teacher_id, subject_id, grade_id, experience_status, years_of_experience, as_of_date, evidence_ref, source_import_id, verified_by, verified_at, recorded_by) VALUES
(1, 1, 1, 1, 'HAS_EXPERIENCE', 3, '2026-08-01', 'demo:experience:1:1:1', 1, 1, '2026-08-01 08:00+07', 1),
(2, 2, 1, 1, 'HAS_EXPERIENCE', 1, '2026-08-01', 'demo:experience:2:1:1', 1, 1, '2026-08-01 08:00+07', 1),
(3, 3, 1, 1, 'NO_EXPERIENCE', 0, '2026-08-01', 'demo:experience:3:1:1', 1, 1, '2026-08-01 08:00+07', 1),
(4, 3, 2, 1, 'HAS_EXPERIENCE', 2, '2026-08-01', 'demo:experience:3:2:1', 1, 1, '2026-08-01 08:00+07', 1),
(5, 3, 2, 4, 'HAS_EXPERIENCE', 2, '2026-08-01', 'demo:experience:3:2:4', 1, 1, '2026-08-01 08:00+07', 1),
(6, 5, 3, 2, 'HAS_EXPERIENCE', 2, '2026-08-01', 'demo:experience:5:3:2', 1, 1, '2026-08-01 08:00+07', 1),
(7, 5, 3, 3, 'HAS_EXPERIENCE', 1, '2026-08-01', 'demo:experience:5:3:3', 1, 1, '2026-08-01 08:00+07', 1),
(8, 4, 1, 1, 'UNKNOWN', NULL, '2026-08-01', NULL, 1, NULL, NULL, 1);

INSERT INTO teaching_history (id, teacher_id, academic_year_id, semester_id, class_id, subject_id, taught_from, taught_to, source_kind, source_import_id, evidence_ref, verification_status, verified_by, verified_at, recorded_by) VALUES
(1, 1, 2, 2, 7, 1, '2026-01-05', '2026-05-31', 'EXTERNAL_RECORD', 1, 'demo:actual-history:A:7', 'VERIFIED', 1, '2026-08-01 08:00+07', 1),
(2, 1, 2, 2, 8, 1, '2026-01-05', '2026-05-31', 'EXTERNAL_RECORD', 1, 'demo:actual-history:A:8', 'VERIFIED', 1, '2026-08-01 08:00+07', 1);

INSERT INTO optimization_config (id, config_code, version_no, criteria_weights_json, time_limit_seconds, confirmed_by, confirmed_at) VALUES
(1, 'DEMO_FIVE_STAGE', 1, '{"contract_version": 1, "demo_only": true, "objective_order": ["Z", "L1", "M", "experience", "change"], "coverage_mode": "COMPONENTS", "load_basis": "T-B", "lock_policy": "KEEP_LOCKED", "unassigned_policy": "DRAFT_ONLY", "non_solver_budget_seconds": 10, "stage_budgets": [{"name": "Z", "seconds": 8}, {"name": "L1", "seconds": 14}, {"name": "M", "seconds": 10}, {"name": "experience", "seconds": 10}, {"name": "change", "seconds": 8}], "experience": {"beta": 1, "as_of_date": "2026-08-01", "unknown_policy": "BLOCK", "grade_weights": {"9": 3, "12": 3, "other": 1}, "penalty_bands": [{"min_years": 0, "penalty": 6}, {"min_years": 1, "penalty": 4}, {"min_years": 3, "penalty": 2}, {"min_years": 5, "penalty": 0}]}, "hard_limits": {"max_total_weekly": 25, "source": "demo:illustrative-cap", "not_a_legal_threshold": true}}'::jsonb, 60, 1, '2026-08-01 08:00+07');

INSERT INTO rule_set_version (id, rule_set_code, version_no, institution_type, status, valid_from, valid_to, confirmed_by, confirmed_at) VALUES
(1, 'DEMO_MVP_RULES', 1, 'MULTI_LEVEL', 'DEMO_CONFIRMED', '2026-08-01', '2026-12-31', 1, '2026-08-01 08:00+07');

INSERT INTO rule_definition (id, rule_set_version_id, rule_code, rule_type, source_document, source_clause, source_ref, conditions_json, value_and_unit_json, valid_from, valid_to) VALUES
(1, 1, 'DEMO_HOMEROOM', 'DEMO', 'Fixture minh họa', 'Không phải căn cứ pháp lý', 'demo:rule:homeroom', '{"demo_only": true}'::jsonb, '{"value": 4, "unit": "PERIOD_PER_WEEK"}'::jsonb, '2026-08-01', '2026-12-31'),
(2, 1, 'DEMO_PERSONAL', 'DEMO', 'Fixture minh họa', 'Không phải căn cứ pháp lý', 'demo:rule:personal', '{"demo_only": true}'::jsonb, '{"value": 1, "unit": "PERIOD_PER_WEEK"}'::jsonb, '2026-08-01', '2026-12-31'),
(3, 1, 'DEMO_CONVERSION', 'DEMO', 'Fixture minh họa', 'Không phải căn cứ pháp lý', 'demo:rule:conversion', '{"demo_only": true}'::jsonb, '{"factor": 1, "unit": "PERIOD_PER_WEEK"}'::jsonb, '2026-08-01', '2026-12-31'),
(4, 1, 'DEMO_BASE', 'DEMO', 'Fixture hồ sơ cấp công tác', 'Không phải căn cứ pháp lý', 'demo:rule:base', '{"demo_only": true}'::jsonb, '{"THCS": 19, "THPT": 17, "unit": "PERIOD_PER_WEEK"}'::jsonb, '2026-08-01', '2026-12-31');

INSERT INTO teacher_workload_basis (id, teacher_id, semester_id, education_level_id, position_code, base_periods_per_week, unit, valid_from, valid_to, profile_ref, rule_definition_id, source_import_id, verification_status, verified_by, verified_at) VALUES
(1, 1, 1, 1, 'TEACHER', 17, 'PERIOD_PER_WEEK', '2026-08-01', '2026-12-31', 'demo:work-profile:1', 4, 1, 'VERIFIED', 1, '2026-08-01 08:00+07'),
(2, 2, 1, 1, 'TEACHER', 17, 'PERIOD_PER_WEEK', '2026-08-01', '2026-12-31', 'demo:work-profile:2', 4, 1, 'VERIFIED', 1, '2026-08-01 08:00+07'),
(3, 3, 1, 1, 'TEACHER', 17, 'PERIOD_PER_WEEK', '2026-08-01', '2026-12-31', 'demo:work-profile:3', 4, 1, 'VERIFIED', 1, '2026-08-01 08:00+07'),
(4, 4, 1, 1, 'TEACHER', 17, 'PERIOD_PER_WEEK', '2026-08-01', '2026-12-31', 'demo:work-profile:4', 4, 1, 'VERIFIED', 1, '2026-08-01 08:00+07'),
(5, 5, 1, 2, 'TEACHER', 19, 'PERIOD_PER_WEEK', '2026-08-01', '2026-12-31', 'demo:work-profile:5', 4, 1, 'VERIFIED', 1, '2026-08-01 08:00+07');

INSERT INTO calculation_period (id, semester_id, period_code, starts_on, ends_on, planned_teaching_weeks, actual_teaching_weeks) VALUES
(1, 1, 'HK1_EARLY', '2026-08-01', '2026-10-31', 10, NULL),
(2, 1, 'HK1_LATE', '2026-11-01', '2026-12-31', 8, NULL);

INSERT INTO teacher_duty (id, teacher_id, semester_id, rule_definition_id, duty_type, class_id, scope_description, valid_from, valid_to, reduction_value, verification_status, payment_status, evidence_ref, verified_by) VALUES
(1, 1, 1, 1, 'HOMEROOM', 1, 'Chủ nhiệm 10A1 (demo)', '2026-08-01', '2026-12-31', 4, 'VERIFIED', 'DEMO_CONFIRMED', 'demo:duty:A:homeroom', 1);

INSERT INTO teacher_reduction (id, teacher_id, semester_id, rule_definition_id, reduction_type, valid_from, valid_to, reduction_value, conditions_json, verification_status, evidence_ref, verified_by) VALUES
(1, 2, 1, 2, 'DEMO_PERSONAL', '2026-08-01', '2026-12-31', 1, '{"demo_only": true}'::jsonb, 'VERIFIED', 'demo:personal:B', 1);

INSERT INTO converted_activity (id, teacher_id, calculation_period_id, rule_definition_id, activity_type, quantity, original_unit, approved_factor, converted_periods, include_in_workload, payment_status, verification_status, evidence_ref, approved_by) VALUES
(1, 3, 1, 3, 'DEMO_WEEKLY_ACTIVITY', 1, 'PERIOD_PER_WEEK', 1, 1, TRUE, 'DEMO_CONFIRMED', 'VERIFIED', 'demo:activity:C:period1', 1),
(2, 3, 2, 3, 'DEMO_WEEKLY_ACTIVITY', 1, 'PERIOD_PER_WEEK', 1, 1, TRUE, 'DEMO_CONFIRMED', 'VERIFIED', 'demo:activity:C:period2', 1);

INSERT INTO school_context (id, semester_id, institution_type, class_counts_json, staffed_positions_json, verification_status, evidence_ref) VALUES
(1, 1, 'MULTI_LEVEL', '{"grade_8": 1, "grade_9": 1, "grade_10": 3, "grade_12": 1}'::jsonb, '{"teacher_count": 5}'::jsonb, 'VERIFIED', 'demo:school-context');

INSERT INTO teacher_period_workload (id, teacher_id, calculation_period_id, record_type, teaching_periods, converted_periods, target_periods, overtime_periods, verification_status, evidence_ref) VALUES
(1, 1, 1, 'OUTSIDE_SCOPE_WEEKLY', 0, NULL, NULL, NULL, 'VERIFIED', 'demo:confirmed-weekly-inputs:1:1'),
(2, 2, 1, 'OUTSIDE_SCOPE_WEEKLY', 0, NULL, NULL, NULL, 'VERIFIED', 'demo:confirmed-weekly-inputs:2:1'),
(3, 3, 1, 'OUTSIDE_SCOPE_WEEKLY', 1, NULL, NULL, NULL, 'VERIFIED', 'demo:confirmed-weekly-inputs:3:1'),
(4, 4, 1, 'OUTSIDE_SCOPE_WEEKLY', 0, NULL, NULL, NULL, 'VERIFIED', 'demo:confirmed-weekly-inputs:4:1'),
(5, 5, 1, 'OUTSIDE_SCOPE_WEEKLY', 0, NULL, NULL, NULL, 'VERIFIED', 'demo:confirmed-weekly-inputs:5:1'),
(6, 1, 2, 'OUTSIDE_SCOPE_WEEKLY', 0, NULL, NULL, NULL, 'VERIFIED', 'demo:confirmed-weekly-inputs:1:2'),
(7, 2, 2, 'OUTSIDE_SCOPE_WEEKLY', 0, NULL, NULL, NULL, 'VERIFIED', 'demo:confirmed-weekly-inputs:2:2'),
(8, 3, 2, 'OUTSIDE_SCOPE_WEEKLY', 1, NULL, NULL, NULL, 'VERIFIED', 'demo:confirmed-weekly-inputs:3:2'),
(9, 4, 2, 'OUTSIDE_SCOPE_WEEKLY', 0, NULL, NULL, NULL, 'VERIFIED', 'demo:confirmed-weekly-inputs:4:2'),
(10, 5, 2, 'OUTSIDE_SCOPE_WEEKLY', 0, NULL, NULL, NULL, 'VERIFIED', 'demo:confirmed-weekly-inputs:5:2');

INSERT INTO assignment_round (id, semester_id, round_code, status, scope_confirmed_by, scope_confirmed_at) VALUES
(1, 1, 'DEMO_MAIN', 'IN_PROGRESS', 1, '2026-08-01 09:00+07'),
(2, 1, 'DEMO_PREPARATION', 'PREPARING', NULL, NULL);

INSERT INTO round_subject_scope (id, round_id, grade_id, subject_id, confirmed_by, confirmed_at) VALUES
(1, 1, 1, 1, 1, '2026-08-01 09:00+07'),
(2, 1, 1, 2, 1, '2026-08-01 09:00+07'),
(3, 1, 2, 3, 1, '2026-08-01 09:00+07'),
(4, 1, 3, 3, 1, '2026-08-01 09:00+07'),
(5, 1, 4, 2, 1, '2026-08-01 09:00+07'),
(6, 2, 1, 2, NULL, NULL);

INSERT INTO class_subject_applicability (id, scope_id, class_id, status, reason, updated_by, confirmed_by, confirmed_at) VALUES
(1, 1, 1, 'APPLICABLE', NULL, 1, 1, '2026-08-01 09:00+07'),
(2, 1, 2, 'APPLICABLE', NULL, 1, 1, '2026-08-01 09:00+07'),
(3, 1, 3, 'NOT_APPLICABLE', 'Ngoài phạm vi demo', 1, 1, '2026-08-01 09:00+07'),
(4, 2, 1, 'APPLICABLE', NULL, 1, 1, '2026-08-01 09:00+07'),
(5, 2, 2, 'APPLICABLE', NULL, 1, 1, '2026-08-01 09:00+07'),
(6, 2, 3, 'NOT_APPLICABLE', 'Ngoài phạm vi demo', 1, 1, '2026-08-01 09:00+07'),
(7, 3, 4, 'APPLICABLE', NULL, 1, 1, '2026-08-01 09:00+07'),
(8, 4, 5, 'APPLICABLE', NULL, 1, 1, '2026-08-01 09:00+07'),
(9, 5, 6, 'APPLICABLE', NULL, 1, 1, '2026-08-01 09:00+07'),
(10, 6, 1, 'APPLICABLE', NULL, 1, NULL, NULL),
(11, 6, 2, 'APPLICABLE', NULL, 1, NULL, NULL),
(12, 6, 3, 'UNDETERMINED', 'Chờ xác nhận', 1, NULL, NULL);

INSERT INTO teaching_demand (id, semester_id, class_id, subject_id, periods_per_week, status, updated_by, demand_type, valid_from, valid_to, unit) VALUES
(1, 1, 1, 1, 2, 'ACTIVE', 1, 'STANDARD', '2026-08-01', '2026-12-31', 'PERIOD_PER_WEEK'),
(2, 1, 1, 1, 1, 'ACTIVE', 1, 'SPECIALIZED_TOPIC', '2026-08-01', '2026-12-31', 'PERIOD_PER_WEEK'),
(3, 1, 2, 1, 3, 'ACTIVE', 1, 'STANDARD', '2026-08-01', '2026-12-31', 'PERIOD_PER_WEEK'),
(4, 1, 1, 2, 4, 'ACTIVE', 1, 'STANDARD', '2026-08-01', '2026-12-31', 'PERIOD_PER_WEEK'),
(5, 1, 2, 2, 5, 'ACTIVE', 1, 'STANDARD', '2026-08-01', '2026-10-31', 'PERIOD_PER_WEEK'),
(6, 1, 2, 2, 4, 'ACTIVE', 1, 'STANDARD', '2026-11-01', '2026-12-31', 'PERIOD_PER_WEEK'),
(7, 1, 1, 2, 0.5, 'ACTIVE', 1, 'ENRICHMENT', '2026-11-01', '2026-12-31', 'PERIOD_PER_WEEK'),
(8, 1, 4, 3, 4, 'ACTIVE', 1, 'STANDARD', '2026-08-01', '2026-12-31', 'PERIOD_PER_WEEK'),
(9, 1, 5, 3, 4, 'ACTIVE', 1, 'STANDARD', '2026-08-01', '2026-12-31', 'PERIOD_PER_WEEK'),
(10, 1, 6, 2, 4, 'ACTIVE', 1, 'STANDARD', '2026-08-01', '2026-12-31', 'PERIOD_PER_WEEK');

INSERT INTO required_demand_component (id, applicability_id, demand_type, valid_from, valid_to, demand_id, confirmed_by, confirmed_at) VALUES
(1, 1, 'STANDARD', '2026-08-01', '2026-12-31', 1, 1, '2026-08-01 09:00+07'),
(2, 1, 'SPECIALIZED_TOPIC', '2026-08-01', '2026-12-31', 2, 1, '2026-08-01 09:00+07'),
(3, 2, 'STANDARD', '2026-08-01', '2026-12-31', 3, 1, '2026-08-01 09:00+07'),
(4, 4, 'STANDARD', '2026-08-01', '2026-12-31', 4, 1, '2026-08-01 09:00+07'),
(5, 5, 'STANDARD', '2026-08-01', '2026-10-31', 5, 1, '2026-08-01 09:00+07'),
(6, 5, 'STANDARD', '2026-11-01', '2026-12-31', 6, 1, '2026-08-01 09:00+07'),
(7, 4, 'ENRICHMENT', '2026-11-01', '2026-12-31', 7, 1, '2026-08-01 09:00+07'),
(8, 7, 'STANDARD', '2026-08-01', '2026-12-31', 8, 1, '2026-08-01 09:00+07'),
(9, 8, 'STANDARD', '2026-08-01', '2026-12-31', 9, 1, '2026-08-01 09:00+07'),
(10, 9, 'STANDARD', '2026-08-01', '2026-12-31', 10, 1, '2026-08-01 09:00+07'),
(11, 10, 'STANDARD', '2026-08-01', '2026-12-31', 4, NULL, NULL),
(12, 10, 'ENRICHMENT', '2026-11-01', '2026-12-31', NULL, NULL, NULL),
(13, 11, 'STANDARD', '2026-08-01', '2026-10-31', 5, NULL, NULL),
(14, 11, 'STANDARD', '2026-11-01', '2026-12-31', 6, NULL, NULL);

-- Xac nhan tap SAU KHI da tao tat ca thanh phan; trigger doi tap se huy xac nhan.
UPDATE class_subject_applicability SET components_confirmed_by=1,components_confirmed_at=clock_timestamp() WHERE id IN (1,2,4,5,7,8,9);

-- Tat ca nguon da nap. Tu day khong sua du lieu nguon de snapshot con moi.
SELECT tass_capture_snapshot(1,1,1,'[{"demand_id":1,"teacher_id":1,"reason":"Giữ phân công thủ công đã chốt (demo)"}]'::jsonb);
INSERT INTO assignment_plan(id,round_id,plan_code,created_by) VALUES(1,1,'DEMO_PLAN_HK1',1);
INSERT INTO plan_version(id,plan_id,version_no,status,input_snapshot_id,created_by)
 VALUES(1,1,1,'DRAFT',(SELECT max(id) FROM input_snapshot),1);
UPDATE assignment_plan SET current_version_id=1 WHERE id=1;

INSERT INTO plan_demand (id, plan_version_id, demand_id, periods_per_week_snapshot, teacher_id, unassigned_reason_code, unassigned_reason_text, is_locked, locked_by, locked_at, lock_reason) VALUES
(1, 1, 1, 2, 1, NULL, NULL, TRUE, 1, '2026-08-01 09:00+07', 'Giữ phân công thủ công đã chốt (demo)'),
(2, 1, 2, 1, NULL, 'DEMO_PENDING', 'Chưa chọn GV chuyên đề', FALSE, NULL, NULL, NULL),
(3, 1, 3, 3, 2, NULL, NULL, FALSE, NULL, NULL, NULL),
(4, 1, 4, 4, 3, NULL, NULL, FALSE, NULL, NULL, NULL),
(5, 1, 5, 5, 3, NULL, NULL, FALSE, NULL, NULL, NULL),
(6, 1, 6, 4, 3, NULL, NULL, FALSE, NULL, NULL, NULL),
(7, 1, 7, 0.5, 3, NULL, NULL, FALSE, NULL, NULL, NULL),
(8, 1, 8, 4, 5, NULL, NULL, FALSE, NULL, NULL, NULL),
(9, 1, 9, 4, 5, NULL, NULL, FALSE, NULL, NULL, NULL),
(10, 1, 10, 4, 3, NULL, NULL, FALSE, NULL, NULL, NULL);

-- Validation 1 la ket qua SQL THUC TE cua kiem tra bao phu, khong phai full validator.
INSERT INTO validation_run(id,plan_version_id,input_snapshot_id,revision_no,source_revision_token,checked_by,overall_status)
 SELECT 1,id,input_snapshot_id,revision_no,(SELECT source_revision_token FROM input_snapshot WHERE id=input_snapshot_id),1,'VIOLATION'
 FROM plan_version WHERE id=1;
INSERT INTO validation_result(id,validation_run_id,br_code,subject_type,subject_ref,calculation_period,result_status,severity,message)
 SELECT 1,1,'BR-01','PLAN_DEMAND','2','SEMESTER:1','VIOLATION','ERROR','SQL coverage: chuyên đề chưa được gán'
 WHERE EXISTS(SELECT 1 FROM plan_demand WHERE id=2 AND teacher_id IS NULL);
UPDATE plan_demand SET teacher_id=2,unassigned_reason_code=NULL,unassigned_reason_text=NULL WHERE id=2;

-- Validation 2: bao phu + tai tuan demo du, du lieu NAM van thieu.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM v_tass_preparation_issues WHERE round_id=1)
 OR EXISTS(SELECT 1 FROM v_tass_required_coverage WHERE round_id=1 AND coverage_status<>'ASSIGNED')
 OR EXISTS(SELECT 1 FROM tass_snapshot_weekly_load(1,DATE '2026-10-15') WHERE NOT weekly_complete OR t>25)
 OR EXISTS(SELECT 1 FROM tass_snapshot_weekly_load(1,DATE '2026-11-15') WHERE NOT weekly_complete OR t>25)
 THEN RAISE EXCEPTION 'Seed weekly/coverage fixture is inconsistent'; END IF;
END; $$;
INSERT INTO validation_run(id,plan_version_id,input_snapshot_id,revision_no,source_revision_token,checked_by,overall_status)
 SELECT 2,id,input_snapshot_id,revision_no,(SELECT source_revision_token FROM input_snapshot WHERE id=input_snapshot_id),1,'INSUFFICIENT_DATA'
 FROM plan_version WHERE id=1;
INSERT INTO validation_result(id,validation_run_id,br_code,subject_type,subject_ref,calculation_period,result_status,severity,missing_data_json,message) VALUES
 (2,2,'BR-01','PLAN_VERSION','1','SEMESTER:1','PASS','INFO',NULL,'SQL fixture: 10/10 thành phần đã gán'),
 (3,2,'BR-09','PLAN_VERSION','1','ACADEMIC_YEAR:1','INSUFFICIENT_DATA','WARNING','{"missing":["HK2_actuals","yearly_totals"]}',
 'Thiếu riêng dữ liệu năm; demo có thể mở phản hồi với cảnh báo. Chưa có full legal/API validator.');
UPDATE plan_version SET status='OPEN_FOR_FEEDBACK',feedback_deadline=clock_timestamp()+INTERVAL '1 day',revision_no=revision_no+1 WHERE id=1;
INSERT INTO feedback(id,plan_id,plan_version_id,teacher_id,plan_demand_id,feedback_type,subject_id,content,status)
 VALUES(1,1,1,2,2,'ASSIGNMENT_CHANGE',1,'Đề nghị chuyển chuyên đề 10A1 sang GV C, giữ Lý 10A2.','PENDING');
-- Phan hoi nhan them: 4 la TONG mong muon, khong phai tang them 4.
INSERT INTO feedback(id,plan_id,plan_version_id,teacher_id,feedback_type,subject_id,requested_periods_per_week,content,status)
 VALUES(2,1,1,2,'REQUEST_SUBJECT_TOTAL',1,4,'Tổng mong muốn môn Vật lý là 4 tiết/tuần.','PENDING');
UPDATE plan_version SET status='FEEDBACK_PROCESSING',revision_no=revision_no+1 WHERE id=1;
UPDATE feedback SET status='RESOLVED',resolution='Đã xử lý trong fixture: tạo V2 theo quyết định minh họa.',handled_by=1,handled_at=clock_timestamp() WHERE plan_version_id=1;
INSERT INTO plan_version(id,plan_id,version_no,source_version_id,status,input_snapshot_id,created_by)
 SELECT 2,1,2,1,'DRAFT',input_snapshot_id,1 FROM plan_version WHERE id=1;
UPDATE feedback SET resulting_version_id=2 WHERE plan_version_id=1;
UPDATE assignment_plan SET current_version_id=2 WHERE id=1;
INSERT INTO plan_demand(id,plan_version_id,demand_id,periods_per_week_snapshot,teacher_id,
 unassigned_reason_code,unassigned_reason_text,is_locked,locked_by,locked_at,lock_reason)
 SELECT id+10,2,demand_id,periods_per_week_snapshot,CASE WHEN demand_id=2 THEN 3 ELSE teacher_id END,
 unassigned_reason_code,unassigned_reason_text,is_locked,locked_by,locked_at,lock_reason
 FROM plan_demand WHERE plan_version_id=1 ORDER BY id;

INSERT INTO solver_run(id,plan_version_id,input_snapshot_id,source_revision_token,base_revision_no,requested_by,status,result_summary_json)
SELECT 1,id,input_snapshot_id,(SELECT source_revision_token FROM input_snapshot WHERE id=input_snapshot_id),revision_no,1,'DEMO_NOT_RUN','{"contract_version": 1, "demo_only": true, "ortools_version": "NOT_EXECUTED", "random_seed": 1, "num_workers": 1, "total_budget_seconds": 60, "stages": [{"name": "Z", "status": "NOT_RUN", "objective": null, "best_bound": null, "elapsed_ms": 0, "stop_reason": "DEMO_NOT_EXECUTED", "exactOptimalityProven": false, "gap_tolerance": 0}, {"name": "L1", "status": "NOT_RUN", "objective": null, "best_bound": null, "elapsed_ms": 0, "stop_reason": "DEMO_NOT_EXECUTED", "exactOptimalityProven": false, "gap_tolerance": 0}, {"name": "M", "status": "NOT_RUN", "objective": null, "best_bound": null, "elapsed_ms": 0, "stop_reason": "DEMO_NOT_EXECUTED", "exactOptimalityProven": false, "gap_tolerance": 0}, {"name": "experience", "status": "NOT_RUN", "objective": null, "best_bound": null, "elapsed_ms": 0, "stop_reason": "DEMO_NOT_EXECUTED", "exactOptimalityProven": false, "gap_tolerance": 0}, {"name": "change", "status": "NOT_RUN", "objective": null, "best_bound": null, "elapsed_ms": 0, "stop_reason": "DEMO_NOT_EXECUTED", "exactOptimalityProven": false, "gap_tolerance": 0}], "cp_sat_status": "NOT_RUN", "termination_reason": "DEMO_NOT_EXECUTED", "apply_outcome": "NOT_APPLIED", "config_code": "DEMO_FIVE_STAGE", "config_version": 1, "config_hash": "CALCULATED_BY_POSTGRES", "coverage": {"basis": "EXISTING_DRAFT_NOT_SOLVER_RESULT", "required_phase_components": 10, "assigned": 10, "unassigned": 0}}'::jsonb || jsonb_build_object('config_hash',(SELECT md5(criteria_weights_json::TEXT) FROM optimization_config WHERE id=1)) FROM plan_version WHERE id=2;
-- V2 chua co validation moi; khong sao chep ket qua V1 sang V2.
DO $$
DECLARE t TEXT; seq TEXT; max_id BIGINT;
BEGIN
 FOR t IN SELECT table_name FROM information_schema.columns WHERE table_schema=current_schema()
  AND column_name='id' AND is_identity='YES' LOOP
  seq:=pg_get_serial_sequence(format('%I.%I',current_schema(),t),'id');
  EXECUTE format('SELECT max(id) FROM %I.%I',current_schema(),t) INTO max_id;
  IF max_id IS NOT NULL THEN PERFORM setval(seq::regclass,max_id,TRUE); END IF;
 END LOOP;
END; $$;
COMMIT;
-- Mong doi: 48 bang; 5 GV; 8 lop (6 hien tai + 2 lich su); 10 demands;
-- 14 required components (10 main + 4 preparation); 2 versions, 20 plan rows;
-- 2 feedback RESOLVED; 2 history rows cung khoang thoi gian KHONG tinh gap doi;
-- V2: 2026-10-15 A=2 B=3 C=14 D=0 E=8, tong 27 tiet/tuan;
--     2026-11-15 A=2 B=3 C=13.5 D=0 E=8, tong 26.5 tiet/tuan.
