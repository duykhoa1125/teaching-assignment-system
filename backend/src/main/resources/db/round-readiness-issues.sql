WITH ctx AS (
    SELECT r.id,r.semester_id,r.scope_confirmed_by,r.scope_confirmed_at,se.academic_year_id,
        se.starts_on semester_start,se.ends_on semester_end,y.school_id,s.status school_status
    FROM assignment_round r JOIN semester se ON se.id=r.semester_id
    JOIN academic_year y ON y.id=se.academic_year_id JOIN school s ON s.id=y.school_id WHERE r.id=:roundId
), demands AS (
    SELECT d.*,c.grade_id,c.status class_status,g.education_level_id FROM teaching_demand d
    JOIN school_class c ON c.id=d.class_id JOIN grade g ON g.id=c.grade_id CROSS JOIN ctx
    WHERE d.semester_id=ctx.semester_id AND d.status='ACTIVE' AND EXISTS (
        SELECT 1 FROM round_subject_scope sc JOIN class_subject_applicability a ON a.scope_id=sc.id
        WHERE sc.round_id=ctx.id AND a.class_id=d.class_id AND sc.subject_id=d.subject_id AND a.status='APPLICABLE')
), span AS (
    SELECT coalesce(min(valid_from),(SELECT semester_start FROM ctx)) starts_on,
        coalesce(max(valid_to),(SELECT semester_end FROM ctx)) ends_on FROM demands
), teachers AS (
    SELECT t.* FROM teacher t JOIN ctx ON ctx.school_id=t.school_id
), employments AS (
    SELECT e.* FROM teacher_employment e JOIN teachers t ON t.id=e.teacher_id CROSS JOIN ctx CROSS JOIN span
    WHERE e.semester_id=ctx.semester_id AND e.valid_from<=span.ends_on
      AND coalesce(e.valid_to,ctx.semester_end)>=span.starts_on
), active AS (
    SELECT DISTINCT t.id FROM teachers t JOIN employments e ON e.teacher_id=t.id WHERE e.employment_status='TEACHING'
), periods AS (
    SELECT cp.* FROM calculation_period cp CROSS JOIN ctx CROSS JOIN span
    WHERE cp.semester_id=ctx.semester_id AND cp.starts_on<=span.ends_on AND cp.ends_on>=span.starts_on
), config AS (
    SELECT c.*,tass_config_valid(c.criteria_weights_json,c.time_limit_seconds) valid
    FROM optimization_config c WHERE c.id=:configId
), policy AS (
    SELECT criteria_weights_json#>>'{experience,unknown_policy}' unknown_policy,
        CASE WHEN valid THEN (criteria_weights_json#>>'{experience,as_of_date}')::date END as_of_date
    FROM config
), eligible AS (
    SELECT t.id teacher_id,d.id demand_id,d.subject_id,d.grade_id FROM teachers t CROSS JOIN demands d
    WHERE tass_teacher_eligible(t.id,d.id)
), experience AS (
    SELECT e.*,x.id evidence_id,x.experience_status,x.years_of_experience,p.unknown_policy
    FROM eligible e CROSS JOIN policy p LEFT JOIN LATERAL (
        SELECT z.* FROM teaching_experience z WHERE z.teacher_id=e.teacher_id AND z.subject_id=e.subject_id
          AND z.grade_id=e.grade_id AND z.as_of_date<=p.as_of_date ORDER BY z.as_of_date DESC,z.id DESC LIMIT 1
    ) x ON true
), reductions AS (
    SELECT 'TEACHER_DUTY'::text entity_type,d.id,d.teacher_id,d.rule_definition_id,d.valid_from,d.valid_to,
        d.reduction_value,d.verification_status,d.evidence_ref,d.verified_by
    FROM teacher_duty d JOIN active a ON a.id=d.teacher_id CROSS JOIN ctx CROSS JOIN span
    WHERE d.semester_id=ctx.semester_id AND d.valid_from<=span.ends_on AND coalesce(d.valid_to,ctx.semester_end)>=span.starts_on
    UNION ALL
    SELECT 'TEACHER_REDUCTION',d.id,d.teacher_id,d.rule_definition_id,d.valid_from,d.valid_to,
        d.reduction_value,d.verification_status,d.evidence_ref,d.verified_by
    FROM teacher_reduction d JOIN active a ON a.id=d.teacher_id CROSS JOIN ctx CROSS JOIN span
    WHERE d.semester_id=ctx.semester_id AND d.valid_from<=span.ends_on AND coalesce(d.valid_to,ctx.semester_end)>=span.starts_on
), activities AS (
    SELECT ca.* FROM converted_activity ca JOIN active a ON a.id=ca.teacher_id
    JOIN periods cp ON cp.id=ca.calculation_period_id WHERE ca.include_in_workload
)
SELECT issue code,'ERROR'::text severity,'MISSING_DATA'::text category,
    CASE WHEN issue='ROUND_SCOPE_UNCONFIRMED' THEN 'ASSIGNMENT_ROUND'
         WHEN issue='SCOPE_UNCONFIRMED' THEN 'ROUND_SUBJECT_SCOPE'
         WHEN issue IN ('MISSING_APPLICABILITY','UNDETERMINED','APPLICABILITY_UNCONFIRMED','REQUIRED_SET_UNCONFIRMED') THEN 'CLASS'
         WHEN issue='EMPTY_REQUIRED_SET' THEN 'CLASS_SUBJECT_APPLICABILITY'
         WHEN issue='MISSING_OR_INVALID_REQUIRED_DEMAND' THEN 'REQUIRED_DEMAND_COMPONENT' ELSE 'TEACHING_DEMAND' END entity_type,
    record_id entity_id,NULL::bigint related_id
FROM v_tass_preparation_issues WHERE round_id=:roundId
UNION ALL
SELECT 'SCHOOL_INACTIVE','ERROR','INVALID_DATA','SCHOOL',school_id,NULL FROM ctx WHERE school_status<>'ACTIVE'
UNION ALL
SELECT 'EMPTY_SUBJECT_SCOPE','ERROR','MISSING_DATA','ASSIGNMENT_ROUND',id,NULL FROM ctx
WHERE NOT EXISTS(SELECT 1 FROM round_subject_scope sc WHERE sc.round_id=ctx.id)
UNION ALL
SELECT 'SCHOOL_CONTEXT_MISSING','ERROR','MISSING_DATA','SEMESTER',semester_id,NULL FROM ctx
WHERE NOT EXISTS(SELECT 1 FROM school_context sc WHERE sc.semester_id=ctx.semester_id
    AND sc.verification_status='VERIFIED' AND nullif(btrim(sc.evidence_ref),'') IS NOT NULL)
UNION ALL
SELECT 'NO_ACTIVE_DEMANDS','ERROR','MISSING_DATA','ASSIGNMENT_ROUND',id,NULL FROM ctx WHERE NOT EXISTS(SELECT 1 FROM demands)
UNION ALL
SELECT 'UNSUPPORTED_EFFECTIVE_INTERVALS','ERROR','UNSUPPORTED_SCOPE','ASSIGNMENT_ROUND',id,NULL FROM ctx
WHERE (SELECT count(DISTINCT (valid_from,valid_to)) FROM demands)>1
UNION ALL
SELECT 'INVALID_DEMAND_LOAD','ERROR','INVALID_DATA','TEACHING_DEMAND',id,NULL FROM demands
WHERE periods_per_week IS NULL OR periods_per_week<=0 OR periods_per_week>999.99
   OR periods_per_week<>trunc(periods_per_week,2) OR unit<>'PERIOD_PER_WEEK'
UNION ALL
SELECT 'INACTIVE_CLASS','ERROR','INVALID_DATA','CLASS',class_id,id FROM demands WHERE class_status<>'ACTIVE'
UNION ALL
SELECT 'SUBJECT_EFFECTIVITY_GAP','ERROR','INVALID_DATA','TEACHING_DEMAND',d.id,d.subject_id FROM demands d
JOIN subject s ON s.id=d.subject_id WHERE s.valid_from>d.valid_from OR (s.valid_to IS NOT NULL AND s.valid_to<d.valid_to)
UNION ALL
SELECT 'EMPLOYMENT_MISSING','ERROR','MISSING_DATA','TEACHER',t.id,NULL FROM teachers t
WHERE NOT EXISTS(SELECT 1 FROM employments e WHERE e.teacher_id=t.id)
UNION ALL
SELECT 'UNSUPPORTED_EMPLOYMENT_INTERVAL','ERROR','UNSUPPORTED_SCOPE','TEACHER_EMPLOYMENT',e.id,e.teacher_id
FROM employments e CROSS JOIN span CROSS JOIN ctx
WHERE e.valid_from>span.starts_on OR coalesce(e.valid_to,ctx.semester_end)<span.ends_on
   OR (SELECT count(*) FROM employments other WHERE other.teacher_id=e.teacher_id)>1
UNION ALL
SELECT 'CALCULATION_PERIOD_MISSING','ERROR','MISSING_DATA','ASSIGNMENT_ROUND',id,NULL FROM ctx
WHERE NOT EXISTS(SELECT 1 FROM periods)
UNION ALL
SELECT 'UNSUPPORTED_CALCULATION_PERIODS','ERROR','UNSUPPORTED_SCOPE','ASSIGNMENT_ROUND',id,NULL FROM ctx
WHERE (SELECT count(*) FROM periods)>1
UNION ALL
SELECT 'CALCULATION_PERIOD_INCOMPLETE','ERROR','MISSING_DATA','CALCULATION_PERIOD',p.id,NULL FROM periods p CROSS JOIN span
WHERE (SELECT count(*) FROM periods)=1 AND (p.starts_on>span.starts_on OR p.ends_on<span.ends_on)
UNION ALL
SELECT 'WORKLOAD_BASIS_MISSING_OR_AMBIGUOUS','ERROR','MISSING_DATA','TEACHER',a.id,NULL
FROM active a CROSS JOIN ctx CROSS JOIN span WHERE (
    SELECT count(*) FROM teacher_workload_basis b WHERE b.teacher_id=a.id AND b.semester_id=ctx.semester_id
      AND b.verification_status='VERIFIED' AND b.verified_by IS NOT NULL AND b.verified_at IS NOT NULL
      AND b.valid_from<=span.starts_on AND b.valid_to>=span.ends_on AND b.unit='PERIOD_PER_WEEK'
      AND b.base_periods_per_week>0 AND b.base_periods_per_week<=999.99 AND b.base_periods_per_week=trunc(b.base_periods_per_week,2)
      AND nullif(btrim(b.profile_ref),'') IS NOT NULL AND EXISTS(SELECT 1 FROM employments e
        WHERE e.teacher_id=a.id AND e.employment_status='TEACHING' AND e.position_code=b.position_code)
)<>1
UNION ALL
SELECT 'WEEKLY_INPUT_MISSING','ERROR','MISSING_DATA','TEACHER',a.id,p.id FROM active a CROSS JOIN periods p
WHERE NOT EXISTS(SELECT 1 FROM teacher_period_workload w WHERE w.teacher_id=a.id AND w.calculation_period_id=p.id
    AND w.record_type='OUTSIDE_SCOPE_WEEKLY' AND w.verification_status='VERIFIED' AND w.teaching_periods IS NOT NULL
    AND w.teaching_periods>=0 AND nullif(btrim(w.evidence_ref),'') IS NOT NULL AND w.source_version_id IS NULL)
UNION ALL
SELECT 'REDUCTION_INPUT_INCOMPLETE','ERROR','MISSING_DATA',entity_type,id,teacher_id FROM reductions
WHERE verification_status<>'VERIFIED' OR verified_by IS NULL OR reduction_value IS NULL OR nullif(btrim(evidence_ref),'') IS NULL
UNION ALL
SELECT 'WORKLOAD_INVENTORY_UNCONFIRMED','ERROR','MISSING_DATA','TEACHER',a.id,p.id
FROM active a CROSS JOIN periods p CROSS JOIN ctx WHERE NOT EXISTS (
 SELECT 1 FROM teacher_period_workload w WHERE w.teacher_id=a.id AND w.calculation_period_id=p.id
 AND w.input_confirmed_by IS NOT NULL AND w.input_confirmed_at IS NOT NULL
 AND w.input_confirmation_json->>'contract_version'='1'
 AND w.input_confirmation_json->>'round_id'=ctx.id::text
 AND w.input_confirmation_json->'in_scope_demand_ids' @> (SELECT coalesce(jsonb_agg(id ORDER BY id),'[]') FROM demands)
 AND jsonb_array_length(w.input_confirmation_json->'in_scope_demand_ids')=(SELECT count(*) FROM demands))
UNION ALL
SELECT 'UNSUPPORTED_REDUCTION_INTERVAL','ERROR','UNSUPPORTED_SCOPE',r.entity_type,r.id,r.teacher_id
FROM reductions r CROSS JOIN span CROSS JOIN ctx
WHERE r.valid_from>span.starts_on OR coalesce(r.valid_to,ctx.semester_end)<span.ends_on
UNION ALL
SELECT 'CONVERSION_INPUT_INCOMPLETE','ERROR','MISSING_DATA','CONVERTED_ACTIVITY',id,teacher_id FROM activities
WHERE verification_status<>'VERIFIED' OR approved_by IS NULL OR approved_factor IS NULL OR converted_periods IS NULL
   OR nullif(btrim(evidence_ref),'') IS NULL
UNION ALL
SELECT 'UNSUPPORTED_CONVERSION_UNIT','ERROR','UNSUPPORTED_SCOPE','CONVERTED_ACTIVITY',id,teacher_id FROM activities
WHERE original_unit<>'PERIOD_PER_WEEK'
UNION ALL
SELECT 'RULE_SOURCE_MISMATCH','ERROR','INVALID_DATA',r.entity_type,r.id,r.teacher_id FROM reductions r
LEFT JOIN rule_definition rd ON rd.id=r.rule_definition_id CROSS JOIN span
WHERE rd.id IS NULL OR rd.rule_set_version_id<>:rulesId OR rd.valid_from>span.starts_on OR (rd.valid_to IS NOT NULL AND rd.valid_to<span.ends_on)
UNION ALL
SELECT 'RULE_SOURCE_MISMATCH','ERROR','INVALID_DATA','CONVERTED_ACTIVITY',a.id,a.teacher_id FROM activities a
LEFT JOIN rule_definition rd ON rd.id=a.rule_definition_id CROSS JOIN span
WHERE rd.id IS NULL OR rd.rule_set_version_id<>:rulesId OR rd.valid_from>span.starts_on OR (rd.valid_to IS NOT NULL AND rd.valid_to<span.ends_on)
UNION ALL
SELECT 'NO_ELIGIBLE_TEACHER','WARNING','RESOURCE_SHORTAGE','TEACHING_DEMAND',d.id,NULL FROM demands d
WHERE NOT EXISTS(SELECT 1 FROM eligible e WHERE e.demand_id=d.id)
UNION ALL
SELECT 'LOCK_CONFLICT','ERROR','INVALID_DATA','PLAN_DEMAND',pd.id,pd.demand_id
FROM assignment_plan p JOIN plan_demand pd ON pd.plan_version_id=p.current_version_id
WHERE p.round_id=:roundId AND pd.is_locked AND (
    tass_teacher_eligible(pd.teacher_id,pd.demand_id) IS DISTINCT FROM true OR NOT EXISTS (
        SELECT 1 FROM demands d WHERE d.id=pd.demand_id AND d.periods_per_week=pd.periods_per_week_snapshot))
UNION ALL
SELECT CASE WHEN unknown_policy='PENALTY' THEN 'EXPERIENCE_UNKNOWN_PENALIZED' ELSE 'EXPERIENCE_UNKNOWN' END,
    CASE WHEN unknown_policy='PENALTY' THEN 'WARNING' ELSE 'ERROR' END,'MISSING_DATA','TEACHER_DEMAND',teacher_id,demand_id
FROM experience WHERE evidence_id IS NULL OR experience_status='UNKNOWN'
UNION ALL
SELECT 'CONFIGURATION_SELECTION_REQUIRED','ERROR','CONFIGURATION','ASSIGNMENT_ROUND',id,NULL FROM ctx
WHERE :configId::bigint IS NULL OR :rulesId::bigint IS NULL
UNION ALL
SELECT 'CONFIGURATION_NOT_CONFIRMED','ERROR','CONFIGURATION','ASSIGNMENT_ROUND',ctx.id,NULL FROM ctx
WHERE :configId::bigint IS NOT NULL AND :rulesId::bigint IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM config c CROSS JOIN rule_set_version rs CROSS JOIN span
    WHERE c.id=:configId AND c.valid AND c.confirmed_by IS NOT NULL AND c.confirmed_at IS NOT NULL
      AND rs.id=:rulesId AND rs.confirmed_by IS NOT NULL AND rs.confirmed_at IS NOT NULL
      AND rs.valid_from<=span.starts_on AND (rs.valid_to IS NULL OR rs.valid_to>=span.ends_on)
      AND EXISTS(SELECT 1 FROM rule_definition rd WHERE rd.rule_set_version_id=rs.id))
UNION ALL
SELECT 'WEEKLY_LIMIT_NOT_CONFIGURED','ERROR','CONFIGURATION','OPTIMIZATION_CONFIG',id,NULL FROM config
WHERE CASE WHEN jsonb_typeof(criteria_weights_json#>'{hard_limits,max_total_weekly}')='number'
    THEN (criteria_weights_json#>>'{hard_limits,max_total_weekly}')::numeric<0 ELSE true END
    OR nullif(btrim(criteria_weights_json#>>'{hard_limits,source}'),'') IS NULL
    OR coalesce(criteria_weights_json#>>'{hard_limits,basis}','') NOT IN ('W','T')
UNION ALL
SELECT 'DEMO_CONFIGURATION','WARNING','CONFIGURATION','OPTIMIZATION_CONFIG',id,NULL FROM config
WHERE criteria_weights_json->>'demo_only'='true'
UNION ALL
SELECT 'ANNUAL_WORKLOAD_NOT_VALIDATED','WARNING','MISSING_DATA','ASSIGNMENT_ROUND',id,NULL FROM ctx
ORDER BY code,entity_type,entity_id,related_id
