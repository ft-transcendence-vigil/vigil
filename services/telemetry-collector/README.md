# Telemetry Collector

## Temporary ingestion-key configuration

The Collector currently reads `VIGIL_INGESTION_KEY` directly from its environment. This is temporary while waiting for the backend implementation that generates the ingestion key and writes it to a file shared with the Collector. Once that backend work is available, replace the environment-backed bearer token with the shared-file configuration.

## ClickHouse credentials

The collector connects as `vigil_writer`, using `CLICKHOUSE_WRITER_PASSWORD`. This account has `INSERT` and `SELECT` permissions on the configured database’s `logs`, `metrics`, and `traces` tables. Do not give the collector ClickHouse administrative credentials.

See [telemetry database administration](../telemetry-db/README.md) for the full account model and migration instructions.
