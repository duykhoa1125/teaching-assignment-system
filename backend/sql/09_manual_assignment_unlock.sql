-- Manual assignment API: allow only pure unlock on stale source; decisions stay unchanged.
BEGIN;
CREATE OR REPLACE FUNCTION tass_guard_assignment() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE vid BIGINT; p assignment_plan%ROWTYPE; v plan_version%ROWTYPE; sn input_snapshot%ROWTYPE;
        rr assignment_round%ROWTYPE; src JSONB;
BEGIN
 vid:=CASE WHEN TG_OP='DELETE' THEN OLD.plan_version_id ELSE NEW.plan_version_id END;
 SELECT ap.* INTO p FROM assignment_plan ap JOIN plan_version pv ON pv.plan_id=ap.id WHERE pv.id=vid FOR UPDATE OF ap;
 SELECT * INTO v FROM plan_version WHERE id=vid FOR UPDATE;
 SELECT * INTO sn FROM input_snapshot WHERE id=v.input_snapshot_id;
 SELECT * INTO rr FROM assignment_round WHERE id=p.round_id FOR SHARE;
 IF p.current_version_id IS DISTINCT FROM vid OR v.status<>'DRAFT' THEN
  RAISE EXCEPTION 'Assignments can change only in current DRAFT' USING ERRCODE='23514'; END IF;
 -- Pure unlock may resolve stale/ineligible source without modifying the saved decision.
 IF TG_OP='UPDATE' AND OLD.is_locked AND NOT NEW.is_locked
  AND (to_jsonb(NEW)-ARRAY['is_locked','locked_by','locked_at','lock_reason'])
   IS NOT DISTINCT FROM (to_jsonb(OLD)-ARRAY['is_locked','locked_by','locked_at','lock_reason']) THEN
  RETURN NEW;
 END IF;
 IF sn.source_revision_token IS DISTINCT FROM rr.source_revision_token THEN
  RAISE EXCEPTION 'STALE_INPUT: refresh snapshot before editing' USING ERRCODE='40001'; END IF;
 IF TG_OP='DELETE' THEN
  IF OLD.is_locked THEN RAISE EXCEPTION 'LOCK_CONFLICT: unlock before deletion' USING ERRCODE='23514'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.plan_version_id<>OLD.plan_version_id OR NEW.demand_id<>OLD.demand_id THEN
   RAISE EXCEPTION 'Assignment identity cannot move' USING ERRCODE='23514'; END IF;
  IF OLD.is_locked AND ROW(NEW.teacher_id,NEW.periods_per_week_snapshot)
     IS DISTINCT FROM ROW(OLD.teacher_id,OLD.periods_per_week_snapshot) THEN
   RAISE EXCEPTION 'LOCK_CONFLICT: unlock in a separate operation before changing assignment' USING ERRCODE='23514'; END IF;
 END IF;
 SELECT z INTO src FROM jsonb_array_elements(sn.payload_json->'demands') z WHERE (z->>'id')::BIGINT=NEW.demand_id;
 IF src IS NULL OR (src->>'periods_per_week')::NUMERIC<>NEW.periods_per_week_snapshot THEN
  RAISE EXCEPTION 'Assignment periods/demand must match captured snapshot' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM teaching_demand td JOIN round_subject_scope sc ON sc.subject_id=td.subject_id
   JOIN class_subject_applicability a ON a.scope_id=sc.id AND a.class_id=td.class_id
   WHERE td.id=NEW.demand_id AND td.semester_id=rr.semester_id AND sc.round_id=rr.id
    AND a.status='APPLICABLE' AND td.status='ACTIVE') THEN
  RAISE EXCEPTION 'Demand is outside applicable active scope' USING ERRCODE='23514'; END IF;
 IF NEW.teacher_id IS NOT NULL AND tass_teacher_eligible(NEW.teacher_id,NEW.demand_id) IS DISTINCT FROM TRUE THEN
  RAISE EXCEPTION 'Teacher is ineligible for this school/subject/level/effective interval' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END;
$$;
COMMIT;
