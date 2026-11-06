#!/bin/sh
set -eu
export CLICKHOUSE_ADMIN_PASSWORD="$(cat /run/secrets/CLICKHOUSE_PASSWORD)"
export CLICKHOUSE_API_PASSWORD="$(cat /run/secrets/CLICKHOUSE_API_PASSWORD)"
export CLICKHOUSE_WRITER_PASSWORD="$(cat /run/secrets/CLICKHOUSE_WRITER_PASSWORD)"
exec /bin/sh /clickhouse-init.sh
