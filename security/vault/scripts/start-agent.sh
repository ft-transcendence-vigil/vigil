#!/bin/sh
set -eu
role="${VAULT_ROLE:?Set VAULT_ROLE}"
# The nonroot collector must be able to traverse its own secret volume.
mkdir -p /run/secrets
chmod 755 /run/secrets
while [ ! -s /vault/credentials/role_id ] || [ ! -s /vault/credentials/secret_id ]; do sleep 2; done
exec vault agent -config="/vault/agent/${role}.hcl"
