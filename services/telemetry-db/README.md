# Telemetry database

## ClickHouse accounts

- `CLICKHOUSE_USER` / `CLICKHOUSE_PASSWORD`: administrative account used by ClickHouse initialization and health checks. These credentials are not passed to the API or collector.
- `vigil_api` / `CLICKHOUSE_API_PASSWORD`: API account with `SELECT` on the configured database’s `logs`, `metrics`, and `traces` tables only.
- `vigil_writer` / `CLICKHOUSE_WRITER_PASSWORD`: collector account with `INSERT` and `SELECT` on those tables.

Use different random passwords. The initialization script creates the API account, updates its password, and reapplies its table-level read grants. The API waits for initialization to complete before starting.

For an existing installation, add `CLICKHOUSE_API_PASSWORD` to your private `.env`, run `docker compose run --rm clickhouse-init`, then run `docker compose up -d --no-deps api` to recreate the API with the restricted credentials. Do not delete ClickHouse data volumes. Other Compose commands also require the new variable to be set.
