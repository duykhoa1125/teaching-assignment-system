#!/bin/sh
set -eu
sh /opt/tass/wait-for-db.sh
mkdir -p /backups
file="/backups/tass-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
pg_dump --format=custom --file="$file"
echo "Backup saved: $file"
