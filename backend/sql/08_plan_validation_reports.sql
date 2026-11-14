-- SOL-08: append-only reports, captured workloads and exact report/result consistency.
BEGIN;
ALTER TABLE validation_run ADD COLUMN IF NOT EXISTS validator_version TEXT;
ALTER TABLE validation_run ADD COLUMN IF NOT EXISTS workloads_json JSONB;
ALTER TABLE validation_run ADD COLUMN IF NOT EXISTS summary_json JSONB;
ALTER TABLE validation_result ADD COLUMN IF NOT EXISTS details_json JSONB;
CREATE OR REPLACE FUNCTION tass_guard_validation_report() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v plan_version%ROWTYPE; p assignment_plan%ROWTYPE; token TEXT;
BEGIN
 IF NEW.validator_version IS NULL THEN RETURN NEW; END IF;
 IF NEW.validator_version<>'tass-validation/1' OR jsonb_typeof(NEW.workloads_json) IS DISTINCT FROM 'array'
  OR jsonb_typeof(NEW.summary_json) IS DISTINCT FROM 'object'
  OR COALESCE((NEW.summary_json->>'finding_count')::integer,0)<1 THEN
  RAISE EXCEPTION 'Invalid validation report contract' USING ERRCODE='23514'; END IF;
 SELECT ap.* INTO STRICT p FROM assignment_plan ap JOIN plan_version pv ON pv.plan_id=ap.id WHERE pv.id=NEW.plan_version_id FOR UPDATE OF ap;
 SELECT * INTO STRICT v FROM plan_version WHERE id=NEW.plan_version_id FOR UPDATE;
 SELECT source_revision_token INTO STRICT token FROM assignment_round WHERE id=p.round_id FOR SHARE;
 IF p.current_version_id IS DISTINCT FROM v.id OR NEW.revision_no<>v.revision_no OR NEW.input_snapshot_id<>v.input_snapshot_id
  OR NEW.source_revision_token IS DISTINCT FROM token
  OR NOT EXISTS(SELECT 1 FROM input_snapshot WHERE id=v.input_snapshot_id AND source_revision_token=token AND content_hash=md5(payload_json::text)) THEN
  RAISE EXCEPTION 'STALE_INPUT: validation must match current version/revision/snapshot/source' USING ERRCODE='40001'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS b_validation_report_contract ON validation_run;
CREATE TRIGGER b_validation_report_contract BEFORE INSERT ON validation_run FOR EACH ROW EXECUTE FUNCTION tass_guard_validation_report();
CREATE OR REPLACE FUNCTION tass_validation_report_complete() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r validation_run%ROWTYPE; total BIGINT; expected TEXT; run_key BIGINT;
BEGIN
 IF TG_TABLE_NAME='validation_run' THEN run_key:=NEW.id; ELSE run_key:=NEW.validation_run_id; END IF;
 SELECT * INTO r FROM validation_run WHERE id=run_key;
 IF r.validator_version IS NULL THEN RETURN NULL; END IF;
 SELECT count(*),CASE WHEN bool_or(result_status='VIOLATION') THEN 'VIOLATION'
  WHEN bool_or(result_status='INSUFFICIENT_DATA') THEN 'INSUFFICIENT_DATA' ELSE 'PASS' END
 INTO total,expected FROM validation_result WHERE validation_run_id=r.id;
 IF total<>(r.summary_json->>'finding_count')::bigint OR expected<>r.overall_status THEN
  RAISE EXCEPTION 'Validation result set is incomplete or inconsistent with immutable report' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS z_validation_report_complete ON validation_run;
CREATE CONSTRAINT TRIGGER z_validation_report_complete AFTER INSERT ON validation_run DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION tass_validation_report_complete();
DROP TRIGGER IF EXISTS z_validation_results_complete ON validation_result;
CREATE CONSTRAINT TRIGGER z_validation_results_complete AFTER INSERT ON validation_result DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION tass_validation_report_complete();
COMMIT;
