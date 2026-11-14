#!/bin/sh
set -eu
CLICKHOUSE_ADMIN_PASSWORD="$(cat /run/secrets/CLICKHOUSE_PASSWORD)"
CLICKHOUSE_API_PASSWORD="$(cat /run/secrets/CLICKHOUSE_API_PASSWORD)"
CLICKHOUSE_WRITER_PASSWORD="$(cat /run/secrets/CLICKHOUSE_WRITER_PASSWORD)"
: "${CLICKHOUSE_ADMIN_PASSWORD:?Empty ClickHouse admin password file}"
: "${CLICKHOUSE_API_PASSWORD:?Empty ClickHouse API password file}"
: "${CLICKHOUSE_WRITER_PASSWORD:?Empty ClickHouse writer password file}"
export CLICKHOUSE_ADMIN_PASSWORD CLICKHOUSE_API_PASSWORD CLICKHOUSE_WRITER_PASSWORD
exec /bin/sh /clickhouse-init.sh
