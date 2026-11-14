-- SOL-07: unchanged assignments legitimately retain the base revision.
BEGIN;
ALTER TABLE solver_run ADD COLUMN IF NOT EXISTS apply_ms BIGINT;
DO $$ DECLARE c RECORD; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='solver_run'::regclass
  AND contype='c' AND pg_get_constraintdef(oid) LIKE '%applied_revision_no > base_revision_no%' LOOP
  EXECUTE format('ALTER TABLE solver_run DROP CONSTRAINT %I',c.conname);
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='solver_run'::regclass AND conname='ck_solver_applied_revision') THEN
  ALTER TABLE solver_run ADD CONSTRAINT ck_solver_applied_revision
   CHECK (applied_revision_no IS NULL OR applied_revision_no>=base_revision_no);
 END IF;
END $$;
COMMIT;
