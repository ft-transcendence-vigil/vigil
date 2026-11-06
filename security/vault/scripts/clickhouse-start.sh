#!/bin/sh
set -eu
export CLICKHOUSE_PASSWORD="$(cat /run/secrets/CLICKHOUSE_PASSWORD)"
# Keep the official image's setup logic; this process inherits a transient password env var.
exec /entrypoint.sh "$@"
