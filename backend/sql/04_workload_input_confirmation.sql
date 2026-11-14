-- SOL-04: explicit source inventory. Run after the status-contract migration.
-- Existing workload rows remain unconfirmed; do not backfill zero/PASS evidence.
BEGIN;
ALTER TABLE teacher_period_workload ADD COLUMN IF NOT EXISTS input_confirmation_json JSONB;
ALTER TABLE teacher_period_workload ADD COLUMN IF NOT EXISTS input_confirmed_by BIGINT REFERENCES user_account(id);
ALTER TABLE teacher_period_workload ADD COLUMN IF NOT EXISTS input_confirmed_at TIMESTAMPTZ;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='teacher_period_workload'::regclass AND conname='ck_workload_input_confirmation') THEN
  ALTER TABLE teacher_period_workload ADD CONSTRAINT ck_workload_input_confirmation CHECK (
   (input_confirmation_json IS NULL AND input_confirmed_by IS NULL AND input_confirmed_at IS NULL) OR
   (input_confirmation_json IS NOT NULL AND input_confirmed_by IS NOT NULL AND input_confirmed_at IS NOT NULL
    AND jsonb_typeof(input_confirmation_json) IS NOT DISTINCT FROM 'object'
    AND input_confirmation_json->>'contract_version' IS NOT DISTINCT FROM '1'
    AND jsonb_typeof(input_confirmation_json->'round_id') IS NOT DISTINCT FROM 'number'
    AND jsonb_typeof(input_confirmation_json->'in_scope_demand_ids') IS NOT DISTINCT FROM 'array'
    AND jsonb_typeof(input_confirmation_json->'outside_demand_ids') IS NOT DISTINCT FROM 'array'
    AND jsonb_typeof(input_confirmation_json->'reduction_items') IS NOT DISTINCT FROM 'array'
    AND jsonb_typeof(input_confirmation_json->'conversion_items') IS NOT DISTINCT FROM 'array'
    AND nullif(btrim(input_confirmation_json->>'evidence_ref'),'') IS NOT NULL));
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS ix_workload_input_confirmed_by ON teacher_period_workload(input_confirmed_by);
-- The team chose T for this illustrative config. Other configurations are not changed.
UPDATE optimization_config SET criteria_weights_json=jsonb_set(criteria_weights_json,'{hard_limits,basis}','"T"')
WHERE config_code='DEMO_FIVE_STAGE' AND version_no=1 AND criteria_weights_json->>'demo_only'='true'
 AND criteria_weights_json#>>'{hard_limits,source}'='demo:illustrative-cap'
 AND criteria_weights_json#>>'{hard_limits,basis}' IS NULL;
UPDATE optimization_config SET criteria_weights_json=jsonb_set(criteria_weights_json,'{workload_policy}',
 '{"eligible_position_codes":["TEACHER"],"rule_evaluator":"ILLUSTRATIVE_MVP_V1"}')
WHERE config_code='DEMO_FIVE_STAGE' AND version_no=1 AND criteria_weights_json->>'demo_only'='true'
 AND criteria_weights_json#>>'{hard_limits,source}'='demo:illustrative-cap'
 AND criteria_weights_json->'workload_policy' IS NULL;
COMMIT;
