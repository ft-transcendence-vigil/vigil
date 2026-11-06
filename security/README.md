# Vigil Security Module — WAF + HashiCorp Vault

This module provides Web Application Firewall (WAF) protection and centralized secret management for Vigil.

**Note:** This is a development/demonstration implementation, not a production-ready security deployment.

## Architecture

**HTTP traffic:**

Caddy (HTTPS) → Nginx + ModSecurity (OWASP CRS) → Spring Boot API

Caddy continues to handle frontend traffic and OTLP routes.

**Secret management:**

HashiCorp Vault → Vault Agents → Docker volumes → Application services

## Components

### Web Application Firewall

- Nginx with ModSecurity and OWASP Core Rule Set (CRS).
- Protects `/api/*` traffic.
- Operates behind the existing Caddy reverse proxy.
- Uses blocking paranoia level 2 and an inbound anomaly threshold of 5.
- Supports the application's API, WebSocket, and SSE endpoints.

### HashiCorp Vault

- Uses persistent file-based storage.
- Initializes and unseals automatically for demonstration purposes.
- Imports initial credentials from the root `.env` file.
- Uses AppRole authentication and four Vault Agents.
- Generates secret files in Docker volumes for the API, PostgreSQL, ClickHouse, and telemetry collector.

The initial credentials imported are:

- `JWT_SECRET`
- `POSTGRES_PASSWORD`
- `CLICKHOUSE_PASSWORD`
- `CLICKHOUSE_API_PASSWORD`
- `CLICKHOUSE_WRITER_PASSWORD`
- `VIGIL_INGESTION_KEY`

Existing secrets are retained in Vault across container restarts.

## Deployment

The security services are integrated directly into the project's main `docker-compose.yml`.

From the project root:

```bash
docker compose up -d --build
```

For a fresh deployment, populate the required variables in the root `.env` file before starting the containers.

Do not commit `.env`, Vault initialization credentials, or generated secret files.

## Verification

**Normal API request:**

```bash
curl -k -o /dev/null -w '%{http_code}\n' \
  https://localhost:8443/api/auth/sessions
```

Expected: `401` (authentication required).

**WAF SQL injection test:**

```bash
curl -k -o /dev/null -w '%{http_code}\n' \
  --get --data-urlencode "id=1' OR '1'='1" \
  https://localhost:8443/api/auth/sessions
```

Expected: `403` (request blocked).

To confirm the block came from ModSecurity CRS rather than the application, inspect the WAF audit logs.

**Container health:**

```bash
docker compose ps -a
```

Check that the Vault Agents, PostgreSQL, ClickHouse, and WAF are healthy. Initialization containers may exit successfully with code 0.

## Testing Status

The following integration tests were completed successfully:

- Fresh deployment using isolated Docker volumes.
- Vault initialization and secret delivery.
- Four healthy Vault Agents.
- PostgreSQL and ClickHouse startup.
- API accessibility through Caddy and WAF.
- SQL injection blocking by WAF.
- Single-file Docker Compose startup and smoke tests.

These checks do not constitute a complete production security assessment.

## Security Limitations

- Vault uses single-node file storage.
- Vault traffic uses HTTP within a private Docker network.
- The demonstration bootstrap stores the root token and unseal key in a persistent Docker volume.
- Initial secrets are imported from the root `.env` file.
- Docker network isolation does not prevent every form of lateral access between containers.
- WebSocket URLs containing tokens may be captured by proxy or application logs.
- Production deployments require stronger key management, TLS, access controls, and a security review.

## Project Files

- `waf/` — Nginx, ModSecurity, CRS configuration, and custom rules.
- `vault/config/` — Vault server configuration.
- `vault/scripts/` — Initialization, agent startup, and service integration scripts.
- `vault/agent/` — Vault Agent configurations and templates.
- `vault/policies/` — AppRole access policies.
- `tests/` — Security smoke tests.

The main `docker-compose.yml` contains the integrated service definitions.