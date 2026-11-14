#!/bin/sh
set -eu
export VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"
umask 077
fail() { echo "[vault-init] $*" >&2; exit 1; }
mkdir -p /vault/init /vault/credentials
chmod 700 /vault/init /vault/credentials
rm -f /vault/init/ready
work="$(mktemp -d)"
trap 'rm -rf "$work"; rm -f /vault/init/ready' EXIT
trap 'exit 1' HUP INT TERM
attempt=0
while :; do
  vault status -format=json >"$work/status.json" 2>/dev/null || true
  grep -Eq '"initialized"[[:space:]]*:' "$work/status.json" && break
  attempt=$((attempt + 1))
  [ "$attempt" -lt 60 ] || fail 'Vault did not become reachable after 60 attempts'
  sleep 2
done
if grep -q '"initialized"[[:space:]]*:[[:space:]]*false' "$work/status.json"; then
  [ ! -e /vault/init/bootstrap.txt ] || fail 'Vault is uninitialized but bootstrap credentials exist; restore matching vault_data, do not reset it'
  vault operator init -key-shares=1 -key-threshold=1 > /vault/init/bootstrap.txt.tmp
  mv /vault/init/bootstrap.txt.tmp /vault/init/bootstrap.txt
fi
[ -s /vault/init/bootstrap.txt ] || fail 'Missing bootstrap credentials; refusing to reset Vault'
chmod 600 /vault/init/bootstrap.txt
key="$(awk '/Unseal Key 1:/ {print $4}' /vault/init/bootstrap.txt)"
root="$(awk '/Initial Root Token:/ {print $4}' /vault/init/bootstrap.txt)"
[ -n "$key" ] && [ -n "$root" ] || fail 'Invalid bootstrap credential file'
vault operator unseal "$key" >/dev/null
export VAULT_TOKEN="$root"
vault token lookup >/dev/null 2>&1 || fail 'Bootstrap token is invalid or revoked; restore valid bootstrap credentials'

vault secrets list -format=json >"$work/mounts.json"
if ! grep -q '"secret/"' "$work/mounts.json"; then
  vault secrets enable -path=secret kv-v2 >/dev/null
fi
# A single existing API document does not prove the four-document import finished.
existing=0
present=0
for role in api postgres clickhouse collector; do
  # Soft-deleted KV v2 versions can return metadata with a successful CLI exit.
  if vault kv get -format=json "secret/ft_transcendence/$role" >"$work/$role.json" 2>/dev/null; then
    present=$((present + 1))
    if ! grep -Eq '"data"[[:space:]]*:[[:space:]]*null' "$work/$role.json"; then
      existing=$((existing + 1))
    fi
  fi
done
case "$existing:$present" in
  0:0)
    [ -r /vault/bootstrap/application.env ] || fail 'Missing bootstrap .env for first import'
    awk -v output_dir="$work" -f /vault/scripts/read-bootstrap.awk /vault/bootstrap/application.env
    # @file values keep secrets out of the Vault CLI's argument list.
    vault kv put secret/ft_transcendence/api JWT_SECRET=@"$work/JWT_SECRET" SPRING_DATASOURCE_PASSWORD=@"$work/POSTGRES_PASSWORD" CLICKHOUSE_PASSWORD=@"$work/CLICKHOUSE_API_PASSWORD" VIGIL_INGESTION_KEY=@"$work/VIGIL_INGESTION_KEY" >/dev/null
    vault kv put secret/ft_transcendence/postgres POSTGRES_PASSWORD=@"$work/POSTGRES_PASSWORD" >/dev/null
    vault kv put secret/ft_transcendence/clickhouse CLICKHOUSE_PASSWORD=@"$work/CLICKHOUSE_PASSWORD" CLICKHOUSE_API_PASSWORD=@"$work/CLICKHOUSE_API_PASSWORD" CLICKHOUSE_WRITER_PASSWORD=@"$work/CLICKHOUSE_WRITER_PASSWORD" >/dev/null
    vault kv put secret/ft_transcendence/collector CLICKHOUSE_PASSWORD=@"$work/CLICKHOUSE_WRITER_PASSWORD" VIGIL_INGESTION_KEY=@"$work/VIGIL_INGESTION_KEY" >/dev/null
    echo '[vault-init] Imported existing application secrets into Vault.'
    ;;
  4:4) ;;
  *) fail 'Incomplete Vault import: expected all four role documents. Repair missing documents from verified existing credentials; refusing to overwrite secrets from .env' ;;
