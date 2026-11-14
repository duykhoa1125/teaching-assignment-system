-- SOL-05: archive the exact normalized input on solver_run; keep the original DB snapshot immutable.
-- Legacy/demo runs keep these fields NULL. No artifacts or proof are backfilled.
BEGIN;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS solver_input_schema_version TEXT;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS solver_input_json JSONB;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS solver_input_canonical TEXT;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS solver_input_hash VARCHAR(64);

DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='solver_run'::regclass AND conname='ck_solver_input_archive') THEN
  ALTER TABLE solver_run ADD CONSTRAINT ck_solver_input_archive CHECK (
   (solver_input_schema_version IS NULL AND solver_input_json IS NULL AND solver_input_canonical IS NULL AND solver_input_hash IS NULL)
   OR (solver_input_schema_version IS NOT NULL AND solver_input_schema_version='tass-solver/2'
    AND solver_input_json IS NOT NULL AND jsonb_typeof(solver_input_json)='object'
    AND solver_input_canonical IS NOT NULL AND solver_input_hash IS NOT NULL
    AND solver_input_hash ~ '^[0-9a-f]{64}$'
    AND solver_input_json=solver_input_canonical::jsonb
    AND solver_input_hash=encode(sha256(convert_to(solver_input_canonical,'UTF8')),'hex')));
 END IF;
END $$;

CREATE OR REPLACE FUNCTION tass_guard_solver_input() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p assignment_plan%ROWTYPE; v plan_version%ROWTYPE; sn input_snapshot%ROWTYPE;
        rr assignment_round%ROWTYPE; pid BIGINT; school_key BIGINT; j JSONB;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.solver_input_canonical IS NOT NULL THEN RAISE EXCEPTION 'Archived solver input cannot be deleted' USING ERRCODE='23514'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.solver_input_schema_version,NEW.solver_input_json,NEW.solver_input_canonical,NEW.solver_input_hash)
    IS DISTINCT FROM ROW(OLD.solver_input_schema_version,OLD.solver_input_json,OLD.solver_input_canonical,OLD.solver_input_hash)
   OR (OLD.solver_input_canonical IS NOT NULL AND
    ROW(NEW.plan_version_id,NEW.input_snapshot_id,NEW.base_revision_no,NEW.source_revision_token,NEW.requested_by)
    IS DISTINCT FROM ROW(OLD.plan_version_id,OLD.input_snapshot_id,OLD.base_revision_no,OLD.source_revision_token,OLD.requested_by)) THEN
    RAISE EXCEPTION 'Normalized solver input/identity is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.solver_input_canonical IS NULL THEN RETURN NEW; END IF;
 SELECT plan_id INTO pid FROM plan_version WHERE id=NEW.plan_version_id;
 SELECT * INTO p FROM assignment_plan WHERE id=pid FOR UPDATE;
 SELECT * INTO v FROM plan_version WHERE id=NEW.plan_version_id FOR UPDATE;
 SELECT * INTO rr FROM assignment_round WHERE id=p.round_id FOR SHARE;
 SELECT * INTO sn FROM input_snapshot WHERE id=NEW.input_snapshot_id;
 SELECT y.school_id INTO school_key FROM semester se JOIN academic_year y ON y.id=se.academic_year_id WHERE se.id=rr.semester_id;
 IF p.current_version_id IS DISTINCT FROM v.id OR v.status IS DISTINCT FROM 'DRAFT'
  OR v.revision_no IS DISTINCT FROM NEW.base_revision_no OR v.input_snapshot_id IS DISTINCT FROM sn.id
  OR sn.round_id IS DISTINCT FROM rr.id OR sn.source_revision_token IS DISTINCT FROM rr.source_revision_token
  OR NEW.source_revision_token IS DISTINCT FROM sn.source_revision_token
  OR sn.content_hash IS DISTINCT FROM md5(sn.payload_json::text) THEN
  RAISE EXCEPTION 'STALE_INPUT: normalized input must match current DRAFT, revision and live source' USING ERRCODE='40001';
 END IF;
 j:=NEW.solver_input_json;
 IF j->>'schemaVersion' IS DISTINCT FROM 'tass-solver/2'
  OR j#>>'{identity,schoolId}' IS DISTINCT FROM school_key::text
  OR j#>>'{identity,semesterId}' IS DISTINCT FROM rr.semester_id::text
  OR j#>>'{identity,roundId}' IS DISTINCT FROM rr.id::text
  OR j#>>'{identity,planId}' IS DISTINCT FROM p.id::text
  OR j#>>'{identity,versionId}' IS DISTINCT FROM v.id::text
  OR j#>>'{identity,baseRevision}' IS DISTINCT FROM NEW.base_revision_no::text
  OR j#>>'{identity,snapshotId}' IS DISTINCT FROM sn.id::text
  OR j#>>'{identity,sourceRevisionToken}' IS DISTINCT FROM NEW.source_revision_token
  OR j#>>'{identity,ruleSetVersion}' IS DISTINCT FROM format('%s:%s',sn.rule_set_version_id,sn.payload_json#>>'{rule_set,version_no}')
  OR j#>>'{identity,optimizationConfigVersion}' IS DISTINCT FROM format('%s:%s',sn.optimization_config_id,sn.payload_json#>>'{optimization_config,version_no}') THEN
  RAISE EXCEPTION 'Normalized solver identity does not match its DB source/run' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS b_solver_input_contract ON solver_run;
CREATE TRIGGER b_solver_input_contract BEFORE INSERT OR UPDATE OR DELETE ON solver_run FOR EACH ROW EXECUTE FUNCTION tass_guard_solver_input();
DROP TRIGGER IF EXISTS b_solver_run_no_truncate ON solver_run;
CREATE TRIGGER b_solver_run_no_truncate BEFORE TRUNCATE ON solver_run FOR EACH STATEMENT EXECUTE FUNCTION tass_append_only();
COMMENT ON COLUMN solver_run.solver_input_canonical IS 'Exact UTF-8 canonical JSON from solver Json.MAPPER; immutable; SHA-256 is checked independently of jsonb text formatting.';
COMMIT;
