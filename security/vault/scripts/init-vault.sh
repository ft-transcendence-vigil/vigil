#!/bin/sh
set -eu
export VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"
mkdir -p /vault/init /vault/credentials
chmod 700 /vault/init /vault/credentials
# Vault status exits nonzero when uninitialized/sealed; capture JSON regardless.
while :; do
  vault status -format=json >/tmp/vault-status.json 2>/dev/null || true
  if grep -Eq '"initialized"[[:space:]]*:' /tmp/vault-status.json; then break; fi
  sleep 2
done
if grep -q '"initialized"[[:space:]]*:[[:space:]]*false' /tmp/vault-status.json; then
  echo '[vault-init] Initializing single-node demo Vault'
  umask 077
  vault operator init -key-shares=1 -key-threshold=1 > /vault/init/bootstrap.txt
  UNSEAL_KEY="$(awk '/Unseal Key 1:/ {print $4}' /vault/init/bootstrap.txt)"
  ROOT_TOKEN="$(awk '/Initial Root Token:/ {print $4}' /vault/init/bootstrap.txt)"
  vault operator unseal "$UNSEAL_KEY" >/dev/null
  export VAULT_TOKEN="$ROOT_TOKEN"
  vault secrets enable -path=secret kv-v2
  vault auth enable approle
  vault policy write backend-read /vault/policies/backend-policy.hcl
  vault write auth/approle/role/backend token_policies=backend-read token_ttl=1h token_max_ttl=4h secret_id_ttl=0 secret_id_num_uses=0
  JWT_SECRET="$(head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  vault kv put secret/ft_transcendence/backend JWT_SECRET="$JWT_SECRET" >/dev/null
  vault read -field=role_id auth/approle/role/backend/role-id > /vault/credentials/role_id
  vault write -field=secret_id -f auth/approle/role/backend/secret-id > /vault/credentials/secret_id
  chmod 600 /vault/credentials/*
  echo '[vault-init] Ready; bootstrap credentials are in vault_init volume. Back them up securely.'
fi
if [ ! -s /vault/init/bootstrap.txt ]; then
  echo '[vault-init] ERROR: bootstrap.txt missing for initialized Vault; restore securely' >&2
  exit 1
fi
UNSEAL_KEY="$(awk '/Unseal Key 1:/ {print $4}' /vault/init/bootstrap.txt)"
while :; do
  status="$(vault status -format=json 2>/dev/null || true)"
  if printf '%s' "$status" | grep -q '"sealed"[[:space:]]*:[[:space:]]*true'; then
    vault operator unseal "$UNSEAL_KEY" >/dev/null || true
  fi
  sleep 5
done
