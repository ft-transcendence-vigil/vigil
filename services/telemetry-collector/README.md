# Telemetry Collector

Vigil builds a custom OpenTelemetry Collector called `vigcol`. It receives OTLP logs, metrics, and traces over HTTP, stores them in ClickHouse, and notifies the Vigil API when the rows are queryable.

The collector guide explains [concurrency and delivery ownership](COLLECTOR.md#how-the-collector-runs-concurrently) and [the Go syntax used in the exporter](COLLECTOR.md#go-syntax-used-in-the-exporter). It also covers the build, configuration, signal conversions, delivery, and tests.

## Ingestion-key configuration

The main Compose stack uses a Vault-rendered Collector configuration and reads the ingestion key from `/run/secrets/VIGIL_INGESTION_KEY`. The image's bundled configuration and the integration stack read `VIGIL_INGESTION_KEY` from the environment.

## ClickHouse credentials

The collector connects as `vigil_writer`, using `CLICKHOUSE_WRITER_PASSWORD`. This account has `INSERT` and `SELECT` permissions on the configured database’s `logs`, `metrics`, and `traces` tables. Do not give the collector ClickHouse administrative credentials.

See [telemetry database administration](../telemetry-db/README.md) for the full account model and migration instructions.
