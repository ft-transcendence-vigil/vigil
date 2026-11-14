#!/bin/sh
set -eu
role="${VAULT_ROLE:?Set VAULT_ROLE}"
case "$role" in
  api|postgres|clickhouse|collector) ;;
  *) echo '[vault-agent] Unsupported VAULT_ROLE' >&2; exit 1 ;;
esac
umask 077
# Consumers include the distroless collector's nonroot UID. Each role has its own volume.
mkdir -p /run/secrets
chmod 755 /run/secrets
while [ ! -s /vault/credentials/role_id ] || [ ! -s /vault/credentials/secret_id ]; do sleep 2; done
exec vault agent -config="/vault/agent/${role}.hcl"
