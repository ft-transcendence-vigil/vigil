# Vigil security module — WAF + Vault

This is a **development / demonstration implementation**, not a production-ready security boundary. It is based on the architecture described in chat: Caddy public TLS, Spring Boot `api:8080`, `/api/*` API, `/api/alerts/ws` WebSocket, `/api/telemetry/{logs,metrics,traces}/live` SSE. Existing Compose and API source were not available to test here.

## Installation (team integration)

1. Copy this entire folder to `test/security/` beside the team's `test/docker-compose.yml`.
2. In `test/services/reverse-proxy/Caddyfile`, change ONLY the `/api/*` upstream from `reverse_proxy api:8080` to `reverse_proxy waf:8080`. Keep `/otlp/*`, frontend, TLS and `/internal/*` routes unchanged.
3. Confirm `api` has no `ports:` exposing 8080 on the host; ensure WAF and Caddy are on the same Compose default network. If the original compose uses explicit networks, attach WAF to that network too.
4. **Important:** if the original API has `JWT_SECRET` set in its `environment`, remove that specific assignment (and keep all other env variables). Otherwise that environment variable overrides the Vault configtree value. Keep your existing DB/ClickHouse secrets working as before; this bundle centralizes the JWT secret only.
5. Build/start: `cd test && docker compose -f docker-compose.yml -f security/docker-compose.security.yml up -d --build`.
6. Check: `docker compose -f docker-compose.yml -f security/docker-compose.security.yml logs vault-init vault-agent waf --tail 100` and `docker compose -f docker-compose.yml -f security/docker-compose.security.yml exec waf nginx -t`.
7. Test browser login, authenticated API, live telemetry SSE, WebSocket alerts, and WAF SQLi. A 403 is not proof of CRS without audit evidence.

## Known verification / integration gaps

- **Critical:** verify actual base Compose before merging: its networks, `api` service name, dependencies, and any existing `SPRING_CONFIG_IMPORT` setting. Docker Compose overlay `depends_on` is additive and original dependencies are preserved.
- **Critical:** confirm Spring Boot configtree resolves `${JWT_SECRET}` from `/run/secrets/JWT_SECRET`; if the app uses environment-only access (`System.getenv`), change application wiring or use a secret-loading entrypoint.
- **Critical:** the ModSecurity connector must actually be enabled in the Nginx location hierarchy. `nginx -t` alone does not prove it. Verify WAF logs with a malicious request and normal request.
- **Critical:** WebSocket query-string JWTs may be logged by Caddy, ModSecurity audit, upstream logs or monitoring. Nginx access logging is disabled for the WebSocket endpoint only. Audit all logging paths before production.
- **Critical:** Docker network isolation alone does not prevent direct API access from other containers on the same network. Strong isolation requires a carefully reviewed network split after confirming all service dependencies.
- Vault is single-node with file storage, no TLS on its private Docker network, and a local auto-unseal key in a Docker volume. This is for coursework, not production. Store bootstrap credentials safely, restrict Docker access, use TLS and KMS/HSM auto-unseal for production.
- This version uses Vault to supply JWT_SECRET. Other credentials are NOT migrated without reviewing their exact usage, ownership and rotation requirements.
- Check the image tags are available and pin digests for reproducibility. We could not run Docker in this authoring environment.
- Nginx template relies on the pinned CRS image's `includes/proxy_backend.conf` and `includes/location_common.conf`; confirm their contents and ModSecurity location inheritance.

## Files

- `waf/Dockerfile` / `waf/nginx/default.conf.template` — CRS/Nginx proxy
- `waf/rules/` — custom rule and intentionally empty exclusion hooks
- `vault/config/vault.hcl` — Vault file storage and listener
- `vault/scripts/init-vault.sh` — demo bootstrap, AppRole, secret initialization and unseal monitor
- `vault/agent/agent.hcl` — fetches JWT_SECRET into a Docker volume
- `vault/policies/backend-policy.hcl` — least-privilege read policy
- `docker-compose.security.yml` — Compose overlay
- `tests/` — smoke tests
