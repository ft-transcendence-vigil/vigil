
#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

DC="docker compose -f docker-compose.yml -f security/docker-compose.security.yml"

$DC exec -T vault-agent sh -c 'test -s /run/secrets/JWT_SECRET' || {
  echo 'FAIL: Vault Agent did not render JWT secret'
  exit 1
}

echo 'PASS: Vault Agent rendered JWT secret'

# Verify the API mounts the same named volume at /run/secrets.
agent_volume="$(docker inspect "$($DC ps -q vault-agent)" --format '{{range .Mounts}}{{if eq .Destination "/run/secrets"}}{{.Name}}{{end}}{{end}}')"
api_volume="$(docker inspect "$($DC ps -q api)" --format '{{range .Mounts}}{{if eq .Destination "/run/secrets"}}{{.Name}}{{end}}{{end}}')"

[ -n "$agent_volume" ] && [ "$agent_volume" = "$api_volume" ] || {
  echo 'FAIL: API and Vault Agent do not share the secret volume'
  exit 1
}

echo 'PASS: API and Vault Agent share the secret volume'

$DC exec -T vault-init sh -c 'VAULT_ADDR=http://vault:8200 vault status -format=json' \
  | grep -Eq '"sealed"[[:space:]]*:[[:space:]]*false' || {
    echo 'FAIL: Vault is sealed or unavailable'
    exit 1
  }

echo 'PASS: Vault is unsealed'
echo 'PASS: Vault integration checks'
echo 'NOTE: API secret consumption still requires an application-level test.'
