-- SOL-06: durable async execution in a single coordinator per database.
BEGIN;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS execution_started_at TIMESTAMPTZ;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS preparation_ms BIGINT;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS solve_ms BIGINT;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS archive_write_ms BIGINT;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS failure_code TEXT;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS solver_result_json JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS uq_solver_run_active_version ON solver_run(plan_version_id)
 WHERE queued_at IS NOT NULL AND status IN ('QUEUED','RUNNING','CANCEL_REQUESTED');
-- Legacy/PREPARED archives are left untouched. Back up and resolve any pre-existing
-- conflicting active execution rows before installing this migration.
COMMIT;
