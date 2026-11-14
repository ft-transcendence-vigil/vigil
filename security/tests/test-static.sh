#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
if grep -Eq '^(<<<<<<<|=======|>>>>>>>)' docker-compose.yml; then
  echo 'FAIL: docker-compose.yml still has unresolved merge conflicts'
  exit 1
fi
[ -f security/waf/Dockerfile ]
[ -f security/vault/config/vault.hcl ]
grep -q 'reverse_proxy waf:8080' services/reverse-proxy/Caddyfile
! grep -q 'JWT_SECRET:.*Set JWT_SECRET' docker-compose.yml
grep -q 'SPRING_CONFIG_IMPORT' docker-compose.yml
grep -q 'SERVER_FORWARD_HEADERS_STRATEGY:.*native' docker-compose.yml
# These image entrypoint hooks must survive custom-template changes.
grep -q 'SET_REAL_IP_FROM' security/waf/nginx/proxy_backend.conf.template
grep -Fq 'proxy_pass $vigil_backend;' security/waf/nginx/proxy_backend.conf.template
grep -Fq 'proxy_set_header Connection $connection_upgrade;' security/waf/nginx/proxy_backend.conf.template
grep -q 'proxy_buffering off;' security/waf/nginx/proxy_backend.conf.template
sh -n security/vault/scripts/init-vault.sh
sh -n security/vault/scripts/start-agent.sh
sh -n security/tests/test-waf.sh
sh -n security/tests/test-vault.sh
python3 -c 'import ast; from pathlib import Path; ast.parse(Path("security/tests/test-waf-isolated.py").read_text())'
echo 'PASS: static security integration checks'
