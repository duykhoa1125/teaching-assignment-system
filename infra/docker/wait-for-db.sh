#!/bin/sh
set -eu
export PGCONNECT_TIMEOUT=3
attempt=0
until psql -X -v ON_ERROR_STOP=1 -Atc 'SELECT 1' >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then echo 'Cannot authenticate to database; inspect credentials and existing volume.' >&2; exit 1; fi
    sleep 1
done
