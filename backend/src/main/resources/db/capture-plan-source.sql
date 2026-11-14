-- Raw DB contract for DRAFT initialization/refresh, deliberately not tass-solver/2.
-- One statement captures all source rows at one MVCC snapshot. Caller holds the round lock.
WITH context AS (
    SELECT r.*, se.academic_year_id, y.school_id
    FROM assignment_round r JOIN semester se ON se.id=r.semester_id
    JOIN academic_year y ON y.id=se.academic_year_id WHERE r.id=:roundId
), payload AS (
    SELECT c.id AS round_id, c.source_revision_token, jsonb_build_object(
        'schema_version', 2, 'purpose', 'PLAN_DRAFT_SOURCE', 'solver_input_ready', false,
        'normalization_status', 'NOT_BUILT', 'source_revision_token', c.source_revision_token,
        'round', (SELECT to_jsonb(x) FROM assignment_round x WHERE x.id=c.id),
        'school', (SELECT to_jsonb(x) FROM school x WHERE x.id=c.school_id),
        'academic_year', (SELECT to_jsonb(x) FROM academic_year x WHERE x.id=c.academic_year_id),
        'semester', (SELECT to_jsonb(x) FROM semester x WHERE x.id=c.semester_id),
        'education_levels', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM education_level x),
        'grades', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM grade x),
        'classes', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM school_class x WHERE x.academic_year_id=c.academic_year_id),
        'subjects', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM subject x),
        'scope', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM round_subject_scope x WHERE x.round_id=c.id),
        'applicability', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM class_subject_applicability x
            JOIN round_subject_scope sc ON sc.id=x.scope_id WHERE sc.round_id=c.id),
        'required_components', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM required_demand_component x
            JOIN class_subject_applicability a ON a.id=x.applicability_id JOIN round_subject_scope sc ON sc.id=a.scope_id WHERE sc.round_id=c.id),
        'demands', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM teaching_demand x
            WHERE x.semester_id=c.semester_id AND x.status='ACTIVE' AND EXISTS (
                SELECT 1 FROM round_subject_scope sc JOIN class_subject_applicability a ON a.scope_id=sc.id
                WHERE sc.round_id=c.id AND sc.subject_id=x.subject_id AND a.class_id=x.class_id AND a.status='APPLICABLE')),
        'teachers', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM teacher x WHERE x.school_id=c.school_id),
        'departments', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM department x WHERE x.school_id=c.school_id),
        'employment', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM teacher_employment x
            JOIN teacher t ON t.id=x.teacher_id WHERE t.school_id=c.school_id AND x.semester_id=c.semester_id),
        'qualifications', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM teaching_qualification x
            JOIN teacher t ON t.id=x.teacher_id WHERE t.school_id=c.school_id),
        'experience', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM teaching_experience x
            JOIN teacher t ON t.id=x.teacher_id WHERE t.school_id=c.school_id),
        'experience_penalties', '[]'::jsonb,
        'teaching_history', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM teaching_history x
            JOIN teacher t ON t.id=x.teacher_id WHERE t.school_id=c.school_id),
        'workload_basis', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM teacher_workload_basis x
            JOIN teacher t ON t.id=x.teacher_id WHERE t.school_id=c.school_id AND x.semester_id=c.semester_id),
        'duties', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM teacher_duty x
            JOIN teacher t ON t.id=x.teacher_id WHERE t.school_id=c.school_id AND x.semester_id=c.semester_id),
        'reductions', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM teacher_reduction x
            JOIN teacher t ON t.id=x.teacher_id WHERE t.school_id=c.school_id AND x.semester_id=c.semester_id),
        'converted_activities', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM converted_activity x
            JOIN calculation_period cp ON cp.id=x.calculation_period_id WHERE cp.semester_id=c.semester_id),
        'calculation_periods', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM calculation_period x WHERE x.semester_id=c.semester_id),
        'period_workloads', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM teacher_period_workload x
            JOIN calculation_period cp ON cp.id=x.calculation_period_id WHERE cp.semester_id=c.semester_id),
        'school_context', (SELECT to_jsonb(x) FROM school_context x WHERE x.semester_id=c.semester_id),
        'funds', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM school_fund x
            JOIN school_context ctx ON ctx.id=x.school_context_id WHERE ctx.semester_id=c.semester_id),
        'fund_allocations', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM fund_allocation x
            JOIN school_fund f ON f.id=x.school_fund_id JOIN school_context ctx ON ctx.id=f.school_context_id WHERE ctx.semester_id=c.semester_id),
        'rule_set', (SELECT to_jsonb(x) FROM rule_set_version x WHERE x.id=:rulesId),
        'rules', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM rule_definition x WHERE x.rule_set_version_id=:rulesId),
        'optimization_config', (SELECT to_jsonb(x) FROM optimization_config x WHERE x.id=:configId),
        'locked_assignments', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM plan_demand x WHERE x.plan_version_id=:versionId AND x.is_locked),
        'previous_assignments', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM plan_demand x WHERE x.plan_version_id=:versionId)
    ) AS body FROM context c
)
INSERT INTO input_snapshot(round_id,rule_set_version_id,optimization_config_id,snapshot_schema_version,
    source_revision_token,payload_json,content_hash)
SELECT round_id,:rulesId,:configId,2,source_revision_token,body,md5(body::text) FROM payload RETURNING id
