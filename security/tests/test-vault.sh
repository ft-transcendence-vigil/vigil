#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
dc() { docker compose -f docker-compose.yml "$@"; }
for role in api postgres clickhouse collector; do
  dc exec -T "vault-agent-$role" sh -c 'test -d /run/secrets' || exit 1
done
dc exec -T vault-agent-api sh -c 'test -s /run/secrets/JWT_SECRET && test -s /run/secrets/SPRING_DATASOURCE_PASSWORD && test -s /run/secrets/CLICKHOUSE_PASSWORD && test -s /run/secrets/VIGIL_INGESTION_KEY'
dc exec -T vault-agent-postgres sh -c 'test -s /run/secrets/POSTGRES_PASSWORD'
dc exec -T vault-agent-clickhouse sh -c 'test -s /run/secrets/CLICKHOUSE_PASSWORD && test -s /run/secrets/CLICKHOUSE_API_PASSWORD && test -s /run/secrets/CLICKHOUSE_WRITER_PASSWORD'
dc exec -T vault-agent-collector sh -c 'test -s /run/secrets/collector-config.yaml && test -s /run/secrets/VIGIL_INGESTION_KEY'
dc exec -T vault-init sh -c 'VAULT_ADDR=http://vault:8200 vault status -format=json' | grep -Eq '"sealed"[[:space:]]*:[[:space:]]*false'
echo 'PASS: Vault agents rendered secret files and Vault is unsealed'
echo 'NOTE: Run application/database auth and fresh-volume tests before claiming end-to-end success.'
