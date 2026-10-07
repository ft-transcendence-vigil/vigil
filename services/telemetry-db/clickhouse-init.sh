#!/bin/sh
set -eu

test -n "${CLICKHOUSE_WRITER_PASSWORD}"

case "${CLICKHOUSE_DB}" in
  *[!A-Za-z0-9_]*) echo "CLICKHOUSE_DB contains unsupported characters" >&2; exit 1 ;;
esac

clickhouse-client \
  --host clickhouse \
  --user "${CLICKHOUSE_ADMIN_USER}" \
  --password "${CLICKHOUSE_ADMIN_PASSWORD}" \
  --database "${CLICKHOUSE_DB}" \
  --param_writer_password "${CLICKHOUSE_WRITER_PASSWORD}" \
  --multiquery \
  --query "
CREATE TABLE IF NOT EXISTS logs (
  service String,
  timestamp DateTime64(3, 'UTC'),
  severity String,
  message String,
  attributes Map(String, String)
) ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (service, timestamp)
TTL timestamp + INTERVAL 30 DAY DELETE;

CREATE TABLE IF NOT EXISTS metrics (
  service String,
  timestamp DateTime64(3, 'UTC'),
  name String,
  value Nullable(Float64),
  metric_type LowCardinality(String),
  unit String,
  aggregation_temporality LowCardinality(String),
  is_monotonic Nullable(Bool),
  start_timestamp Nullable(DateTime64(3, 'UTC')),
  series_id String,
  histogram_sum Nullable(Float64),
  histogram_count Nullable(UInt64),
  attributes Map(String, String)
) ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (service, name, timestamp)
TTL timestamp + INTERVAL 30 DAY DELETE;

CREATE TABLE IF NOT EXISTS traces (
  trace_id String,
  span_id String,
  parent_span_id Nullable(String),
  name String,
  service String,
  timestamp DateTime64(3, 'UTC'),
  duration_ms UInt32,
  status String,
  attributes Map(String, String)
) ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (service, timestamp, trace_id, span_id)
TTL timestamp + INTERVAL 30 DAY DELETE;

CREATE USER IF NOT EXISTS vigil_writer IDENTIFIED WITH plaintext_password BY {writer_password:String};
ALTER USER vigil_writer IDENTIFIED WITH plaintext_password BY {writer_password:String};
GRANT INSERT, SELECT ON ${CLICKHOUSE_DB}.logs TO vigil_writer;
GRANT INSERT, SELECT ON ${CLICKHOUSE_DB}.metrics TO vigil_writer;
GRANT INSERT, SELECT ON ${CLICKHOUSE_DB}.traces TO vigil_writer;
"
