#!/bin/sh
set -eu
pw="$(cat /run/secrets/CLICKHOUSE_PASSWORD)"
: "${pw:?Empty ClickHouse admin password file}"
clickhouse-client --host localhost --user "${CLICKHOUSE_USER:-vigil}" --password "$pw" --database "${CLICKHOUSE_DB:-default}" --query 'SELECT 1' >/dev/null
