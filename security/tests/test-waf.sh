#!/bin/sh
# Non-mutating smoke checks against an already running stack. For streaming,
# client-IP spoofing and credential false positives, run test-waf-isolated.py.
set -eu
cd "$(dirname "$0")/../.."

# Honor Compose's normal project naming (or COMPOSE_PROJECT_NAME), rather than
# silently testing a different hard-coded project. Never print compose config.
dc() { docker compose -f docker-compose.yml "$@"; }
dc exec -T waf nginx -t
dc exec -T waf sh -c 'test -r /etc/modsecurity.d/owasp-crs/rules/REQUEST-899-CUSTOM.conf'

if [ -z "${BASE:-}" ]; then
  HTTPS_PORT="$(dc port reverse-proxy 443 | sed -n '1s/.*://p')"
  [ -n "$HTTPS_PORT" ] || { echo 'FAIL: Could not determine HTTPS port'; exit 1; }
  BASE="https://localhost:$HTTPS_PORT"
fi

status() {
  curl -ksS --path-as-is --connect-timeout 5 --max-time 15 \
    -o /dev/null -w '%{http_code}' "$BASE$1"
}
expect() {
  actual="$(status "$1")"
  printf '%s: %s (expected %s)\n' "$1" "$actual" "$2"
  [ "$actual" = "$2" ] || { echo 'FAIL: Unexpected HTTP status'; exit 1; }
}

# Do not count a blanket WAF 403, SPA 200, 404, or upstream error as success.
expect /api/setup 200
expect /api/alerts 401
expect /api/config/keys 401
expect '/api/alerts?search=1%27%20OR%20%271%27%3D%271' 403
expect '/api/alerts?search=%3Cscript%3Ealert(1)%3C%2Fscript%3E' 403
expect '/api/alerts?file=..%2F..%2Fetc%2Fpasswd' 403
for path in /.env /.env.local /.git /.git/config /.ENV /%2eenv \
            /nested/.env.production /api/.env /api/.git/config \
            /.svn/entries /.hg/store /.htpasswd; do
  expect "$path" 403
done
expect /internal 404
expect /internal/test 404

echo 'PASS: non-mutating WAF HTTP smoke checks'
echo 'NOTE: This does not verify authenticated API behavior, Tomcat IP resolution, or 429 isolation.'
