-- TASS - QUERIES DONG BO ERD / 01_schema.sql / 02_seed.sql
-- PostgreSQL 15+. Chay sau schema va seed. Chi doc, khong thay doi du lieu.
-- Co the chay tung Q trong pgAdmin; cac truy van Q01-Q32 doc lap.
-- Cac gia tri mong doi ap dung cho seed demo chua thay doi.
-- SELECT dung snapshot de xem lich su; du lieu song dung chuan bi/chan doan.
-- Ket qua SELECT khong thay RBAC, CAS giao dich, full legal validator hay solver.
-- Q29/Q32 la doi chieu de nguoi doc nhan ra fixture sai, khong gia lap test API.
-- Goi y psql: psql -v ON_ERROR_STOP=1 -d tass_demo -f 03_queries.sql
BEGIN TRANSACTION READ ONLY;

-- Q01. Tat ca is_expected phai TRUE sau khi nap seed.
SELECT check_name,actual,expected,actual=expected AS is_expected
FROM (VALUES
 ('tables',(SELECT count(*) FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE'),48::BIGINT),
 ('teachers',(SELECT count(*) FROM teacher),5::BIGINT),
 ('classes_all_years',(SELECT count(*) FROM school_class),8::BIGINT),
 ('classes_current_year',(SELECT count(*) FROM school_class WHERE academic_year_id=1),6::BIGINT),
 ('subjects',(SELECT count(*) FROM subject),3::BIGINT),
 ('demands',(SELECT count(*) FROM teaching_demand),10::BIGINT),
 ('required_components',(SELECT count(*) FROM required_demand_component),14::BIGINT),
 ('main_required_components',(SELECT count(*) FROM v_tass_required_coverage WHERE round_id=1),10::BIGINT),
 ('versions',(SELECT count(*) FROM plan_version),2::BIGINT),
 ('all_assignment_rows',(SELECT count(*) FROM plan_demand),20::BIGINT),
 ('feedbacks',(SELECT count(*) FROM feedback),2::BIGINT),
 ('experience_records',(SELECT count(*) FROM teaching_experience),8::BIGINT),
 ('actual_history_rows',(SELECT count(*) FROM teaching_history),2::BIGINT),
 ('workload_basis',(SELECT count(*) FROM teacher_workload_basis),5::BIGINT),
 ('snapshot_schema_v2',(SELECT count(*) FROM input_snapshot WHERE snapshot_schema_version=2),1::BIGINT),
 ('exports',(SELECT count(*) FROM export_record),0::BIGINT)
) x(check_name,actual,expected) ORDER BY check_name;

-- Q02. Danh muc hien tai: 6 lop, co THCS 8/9 va THPT 10/12.
SELECT s.school_code,y.year_code,g.grade_code,lev.level_code,c.class_code,c.status
FROM school_class c JOIN academic_year y ON y.id=c.academic_year_id JOIN school s ON s.id=y.school_id
JOIN grade g ON g.id=c.grade_id JOIN education_level lev ON lev.id=g.education_level_id
WHERE y.year_code='2026-2027' ORDER BY lev.level_code,g.grade_code,c.class_code;

-- Q03. Ma tran ap dung va XAC NHAN TAP BAT BUOC. APPLICABLE khong tu dong la du chuong trinh.
SELECT r.round_code,cl.class_code,sub.subject_code,a.status,a.confirmed_by,
 a.components_confirmed_by,a.components_confirmed_at,count(req.id) AS declared_required_components,
 count(req.id) FILTER(WHERE req.demand_id IS NULL) AS required_without_demand
FROM class_subject_applicability a JOIN round_subject_scope sc ON sc.id=a.scope_id
JOIN assignment_round r ON r.id=sc.round_id JOIN school_class cl ON cl.id=a.class_id
JOIN subject sub ON sub.id=sc.subject_id LEFT JOIN required_demand_component req ON req.applicability_id=a.id
GROUP BY r.round_code,cl.class_code,sub.subject_code,a.id ORDER BY r.round_code,cl.class_code,sub.subject_code;

-- Q04. 10 nhu cau: them ENRICHMENT; Toan 10A2 STANDARD co 2 giai doan KHONG chong nhau.
SELECT d.id,cl.class_code,sub.subject_code,d.demand_type,d.periods_per_week,d.unit,
 d.valid_from,d.valid_to,d.status
FROM teaching_demand d JOIN school_class cl ON cl.id=d.class_id JOIN subject sub ON sub.id=d.subject_id
ORDER BY cl.class_code,sub.subject_code,d.demand_type,d.valid_from;

-- Q05. V1 lich su FEEDBACK_PROCESSING, V2 current DRAFT; khong tao ARCHIVED.
SELECT p.plan_code,v.id,v.version_no,v.source_version_id,v.status,v.revision_no,
 v.input_snapshot_id,p.current_version_id=v.id AS is_current,v.created_at
FROM assignment_plan p JOIN plan_version v ON v.plan_id=p.id ORDER BY p.id,v.version_no;

-- Q06. Phan cong HIEN HANH: ten/loai/hieu luc doc tu snapshot, khong phu thuoc ten song.
WITH current_rows AS (
 SELECT p.plan_code,v.version_no,pd.*,sn.payload_json j
 FROM assignment_plan p JOIN plan_version v ON v.id=p.current_version_id
 JOIN input_snapshot sn ON sn.id=v.input_snapshot_id JOIN plan_demand pd ON pd.plan_version_id=v.id
 WHERE p.plan_code='DEMO_PLAN_HK1'
)
SELECT x.plan_code,x.version_no,x.demand_id,cl->>'class_code' class_code,sub->>'subject_code' subject_code,
 dem->>'demand_type' demand_type,(dem->>'valid_from')::DATE valid_from,(dem->>'valid_to')::DATE valid_to,
 x.periods_per_week_snapshot,te->>'teacher_code' teacher_code,x.is_locked,x.lock_reason,
 x.unassigned_reason_code,x.unassigned_reason_text
FROM current_rows x CROSS JOIN LATERAL jsonb_array_elements(j->'demands') dem
JOIN LATERAL jsonb_array_elements(j->'classes') cl ON (cl->>'id')::BIGINT=(dem->>'class_id')::BIGINT
JOIN LATERAL jsonb_array_elements(j->'subjects') sub ON (sub->>'id')::BIGINT=(dem->>'subject_id')::BIGINT
LEFT JOIN LATERAL(SELECT z FROM jsonb_array_elements(j->'teachers') z WHERE (z->>'id')::BIGINT=x.teacher_id) t(te) ON TRUE
WHERE (dem->>'id')::BIGINT=x.demand_id
ORDER BY class_code,subject_code,demand_type,valid_from;

-- Q07. Tai theo NGAY/GIAI DOAN: A chi la phan cong; T=F+A+C+R.
-- 15/10: A=2 B=3 C=14 D=0 E=8, SUM(A)=27.
-- 15/11: A=2 B=3 C=13.5 D=0 E=8, SUM(A)=26.5.
-- GV D nghi toan ky: is_teaching=FALSE, delta=NULL; khong nam trong muc tieu can bang.
SELECT dates.on_date,l.*
FROM assignment_plan p CROSS JOIN (VALUES(DATE '2026-10-15'),(DATE '2026-11-15')) dates(on_date)
CROSS JOIN LATERAL tass_snapshot_weekly_load(p.current_version_id,dates.on_date) l
WHERE p.plan_code='DEMO_PLAN_HK1' ORDER BY dates.on_date,l.teacher_code;

-- Q08. Bao phu TU TAP BAT BUOC, khong chi tu cac demand da ton tai. MAIN: 10/10.
SELECT r.round_code,count(*) AS required_phase_components,
 count(c.demand_id) AS linked_demands,count(c.plan_demand_id) AS represented,
 count(c.teacher_id) AS assigned,
 count(*) FILTER(WHERE c.coverage_status<>'ASSIGNED') AS incomplete
FROM v_tass_required_coverage c JOIN assignment_round r ON r.id=c.round_id
GROUP BY r.round_code ORDER BY r.round_code;

-- Q09. Thanh phan MAIN con thieu: mong doi 0 dong; khong bo qua dong khong co demand.
SELECT c.* FROM v_tass_required_coverage c JOIN assignment_round r ON r.id=c.round_id
WHERE r.round_code='DEMO_MAIN' AND c.coverage_status<>'ASSIGNED'
ORDER BY c.required_component_id;

-- Q10. So V1-V2: dung 1 thay doi demand_id=2, GV_B -> GV_C.
WITH old_rows AS (
 SELECT pd.* FROM plan_demand pd JOIN plan_version v ON v.id=pd.plan_version_id
 JOIN assignment_plan p ON p.id=v.plan_id WHERE p.plan_code='DEMO_PLAN_HK1' AND v.version_no=1
),new_rows AS (
 SELECT pd.* FROM plan_demand pd JOIN plan_version v ON v.id=pd.plan_version_id
 JOIN assignment_plan p ON p.id=v.plan_id WHERE p.plan_code='DEMO_PLAN_HK1' AND v.version_no=2
)
SELECT COALESCE(o.demand_id,n.demand_id) demand_id,o.teacher_id old_teacher,n.teacher_id new_teacher,
 o.periods_per_week_snapshot old_periods,n.periods_per_week_snapshot new_periods,
 o.is_locked old_locked,n.is_locked new_locked
FROM old_rows o FULL JOIN new_rows n ON n.demand_id=o.demand_id
WHERE ROW(o.teacher_id,o.periods_per_week_snapshot,o.is_locked)
 IS DISTINCT FROM ROW(n.teacher_id,n.periods_per_week_snapshot,n.is_locked)
 OR o.id IS NULL OR n.id IS NULL ORDER BY demand_id;

-- Q11. 2 feedback RESOLVED: cung plan, nguon V1 -> ket qua V2.
-- requested_periods_per_week=4 la TONG mong muon. Tong Lý cua GV B o V1 la 4.
SELECT f.id,p.plan_code,src.version_no source_version,dst.version_no resulting_version,
 f.teacher_id,f.feedback_type,f.requested_periods_per_week,
 (SELECT sum(pd.periods_per_week_snapshot) FROM plan_demand pd
  JOIN input_snapshot sn ON sn.id=src.input_snapshot_id
  CROSS JOIN LATERAL jsonb_array_elements(sn.payload_json->'demands') dem
  WHERE pd.plan_version_id=src.id AND pd.teacher_id=f.teacher_id AND (dem->>'id')::BIGINT=pd.demand_id
   AND (dem->>'subject_id')::BIGINT=f.subject_id
   AND DATE '2026-11-15' BETWEEN (dem->>'valid_from')::DATE AND (dem->>'valid_to')::DATE) source_subject_total_on_date,
 f.content,f.status,f.resolution,f.submitted_at,f.handled_at
FROM feedback f JOIN assignment_plan p ON p.id=f.plan_id JOIN plan_version src ON src.id=f.plan_version_id
LEFT JOIN plan_version dst ON dst.id=f.resulting_version_id ORDER BY f.id;

-- Q12. Snapshot v2, checksum demo, tap bat buoc/kinh nghiem/diem phat/ho so tai va alias.
SELECT sn.id,sn.snapshot_schema_version,sn.content_hash=md5(sn.payload_json::TEXT) checksum_matches,
 sn.source_revision_token=r.source_revision_token source_still_current,
 sn.payload_json::TEXT NOT LIKE '%credential_hash%' excludes_credentials,
 jsonb_array_length(payload_json->'demands') demand_count,
 jsonb_array_length(payload_json->'required_components') required_count,
 jsonb_array_length(payload_json->'experience_penalties') penalty_pair_count,
 jsonb_array_length(payload_json->'workload_basis') basis_count,
 jsonb_array_length(payload_json->'teacher_aliases') teacher_alias_count,
 payload_json->'yearly_data' yearly_data,payload_json->'limitations' limitations
FROM input_snapshot sn JOIN assignment_round r ON r.id=sn.round_id ORDER BY sn.id;

-- Q13. Validation V1 cu theo revision va current version: is_fresh deu FALSE.
SELECT vr.id,v.version_no,vr.revision_no checked_revision,v.revision_no current_revision,
 vr.overall_status,vr.input_snapshot_id,vr.source_revision_token,
 tass_validation_is_fresh(vr.id) is_fresh
FROM validation_run vr JOIN plan_version v ON v.id=vr.plan_version_id ORDER BY vr.id;

-- Q14. V2 hien tai chua duoc kiem tra: NOT_CHECKED, fresh=FALSE.
SELECT p.plan_code,v.version_no,v.revision_no,COALESCE(x.overall_status,'NOT_CHECKED') latest_status,
 COALESCE(tass_validation_is_fresh(x.id),FALSE) has_fresh_check
FROM assignment_plan p JOIN plan_version v ON v.id=p.current_version_id
LEFT JOIN LATERAL(SELECT vr.* FROM validation_run vr WHERE vr.plan_version_id=v.id
 ORDER BY vr.checked_at DESC,vr.id DESC LIMIT 1) x ON TRUE;

-- Q15. Phan biet VIOLATION/PASS/INSUFFICIENT_DATA; thieu nam khong doi thanh PASS.
SELECT vr.id validation_id,v.version_no,vr.revision_no,res.br_code,res.result_status,
 res.severity,res.calculation_period,res.missing_data_json,res.message
FROM validation_result res JOIN validation_run vr ON vr.id=res.validation_run_id
JOIN plan_version v ON v.id=vr.plan_version_id ORDER BY vr.id,res.id;

-- Q16. Kiem tra GV theo HIEU LUC NHU CAU, khong ep moi qualification phu ca hoc ky.
-- Du lieu song cho chan doan; lich su phai dung snapshot. Mong doi 0 dong sai.
SELECT p.plan_code,pd.id,pd.teacher_id,pd.demand_id
FROM assignment_plan p JOIN plan_demand pd ON pd.plan_version_id=p.current_version_id
WHERE pd.teacher_id IS NOT NULL AND tass_teacher_eligible(pd.teacher_id,pd.demand_id) IS DISTINCT FROM TRUE;

-- Q17. Audit thay doi assignment duoc trigger ghi, khong dung JSON gia thay luong thuc thi.
SELECT id,actor_id,action,entity_type,entity_ref,outcome,occurred_at,before_json,after_json
FROM audit_log ORDER BY id;

-- Q18. Tai NGOAI PHAM VI F da xac nhan, don vi tiet/tuan theo record_type.
-- NULL o converted/target/overtime duoc giu nguyen, khong tu thanh tai nam =0.
SELECT t.teacher_code,cp.period_code,w.record_type,w.teaching_periods AS outside_scope_periods_per_week,
 w.converted_periods,w.target_periods,w.overtime_periods,w.verification_status,w.evidence_ref
FROM teacher_period_workload w JOIN teacher t ON t.id=w.teacher_id
JOIN calculation_period cp ON cp.id=w.calculation_period_id ORDER BY cp.starts_on,t.teacher_code;

-- Q19. MAIN phai 0 issue. PREPARATION co chua xac nhan/UNDETERMINED va thieu link.
SELECT r.round_code,i.issue,i.record_id FROM v_tass_preparation_issues i
JOIN assignment_round r ON r.id=i.round_id ORDER BY r.round_code,i.issue,i.record_id;

-- Q20. Chan doan lien ket va khoa: mong doi 0 dong.
SELECT 'CURRENT_VERSION_MISSING_OR_WRONG_PLAN'::TEXT issue,p.id record_id
 FROM assignment_plan p LEFT JOIN plan_version v ON v.id=p.current_version_id WHERE v.id IS NULL OR v.plan_id<>p.id
UNION ALL SELECT 'FEEDBACK_RESULT_WRONG_PLAN',f.id FROM feedback f
 JOIN plan_version src ON src.id=f.plan_version_id JOIN plan_version dst ON dst.id=f.resulting_version_id
 WHERE f.plan_id<>src.plan_id OR f.plan_id<>dst.plan_id OR src.id=dst.id
UNION ALL SELECT 'FEEDBACK_WRONG_SENDER_OR_VERSION',f.id FROM feedback f
 JOIN plan_demand pd ON pd.id=f.plan_demand_id WHERE pd.teacher_id IS DISTINCT FROM f.teacher_id OR pd.plan_version_id<>f.plan_version_id
UNION ALL SELECT 'INVALID_LOCK_METADATA',pd.id FROM plan_demand pd WHERE pd.is_locked
 AND (pd.teacher_id IS NULL OR pd.locked_by IS NULL OR pd.locked_at IS NULL OR NULLIF(btrim(pd.lock_reason),'') IS NULL)
ORDER BY issue,record_id;

-- Q21. 0 nam (GV C / Ly 10) KHAC UNKNOWN (GV D); penalty cua UNKNOWN= NULL vi policy BLOCK.
SELECT t.teacher_code,s.subject_code,g.grade_code,e.experience_status,e.years_of_experience,e.as_of_date,
 e.evidence_ref,tass_experience_penalty(e.years_of_experience,c.criteria_weights_json) demo_penalty
FROM teaching_experience e JOIN teacher t ON t.id=e.teacher_id JOIN subject s ON s.id=e.subject_id
JOIN grade g ON g.id=e.grade_id CROSS JOIN optimization_config c
WHERE c.config_code='DEMO_FIVE_STAGE' ORDER BY t.teacher_code,s.subject_code,g.grade_code;

-- Q22. 2 lop thuc day dong thoi chi tinh HOP KHOANG THOI GIAN, khong nhan doi so nam.
WITH merged AS (
 SELECT teacher_id,subject_id,range_agg(daterange(taught_from,taught_to,'[]')) periods,
 sum(taught_to-taught_from+1) naive_class_days,count(*) history_rows
 FROM teaching_history WHERE verification_status='VERIFIED' GROUP BY teacher_id,subject_id
)
SELECT t.teacher_code,s.subject_code,m.history_rows,m.periods,m.naive_class_days,
 (SELECT sum(upper(x)-lower(x)) FROM unnest(m.periods) x) distinct_teaching_days,
 (SELECT sum(upper(x)-lower(x)) FROM unnest(m.periods) x)<m.naive_class_days overlapping_classes_not_double_counted
FROM merged m JOIN teacher t ON t.id=m.teacher_id JOIN subject s ON s.id=m.subject_id;
-- Quy tac chuyen ngay/nam hoc thanh "so nam" can theo ho so da xac nhan; khong tu chia 365.25.

-- Q23. B lay tu HO SO cap cong tac, khong suy tu mon day.
SELECT t.teacher_code,lev.level_code,b.position_code,b.base_periods_per_week,b.unit,
 b.valid_from,b.valid_to,b.profile_ref,b.verification_status,b.verified_by
FROM teacher_workload_basis b JOIN teacher t ON t.id=b.teacher_id
JOIN education_level lev ON lev.id=b.education_level_id ORDER BY t.teacher_code,b.valid_from;

-- Q24. Giu khoa demand=1, GV A o V2; chay lai khong duoc tu doi khoa nay.
SELECT p.plan_code,v.version_no,pd.demand_id,pd.teacher_id,pd.is_locked,pd.locked_by,pd.locked_at,pd.lock_reason
FROM assignment_plan p JOIN plan_version v ON v.id=p.current_version_id
JOIN plan_demand pd ON pd.plan_version_id=v.id WHERE pd.is_locked;

-- Q25. Hop dong 5 muc tieu; ngan sach 50s solver + 10s chuan bi/hau kiem/lua ket qua =60s.
SELECT config_code,version_no,criteria_weights_json->'objective_order' objective_order,
 criteria_weights_json->>'load_basis' load_basis,criteria_weights_json#>'{experience,beta}' beta,
 criteria_weights_json#>'{experience,grade_weights}' grade_weights,
 criteria_weights_json#>'{experience,penalty_bands}' years_to_penalty,
 time_limit_seconds,criteria_weights_json->'stage_budgets' stage_budgets,
 (SELECT sum((x->>'seconds')::NUMERIC) FROM jsonb_array_elements(criteria_weights_json->'stage_budgets') x) solver_budget_seconds,
 tass_config_valid(criteria_weights_json,time_limit_seconds) contract_valid
FROM optimization_config;

-- Q26. 5 dong NOT_RUN. KHONG co ket qua solver that hay bang chung toi uu gia.
SELECT sr.id,sr.status,sr.base_revision_no,sr.applied_revision_no,
 sr.result_summary_json->>'ortools_version' ortools_version,
 sr.result_summary_json->>'apply_outcome' apply_outcome,
 stage->>'name' objective_name,stage->>'status' solver_status,stage->>'objective' objective,
 stage->>'best_bound' best_bound,stage->>'elapsed_ms' elapsed_ms,
 stage->>'exactOptimalityProven' exact_optimality_proven
FROM solver_run sr CROSS JOIN LATERAL jsonb_array_elements(sr.result_summary_json->'stages') WITH ORDINALITY x(stage,n)
ORDER BY sr.id,x.n;

-- Q27. Doi soat alias co FK that va vi tri nguon file/sheet/cell/raw.
SELECT 'TEACHER' entity_type,a.teacher_id entity_id,a.alias_value,i.original_file_name,a.source_sheet,a.source_cell,a.raw_value_json,a.verification_status
 FROM teacher_alias a JOIN source_import i ON i.id=a.source_import_id
UNION ALL SELECT 'CLASS',a.class_id,a.alias_value,i.original_file_name,a.source_sheet,a.source_cell,a.raw_value_json,a.verification_status
 FROM class_alias a JOIN source_import i ON i.id=a.source_import_id
UNION ALL SELECT 'SUBJECT',a.subject_id,a.alias_value,i.original_file_name,a.source_sheet,a.source_cell,a.raw_value_json,a.verification_status
 FROM subject_alias a JOIN source_import i ON i.id=a.source_import_id ORDER BY entity_type;

-- Q28. 10 component-phase rows nhung tai 27 / 26.5 theo thoi diem, KHONG sum ca hai phase=31.5.
SELECT q.on_date,count(*) FILTER(WHERE pd.teacher_id IS NOT NULL) assigned_active_components,
 sum(pd.periods_per_week_snapshot) assigned_periods_per_week
FROM assignment_plan p JOIN plan_version v ON v.id=p.current_version_id JOIN input_snapshot sn ON sn.id=v.input_snapshot_id
JOIN plan_demand pd ON pd.plan_version_id=v.id CROSS JOIN LATERAL jsonb_array_elements(sn.payload_json->'demands') d
CROSS JOIN (VALUES(DATE '2026-10-15'),(DATE '2026-11-15')) q(on_date)
WHERE (d->>'id')::BIGINT=pd.demand_id AND q.on_date BETWEEN (d->>'valid_from')::DATE AND (d->>'valid_to')::DATE
GROUP BY q.on_date ORDER BY q.on_date;

-- Q29. Cac invariant cua seed: tat ca must_be_true phai TRUE.
SELECT check_name,must_be_true FROM (VALUES
 ('main_preparation_complete',NOT EXISTS(SELECT 1 FROM v_tass_preparation_issues WHERE round_id=1)),
 ('main_all_required_assigned',NOT EXISTS(SELECT 1 FROM v_tass_required_coverage WHERE round_id=1 AND coverage_status<>'ASSIGNED')),
 ('preparation_detects_missing_demand',EXISTS(SELECT 1 FROM v_tass_preparation_issues WHERE round_id=2 AND issue='MISSING_OR_INVALID_REQUIRED_DEMAND')),
 ('october_load_27',(SELECT sum(a)=27 FROM tass_snapshot_weekly_load(2,DATE '2026-10-15'))),
 ('november_load_26_5',(SELECT sum(a)=26.5 FROM tass_snapshot_weekly_load(2,DATE '2026-11-15'))),
 ('whole_KHTN_one_teacher',(SELECT count(DISTINCT pd.teacher_id)=1 AND min(pd.teacher_id)=5 FROM plan_demand pd JOIN teaching_demand d ON d.id=pd.demand_id JOIN subject s ON s.id=d.subject_id WHERE pd.plan_version_id=2 AND s.subject_code='KHTN')),
 ('leave_teacher_unassigned',NOT EXISTS(SELECT 1 FROM plan_demand WHERE teacher_id=4)),
 ('V2_has_no_reused_validation',NOT EXISTS(SELECT 1 FROM validation_run WHERE plan_version_id=2)),
 ('annual_missing_remains_insufficient',EXISTS(SELECT 1 FROM validation_result WHERE result_status='INSUFFICIENT_DATA' AND calculation_period LIKE 'ACADEMIC_YEAR:%')),
 ('zero_experience_is_known',EXISTS(SELECT 1 FROM teaching_experience WHERE experience_status='NO_EXPERIENCE' AND years_of_experience=0)),
 ('unknown_experience_is_null',EXISTS(SELECT 1 FROM teaching_experience WHERE experience_status='UNKNOWN' AND years_of_experience IS NULL)),
 ('no_fake_applied_solver',NOT EXISTS(SELECT 1 FROM solver_run WHERE applied_revision_no IS NOT NULL)),
 ('one_current_lock',(SELECT count(*)=1 FROM plan_demand WHERE plan_version_id=2 AND is_locked))
) x(check_name,must_be_true) ORDER BY check_name;

-- Q30. 48 bang co the doi chieu ten voi ERD (REF trong ERD khong tao bang phu).
SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE' ORDER BY table_name;

-- Q31. 4 EXCLUDE bao ve chong hieu luc (khong phu thuoc extension), plus composite FK.
SELECT c.conrelid::regclass AS table_name,c.conname,c.contype,pg_get_constraintdef(c.oid) definition
FROM pg_constraint c WHERE c.connamespace=current_schema()::regnamespace
 AND (c.contype='x' OR (c.contype='f' AND c.conrelid IN ('assignment_plan'::regclass,'feedback'::regclass,'export_record'::regclass)))
ORDER BY c.conrelid::regclass::TEXT,c.conname;

-- Q32. Phat hien overlap da ton tai: mong doi 0 dong (DB cung tu choi khi ghi).
SELECT 'DEMAND_OVERLAP'::TEXT issue,a.id first_id,b.id second_id
FROM teaching_demand a JOIN teaching_demand b ON a.id<b.id AND a.semester_id=b.semester_id
 AND a.class_id=b.class_id AND a.subject_id=b.subject_id AND a.demand_type=b.demand_type
 AND daterange(a.valid_from,a.valid_to,'[]') && daterange(b.valid_from,b.valid_to,'[]')
UNION ALL SELECT 'EMPLOYMENT_OVERLAP',a.id,b.id FROM teacher_employment a JOIN teacher_employment b
 ON a.id<b.id AND a.teacher_id=b.teacher_id AND a.semester_id=b.semester_id
 AND daterange(a.valid_from,a.valid_to,'[]') && daterange(b.valid_from,b.valid_to,'[]')
UNION ALL SELECT 'WORKLOAD_BASIS_OVERLAP',a.id,b.id FROM teacher_workload_basis a JOIN teacher_workload_basis b
 ON a.id<b.id AND a.teacher_id=b.teacher_id AND a.semester_id=b.semester_id
 AND daterange(a.valid_from,a.valid_to,'[]') && daterange(b.valid_from,b.valid_to,'[]');
COMMIT;
