#!/bin/sh
set -eu
cd /workspace
mkdir -p /reports
url="jdbc:postgresql://${PGHOST}:${PGPORT}/${PGDATABASE}"
run_maven() {
    mvn -B -ntp "$@" "-Dplan.test.url=$url" "-Dplan.test.user=$PGUSER" "-Dplan.test.password=$PGPASSWORD"
}
save_reports() {
    stage=$1
    mkdir -p "/reports/$stage"
    for module in backend algorithm/tass-cpsat; do
        for kind in surefire-reports failsafe-reports; do
            if [ -d "$module/target/$kind" ]; then
                dest=$(echo "$module" | tr / -)
                mkdir -p "/reports/$stage/$dest/$kind"
                cp -R "$module/target/$kind/." "/reports/$stage/$dest/$kind/"
            fi
        done
    done
}
trap 'save_reports failure-or-final' EXIT
run_maven -pl backend -am verify -Dplan.integration=true -Dsolver.e2e.artifact=/reports/checkpoint.json
save_reports integration
# Export after every fixture-producing suite, so source-token changes are not mistaken for restart failures.
run_maven -pl backend -am verify -Dplan.integration=true '-Dtest=SolverRunPostgresTest#newCoordinatorRecoversInterruptedRunsAndRejectsSecondOwner' -Dsurefire.failIfNoSpecifiedTests=false -Dsolver.e2e.artifact=/reports/checkpoint.json
save_reports checkpoint
run_maven -pl backend -am verify -Dtest=PlanResultRestartPostgresTest -Dsurefire.failIfNoSpecifiedTests=false -Dsolver.replay.checkpoint=/reports/checkpoint.json
save_reports restart
# Legacy PostgreSQL CRUD expects a seed-sized database; isolate it from committed solver fixtures.
crud_db="crud_verify_$(date -u +%Y%m%d%H%M%S)_$$"
psql -X -v ON_ERROR_STOP=1 -c "CREATE DATABASE $crud_db"
psql -X -v ON_ERROR_STOP=1 -d "$crud_db" -f backend/sql/01_schema.sql
psql -X -v ON_ERROR_STOP=1 -d "$crud_db" -f backend/sql/02_seed.sql
run_maven -pl backend -am verify -Dtest=PostgresCrudIntegrationTest -Dsurefire.failIfNoSpecifiedTests=false -Ddb.integration=true \
    "-Dspring.datasource.url=jdbc:postgresql://${PGHOST}:${PGPORT}/${crud_db}" \
    "-Dspring.datasource.username=$PGUSER" "-Dspring.datasource.password=$PGPASSWORD"
save_reports postgres-crud
echo 'Integration, restart reads and PostgreSQL CRUD suites passed.'
