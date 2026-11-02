#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
[ -f security/waf/Dockerfile ]
[ -f security/vault/config/vault.hcl ]
grep -q 'reverse_proxy waf:8080' services/reverse-proxy/Caddyfile
! grep -q 'JWT_SECRET:.*Set JWT_SECRET' docker-compose.yml
grep -q 'SPRING_CONFIG_IMPORT' security/docker-compose.security.yml
sh -n security/vault/scripts/init-vault.sh
sh -n security/vault/scripts/start-agent.sh
sh -n security/tests/test-waf.sh
sh -n security/tests/test-vault.sh
echo 'PASS: static security integration checks'
