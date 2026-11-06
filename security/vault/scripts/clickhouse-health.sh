#!/bin/sh
set -eu
pw="$(cat /run/secrets/CLICKHOUSE_PASSWORD)"
clickhouse-client --host localhost --user "${CLICKHOUSE_USER:-vigil}" --password "$pw" --database "${CLICKHOUSE_DB:-default}" --query 'SELECT 1' >/dev/null
