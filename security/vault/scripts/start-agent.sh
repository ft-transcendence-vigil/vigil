#!/bin/sh
set -eu
while [ ! -s /vault/credentials/role_id ] || [ ! -s /vault/credentials/secret_id ]; do sleep 2; done
exec vault agent -config=/vault/agent/agent.hcl
