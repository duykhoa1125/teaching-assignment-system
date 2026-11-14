#!/bin/sh
set -eu
export PGPASSWORD="$POSTGRES_PASSWORD"
# TCP ensures initialization (which uses a temporary Unix-socket server) has finished.
# Authentication and required schema columns are checked, not only whether a socket accepts connections.
ready=$(psql -X -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -Atc "
SELECT to_regclass('public.assignment_plan') IS NOT NULL
 AND to_regclass('public.solver_run') IS NOT NULL
 AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='teacher_period_workload' AND column_name='input_confirmation_json')
 AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='solver_run' AND column_name='solver_input_canonical')
 AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='solver_run' AND column_name='queued_at')
 AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='solver_run' AND column_name='apply_ms')
 AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='validation_run' AND column_name='summary_json');")
[ "$ready" = t ]
