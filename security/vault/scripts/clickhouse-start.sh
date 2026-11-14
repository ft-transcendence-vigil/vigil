#!/bin/sh
set -eu
CLICKHOUSE_PASSWORD="$(cat /run/secrets/CLICKHOUSE_PASSWORD)"
: "${CLICKHOUSE_PASSWORD:?Empty ClickHouse admin password file}"
export CLICKHOUSE_PASSWORD
# Keep the official image's setup logic; this process inherits a transient password env var.
exec /entrypoint.sh "$@"
