
#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

DC="docker compose -f docker-compose.yml -f security/docker-compose.security.yml"

$DC exec -T waf nginx -t
$DC exec -T waf sh -c 'test -r /etc/modsecurity.d/owasp-crs/rules/REQUEST-899-CUSTOM.conf'

# Use the actual published HTTPS port.
HTTPS_PORT="$($DC port reverse-proxy 443 | tail -n 1 | sed 's/.*://')"

[ -n "$HTTPS_PORT" ] || {
  echo 'FAIL: Could not determine HTTPS port'
  exit 1
}

BASE="${BASE:-https://localhost:$HTTPS_PORT}"

status() {
  curl -ksS -o /dev/null -w '%{http_code}' "$BASE$1"
}

normal="$(status /api/alerts)"
printf 'Normal unauthenticated /api/alerts: %s\n' "$normal"

case "$normal" in
  000|502|503|504)
    echo 'FAIL: API upstream unavailable'
    exit 1
    ;;
esac

attack="$(status '/api/alerts?search=1%27%20OR%20%271%27%3D%271')"
printf 'SQLi payload: %s\n' "$attack"

[ "$attack" = 403 ] || {
  echo 'FAIL: SQL injection was not blocked'
  exit 1
}

internal="$(status /internal/test)"
printf 'Internal path: %s\n' "$internal"

[ "$internal" = 404 ] || {
  echo 'FAIL: Internal route not hidden'
  exit 1
}

echo 'PASS: WAF HTTP integration checks'
echo 'NOTE: Confirm CRS detection in the WAF audit logs.'
