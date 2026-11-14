#!/bin/sh
set -eu
sh /opt/tass/wait-for-db.sh
echo 'Applying reviewed migrations 03-09. Each file has its own transaction; existing data is not reseeded.'
for file in 03_status_contract_migration.sql 04_workload_input_confirmation.sql 05_solver_input_archive.sql 06_solver_run_execution.sql 07_solver_result_apply.sql 08_plan_validation_reports.sql 09_manual_assignment_unlock.sql; do
    echo "Migration: $file"
    psql -X -v ON_ERROR_STOP=1 -f "/migrations/$file"
done
