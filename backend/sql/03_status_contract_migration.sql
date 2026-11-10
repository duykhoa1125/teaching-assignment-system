-- Apply once to an existing 48-table PostgreSQL database after inspecting legacy status values.
-- Fresh databases already receive the checks from 01_schema.sql and ON_LEAVE from 02_seed.sql.
BEGIN;

-- The previous demo fixture used this one leave-specific value.
UPDATE teacher_employment
SET employment_status = 'ON_LEAVE'
WHERE employment_status = 'MATERNITY_LEAVE';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conrelid = 'teaching_demand'::regclass AND conname = 'ck_tass_demand_status') THEN
    ALTER TABLE teaching_demand ADD CONSTRAINT ck_tass_demand_status
      CHECK (status IN ('ACTIVE','INACTIVE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conrelid = 'teacher_employment'::regclass AND conname = 'ck_tass_employment_status') THEN
    ALTER TABLE teacher_employment ADD CONSTRAINT ck_tass_employment_status
      CHECK (employment_status IN ('TEACHING','ON_LEAVE','INACTIVE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conrelid = 'teaching_qualification'::regclass AND conname = 'ck_tass_qualification_status') THEN
    ALTER TABLE teaching_qualification ADD CONSTRAINT ck_tass_qualification_status
      CHECK (verification_status IN ('PENDING','VERIFIED','INACTIVE'));
  END IF;
END;
$$;

COMMIT;
