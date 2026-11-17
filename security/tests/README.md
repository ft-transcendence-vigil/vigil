# Security checks

Run commands from the repository root. Runtime suites require Docker; fullstack
and TLS checks also require Python 3.10+, PyYAML, and Docker Compose v2+.

## Static and running-stack smoke checks

```sh
sh security/tests/test-static.sh
sh security/tests/test-waf.sh
sh security/tests/test-vault.sh
```

The static check does not start services. The other checks require a running
stack. WAF smoke checks expect public setup to return 200, protected API routes
401, attacks/sensitive paths 403, and internal paths 404. Blanket blocking or an
SPA/upstream-error response is not a pass. `BASE` overrides the discovered HTTPS
URL; Compose's project name or `COMPOSE_PROJECT_NAME` selects the stack. Only this
local-development smoke check disables certificate verification.

The Vault smoke check verifies rendered files and unsealed status, not application
or database authentication. Use `docker compose config --quiet` to validate
Compose without printing secrets; do not share expanded configuration output.

## Isolated WAF regression suite

```sh
python3 security/tests/test-waf-isolated.py
```

Requires Python 3.10+ and Docker. Builds the pinned WAF image and starts disposable
Caddy, WAF, Python backend, and client containers on a unique network. It publishes
no ports, reads no `.env`, and uses no deployment volumes. Cleanup removes only
its own resources. Docker may download fixture/base images;
`WAF_TEST_PYTHON_IMAGE` and `WAF_TEST_CADDY_IMAGE` override fixture images.

Coverage includes image rendering and `nginx -t`, SQLi/XSS/traversal blocking,
sensitive/internal paths, legitimate API methods and SPA routes, field-scoped
password exceptions, forwarded client IPs, WebSocket frames, and incremental SSE.

The backend is a fixture, not Spring/Tomcat. This suite does not establish real
application authentication, database integration, or Spring rate-limit isolation.

## Real isolated fullstack suite

```sh
python3 security/tests/test-fullstack.py
```

Starts all 16 default Compose services, including Vault and four agents,
PostgreSQL, ClickHouse, the real collector/API/frontend/WAF, and Ollama with
`qwen2.5:0.5b`. It downloads the model into an isolated volume and performs real
inference. Allow substantial RAM, disk, network access, and startup time. The
optional mock telemetry sender is not started.

The harness reads Compose as YAML, not the project's `.env`, and generates
synthetic credentials in a private temporary directory. It removes fixed resource
names, rejects external resources and unsafe binds, and publishes only Caddy
HTTPS on an ephemeral loopback port. HTTPS is verified against the test CA.
Cleanup checks its unique project's resource names before removing its volumes;
it never prunes Docker or uses deployment volumes. Failures retain a redacted
log, not bootstrap credentials or expanded Compose configuration.

Commands have deadlines; the default overall limit is 900 seconds plus bounded
cleanup. Use `--timeout SECONDS` to change it. Do not SIGKILL the harness because
cleanup cannot run. Python and Docker must share the same filesystem.

Coverage includes:

- Service readiness and one-shot provisioning exit codes.
- CA-verified HTTPS, built frontend assets, and SPA fallback.
- Setup with a complex legitimate password, login, cookies, refresh, sessions,
  admin ApiKey authentication, and matching API/Vault ingestion keys.
- WAF blocking, protected-route denial, and unauthenticated OTLP denial.
- Real OTLP logs/metrics/traces, database reads, WebSocket delivery, and SSE.
- Collector-triggered alerts/notifications and real automatic/streamed LLM analysis.
- Two-client Spring login rate-limit isolation despite spoofed forwarding headers.
- API restart persistence and rule PATCH/DELETE.

`--image SERVICE=IMAGE` reuses an existing image instead of building that service;
its contents must match current source. `--client-image` overrides the Python
client image. `--validate-only` checks generated isolation without starting
containers. Synthetic inference timeouts/token limits are test settings, not
validation of production latency defaults.

This is not browser automation, exhaustive Vault recovery/ACL testing, a database
upgrade or grant audit, external-webhook verification, or an HTTP/2/idle-timeout
soak. Never run account-creating or rate-limit-exhausting checks against production.

## TLS runtime checks

The separate [TLS test instructions](../../services/reverse-proxy/README.md#tests)
cover API/helper checks and `services/reverse-proxy/tests/test-tls-config.py`.
The runtime suite reuses `test-fullstack.py` for isolation and cleanup, but starts
only the 13-service non-AI dependency chain. It requires current built images;
see the linked instructions for commands and optional public-ACME testing.
Public issuance exposes disposable ingress, uses CA rate limits, and creates
certificate-transparency records. It is opt-in, not part of the default checks.

## Proxy integration assumptions

Only Caddy is public; API/WAF ports stay internal. Keep native API forwarded-header
handling so Tomcat resolves clients through Caddy and WAF for rate limits. Shared
network peers are trusted, not arbitrary forwarding-header sources.

Keep WAF blocking/body inspection enabled, response-body inspection off for SSE,
and forwarded HTTPS scheme/port settings consistent with the browser origin.
Caddy waits for WAF health and keeps its admin API loopback-only. The WAF fixture
suite alone cannot verify the application's actual rate-limit behavior.