esac

read_field() {
  vault kv get -field="$2" "secret/ft_transcendence/$1" >"$work/$1.$2" 2>/dev/null || fail "Missing $1/$2 in Vault"
  grep -q '[^[:space:]]' "$work/$1.$2" || fail "Empty or blank $1/$2 in Vault"
}
read_field api JWT_SECRET
read_field api SPRING_DATASOURCE_PASSWORD
read_field api CLICKHOUSE_PASSWORD
read_field postgres POSTGRES_PASSWORD
read_field clickhouse CLICKHOUSE_PASSWORD
read_field clickhouse CLICKHOUSE_API_PASSWORD
read_field clickhouse CLICKHOUSE_WRITER_PASSWORD
read_field collector CLICKHOUSE_PASSWORD
read_field collector VIGIL_INGESTION_KEY
if grep -q '[[:space:]]' "$work/collector.VIGIL_INGESTION_KEY"; then
  fail 'Collector ingestion key contains whitespace; bearer tokens must be a single token'
fi
# Upgrade old Vault state without reimporting a potentially stale .env or rotating DB credentials.
if ! vault kv get -field=VIGIL_INGESTION_KEY secret/ft_transcendence/api >"$work/api.VIGIL_INGESTION_KEY" 2>/dev/null; then
  vault kv patch secret/ft_transcendence/api VIGIL_INGESTION_KEY=@"$work/collector.VIGIL_INGESTION_KEY" >/dev/null
fi
read_field api VIGIL_INGESTION_KEY
cmp -s "$work/api.SPRING_DATASOURCE_PASSWORD" "$work/postgres.POSTGRES_PASSWORD" || fail 'API and PostgreSQL passwords differ in Vault'
cmp -s "$work/api.CLICKHOUSE_PASSWORD" "$work/clickhouse.CLICKHOUSE_API_PASSWORD" || fail 'API and ClickHouse API passwords differ in Vault'
cmp -s "$work/collector.CLICKHOUSE_PASSWORD" "$work/clickhouse.CLICKHOUSE_WRITER_PASSWORD" || fail 'Collector and ClickHouse writer passwords differ in Vault'
cmp -s "$work/api.VIGIL_INGESTION_KEY" "$work/collector.VIGIL_INGESTION_KEY" || fail 'API and collector ingestion keys differ in Vault'

vault auth list -format=json >"$work/auth.json"
grep -q '"approle/"' "$work/auth.json" || vault auth enable approle >/dev/null
for role in api postgres clickhouse collector; do
  vault policy write "${role}-read" "/vault/policies/${role}-policy.hcl" >/dev/null
  vault write "auth/approle/role/$role" token_policies="${role}-read" token_ttl=1h token_max_ttl=4h secret_id_ttl=0 secret_id_num_uses=0 >/dev/null
  credentials="/vault/credentials/$role"
  mkdir -p "$credentials"
  chmod 700 "$credentials"
  vault read -field=role_id "auth/approle/role/$role/role-id" >"$credentials/role_id.tmp"
  # Revoked IDs may yield an empty successful CLI response; require an accessor too.
  if ! cmp -s "$credentials/role_id.tmp" "$credentials/role_id" || [ ! -s "$credentials/secret_id" ] || ! vault write -field=secret_id_accessor "auth/approle/role/$role/secret-id/lookup" secret_id=@"$credentials/secret_id" >"$work/secret-id-accessor" 2>/dev/null || [ ! -s "$work/secret-id-accessor" ]; then
    vault write -field=secret_id -f "auth/approle/role/$role/secret-id" >"$credentials/secret_id.tmp"
    chmod 600 "$credentials/secret_id.tmp"
    mv "$credentials/secret_id.tmp" "$credentials/secret_id"
    echo "[vault-init] Refreshed AppRole credentials for $role"
  fi
  chmod 600 "$credentials/role_id.tmp"
  mv "$credentials/role_id.tmp" "$credentials/role_id"
done
unset VAULT_TOKEN root
rm -rf "$work"
touch /vault/init/ready
echo '[vault-init] Bootstrap complete; watching for Vault reseals.'
while :; do
  status="$(vault status -format=json 2>/dev/null || true)"
  if printf '%s' "$status" | grep -q '"sealed"[[:space:]]*:[[:space:]]*true'; then
    vault operator unseal "$key" >/dev/null 2>&1 || echo '[vault-init] Automatic unseal failed; check matching Vault data and bootstrap credentials' >&2
  fi
  sleep 5
done
