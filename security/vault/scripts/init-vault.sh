#!/bin/sh
set -eu
export VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"
umask 077
mkdir -p /vault/init /vault/credentials
chmod 700 /vault/init /vault/credentials
while :; do
  vault status -format=json >/tmp/vault-status.json 2>/dev/null || true
  grep -Eq '"initialized"[[:space:]]*:' /tmp/vault-status.json && break
  sleep 2
done
if grep -q '"initialized"[[:space:]]*:[[:space:]]*false' /tmp/vault-status.json; then
  vault operator init -key-shares=1 -key-threshold=1 > /vault/init/bootstrap.txt
fi
[ -s /vault/init/bootstrap.txt ] || { echo '[vault-init] Missing bootstrap credentials; refusing to reset Vault' >&2; exit 1; }
key="$(awk '/Unseal Key 1:/ {print $4}' /vault/init/bootstrap.txt)"
root="$(awk '/Initial Root Token:/ {print $4}' /vault/init/bootstrap.txt)"
vault operator unseal "$key" >/dev/null 2>&1 || true
export VAULT_TOKEN="$root"
while ! vault token lookup >/dev/null 2>&1; do sleep 2; done

# One-time migration from existing .env. Never source/evaluate the file.
# Refuse to generate replacements: DB users must retain their original passwords.
if ! vault kv get secret/ft_transcendence/api >/dev/null 2>&1; then
  [ -r /vault/bootstrap/application.env ] || { echo '[vault-init] Missing bootstrap .env for first import' >&2; exit 1; }
  JWT_SECRET= POSTGRES_PASSWORD= CLICKHOUSE_PASSWORD= CLICKHOUSE_API_PASSWORD= CLICKHOUSE_WRITER_PASSWORD= VIGIL_INGESTION_KEY=
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    case "$line" in *=*) name=${line%%=*}; value=${line#*=} ;; *) continue ;; esac
    # Support simple unquoted .env values, matching the project's current file.
    case "$name" in
      JWT_SECRET) JWT_SECRET=$value ;;
      POSTGRES_PASSWORD) POSTGRES_PASSWORD=$value ;;
      CLICKHOUSE_PASSWORD) CLICKHOUSE_PASSWORD=$value ;;
      CLICKHOUSE_API_PASSWORD) CLICKHOUSE_API_PASSWORD=$value ;;
      CLICKHOUSE_WRITER_PASSWORD) CLICKHOUSE_WRITER_PASSWORD=$value ;;
      VIGIL_INGESTION_KEY) VIGIL_INGESTION_KEY=$value ;;
    esac
  done < /vault/bootstrap/application.env
  for name in JWT_SECRET POSTGRES_PASSWORD CLICKHOUSE_PASSWORD CLICKHOUSE_API_PASSWORD CLICKHOUSE_WRITER_PASSWORD VIGIL_INGESTION_KEY; do
    eval 'test -n "${'"$name"'}"' || { echo "[vault-init] Missing $name in bootstrap .env" >&2; exit 1; }
  done
  vault secrets list -format=json | grep -q '"secret/"' || vault secrets enable -path=secret kv-v2
  vault kv put secret/ft_transcendence/api JWT_SECRET="$JWT_SECRET" SPRING_DATASOURCE_PASSWORD="$POSTGRES_PASSWORD" CLICKHOUSE_PASSWORD="$CLICKHOUSE_API_PASSWORD" >/dev/null
  vault kv put secret/ft_transcendence/postgres POSTGRES_PASSWORD="$POSTGRES_PASSWORD" >/dev/null
  vault kv put secret/ft_transcendence/clickhouse CLICKHOUSE_PASSWORD="$CLICKHOUSE_PASSWORD" CLICKHOUSE_API_PASSWORD="$CLICKHOUSE_API_PASSWORD" CLICKHOUSE_WRITER_PASSWORD="$CLICKHOUSE_WRITER_PASSWORD" >/dev/null
  vault kv put secret/ft_transcendence/collector CLICKHOUSE_PASSWORD="$CLICKHOUSE_WRITER_PASSWORD" VIGIL_INGESTION_KEY="$VIGIL_INGESTION_KEY" >/dev/null
  unset JWT_SECRET POSTGRES_PASSWORD CLICKHOUSE_PASSWORD CLICKHOUSE_API_PASSWORD CLICKHOUSE_WRITER_PASSWORD VIGIL_INGESTION_KEY
  echo '[vault-init] Imported existing application secrets into Vault.'
fi
vault auth list -format=json | grep -q '"approle/"' || vault auth enable approle
for role in api postgres clickhouse collector; do
  vault policy write "${role}-read" "/vault/policies/${role}-policy.hcl" >/dev/null
  vault write "auth/approle/role/$role" token_policies="${role}-read" token_ttl=1h token_max_ttl=4h secret_id_ttl=0 secret_id_num_uses=0 >/dev/null
  mkdir -p "/vault/credentials/$role"
  if [ ! -s "/vault/credentials/$role/role_id" ] || [ ! -s "/vault/credentials/$role/secret_id" ]; then
    vault read -field=role_id "auth/approle/role/$role/role-id" > "/vault/credentials/$role/role_id"
    vault write -field=secret_id -f "auth/approle/role/$role/secret-id" > "/vault/credentials/$role/secret_id"
  fi
  chmod 600 "/vault/credentials/$role/"*
done
unset VAULT_TOKEN root
while :; do
  status="$(vault status -format=json 2>/dev/null || true)"
  if printf '%s' "$status" | grep -q '"sealed"[[:space:]]*:[[:space:]]*true'; then
    vault operator unseal "$key" >/dev/null 2>&1 || true
  fi
  sleep 5
done
