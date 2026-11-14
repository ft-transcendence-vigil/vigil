# Security checks

## Isolated WAF regression suite

Run on the Docker host (Python 3.10+ and Docker required):

```sh
python3 security/tests/test-waf-isolated.py
```

This builds the pinned WAF image and starts disposable Caddy 2.11.4, WAF,
Python backend, and two concurrent client containers on a unique Docker
network. It publishes no ports, reads no `.env`, and mounts no application or
production volumes. Caddy state uses tmpfs. Cleanup removes only the suite's
containers, network, and unique build tag. Docker may download the Python,
Caddy, and WAF base images. Override fixture images with
`WAF_TEST_PYTHON_IMAGE` / `WAF_TEST_CADDY_IMAGE` if necessary.

Coverage:

- Supported image entrypoint/template rendering and `nginx -t`.
- SQLi, XSS, and traversal blocking through Caddy and directly through WAF.
- Root/nested/encoded/case-variant sensitive files and VCS metadata.
- Internal paths hidden without falling through to the SPA.
- Legitimate API paths, SPA fallback, and PUT/PATCH/DELETE forwarding.
- JSON credential passwords are opaque on the four credential-writing routes;
  email, query arguments, unrelated routes, and other fields remain inspected.
- Client-supplied forwarding headers cannot choose the forwarded client IP;
  two concurrent containers retain distinct IPs through the proxy chain.
- WebSocket 101 handshake and a masked client frame echoed by the upstream.
- Incremental GET SSE for logs/metrics/traces and POST SSE for alert questions,
  asserting the first event arrives before the delayed final event.

The backend is a fixture, **not Spring/Tomcat**. These tests do not establish
application authentication, database integration, WebSocket origin/JWT policy,
or actual rate-limit bucket isolation. Synthetic credentials are test data,
not real accounts. HTTP/2 and long-duration idle timeout behavior are not tested.

## Real isolated fullstack suite

Run **on the Docker host**, with Python 3.10+, PyYAML, and Docker Compose v2+
(`python3 -m pip install PyYAML` in a disposable virtualenv if needed):

```sh
python3 security/tests/test-fullstack.py
```

This is an actual application integration test, not the fixture-backed WAF suite.
It starts all **16 default Compose services**, including Vault and its four agents,
PostgreSQL, ClickHouse, the real collector/API/frontend/WAF, and Ollama with
`qwen2.5:0.5b`. It downloads the model into a fresh isolated volume and performs
real automatic analysis and streaming inference. No service is mocked. Allow
sufficient RAM/swap, disk, network access, and startup time; model/image downloads
can be substantial. The optional mock telemetry sender is not started.

Safety properties:

- Reads `docker-compose.yml` as YAML data, **never the project's `.env`**. Creates
  six random bootstrap credentials and explicit synthetic interpolation settings
  in an owner-private temporary directory. Subprocesses do not inherit application
  environment variables; `--env-file`, `--project-directory`, and
  `COMPOSE_DISABLE_ENV_FILE=1` are explicit.
- Removes fixed container/volume/network names; refuses external resources and
  unsafe binds. Vault imports only the generated synthetic bootstrap file.
  Original service configurations/dependencies are otherwise retained, apart
  from isolated ports and explicitly requested image overrides.
- Publishes **only Caddy HTTPS on `127.0.0.1:<ephemeral port>`**. Copies the public
  Caddy certificate using Compose and verifies HTTPS against that CA. No API,
  database, Vault, collector, or LLM port is published.
- Validates the fully resolved resource names before startup. Cleanup runs in
  `finally`, including failure/signals/deadline, and checks actual volume names
  against the unique project's allowlist before `down --volumes`. It never prunes
  Docker or touches existing application volumes. Cleanup failures are failures.
- Commands and requests have deadlines. The default overall test deadline is
  900 seconds, plus bounded cleanup; override with `--timeout SECONDS`. Do not
  externally SIGKILL the harness, since SIGKILL cannot run cleanup.
- Success removes temporary files. Failure retains only a redacted diagnostic
  log (owner-private directory/file), not bootstrap credentials or expanded
  Compose configuration. Tokens/keys are not printed as test assertions.

Use already built images without rebuilding those services:

```sh
python3 security/tests/test-fullstack.py \
  --image api=your-api-image:tag \
  --image telemetry-collector=your-collector-image:tag \
  --image waf=your-waf-image:tag \
  --image reverse-proxy=your-frontend-caddy-image:tag \
  --image llm=your-llm-image:tag
```

Overrides remove only the named service's `build` configuration. With no override,
normal repository build contexts are used. Overrides must actually contain the
current source: the suite does not refresh an explicitly supplied image. In
particular, a WAF image without the current credential-field exclusions will
correctly fail the complex-password setup check; rebuild it rather than disabling
WAF or weakening that assertion.

The synthetic environment allows CPU inference 80 seconds (API upstream deadline
90 seconds), uses a 2048-token context / 160-token output budget, and delays silence
alerts to 600 seconds. These are test settings, not verification of production's
default latency budget. The model remains the real `qwen2.5:0.5b`.

`--client-image` defaults to `python:3.13-alpine`. `--validate-only` checks the generated isolation model without
starting any containers. The suite must run where Python and Docker share the
same filesystem; from a sandboxed editor, invoke the entire script on the host,
not just individual Docker commands.

Coverage:

- All default service health/running statuses and both one-shot init exit codes.
- CA-verified HTTPS, real built frontend index/JS asset, and SPA fallback routes.
  This is a **served-asset check, not browser navigation/UI automation**.
- Initial setup, complex SQL/HTML-containing legitimate password, login JWT,
  secure cookie attributes, refresh rotation, sessions, generated admin ApiKey
  authentication, and equality of the API/Vault synthetic ingestion key.
- WAF attack/sensitive-path blocking, protected API denial, and unauthenticated
  OTLP denial.
- Authenticated real WebSocket and three concurrent public telemetry SSE streams;
  real OTLP logs/traces/metrics through Caddy, DB-backed reads, metric series, and
  matching SSE rows. Samples use fresh runtime timestamps.
- The **collector's real callback** creates the alert and per-user notification;
  checks WebSocket alert/notification delivery and notification PUT. The harness
  never fabricates an ingest callback or inserts telemetry directly into storage.
- Nonfallback automatic LLM analysis, public POST ask SSE tokens plus `done`, and
  a direct internal LLM inference request. A 200 response, fallback text, or stream
  error is not accepted as successful inference.
- Two simultaneous disposable client containers route HTTPS through Caddy with
  localhost SNI: client A exhausts its actual Spring/Tomcat login bucket, client B
  remains unaffected, and spoofed forwarding headers cannot reset A's bucket.
- API restart preserves the generated admin key, JWT/cookie session, telemetry,
  notification state and Vault ingestion key; finally tests rule PATCH/DELETE.

Checks accumulate failures where independent work can safely continue. Missing
critical setup/ingestion prerequisites stop dependent checks. Optional external
webhooks, database grant probes, browser automation, HTTP/2 and idle-timeout
soaks are not covered. Do not interpret this suite as covering those cases.

## Running-stack smoke checks

```sh
sh security/tests/test-static.sh
sh security/tests/test-waf.sh
```

`test-waf.sh` honors Compose's normal project name or `COMPOSE_PROJECT_NAME`;
`BASE` can override its automatically discovered HTTPS URL. The HTTP checks
are read-only and bounded by connection/request timeouts. They require a
running API: public setup must return 200, protected API routes must return
401, attacks/sensitive files must return 403, and internal paths must return
404. A blanket 403 or an SPA/upstream-error response is not a pass. TLS
verification is disabled only for this local-development smoke test.

Use `docker compose config --quiet` to validate Compose without printing secrets.
Do not share expanded `docker compose config` output.

## Compose integration contract

- Retain `SERVER_FORWARD_HEADERS_STRATEGY: native` on **api**. Tomcat must
  resolve the `X-Forwarded-For` chain from Caddy through WAF so the application's
  `getRemoteAddr()` rate-limit keys are clients, not the WAF. Keep Tomcat's
  internal proxy trust compatible with the Docker proxy addresses.
- Neither API 8080 nor WAF 8080 may be published to untrusted clients. Only
  Caddy's HTTPS ingress is public. Other containers on their shared network
  are trusted; separate proxy/application networks if that assumption does
  not hold. Do not enable blanket real-IP trust (`0.0.0.0/0`). The default WAF
  real-IP settings are not needed to make Tomcat resolve the forwarded chain.
- Retain WAF `BACKEND=http://api:8080`, `PORT=8080`,
  `MODSEC_RULE_ENGINE=On`, `MODSEC_REQ_BODY_ACCESS=On`,
  `MODSEC_RESP_BODY_ACCESS=Off`, `BLOCKING_PARANOIA=2`, and
  `ANOMALY_INBOUND=5`. Keep the configured request-body limits and rejection
  action. Response-body inspection must remain off for SSE.
- Retain `NGINX_X_FORWARDED_PROTO=https` and
  `NGINX_X_FORWARDED_PORT=443` for the current internal TLS-offload contract.
  If deployed behind a different public port, review forwarded host/port and
  absolute redirects together. Configure API frontend/origin URLs to match
  the real browser origin (including the published HTTPS port).
- The WAF healthcheck uses its local `/healthz` endpoint, and Caddy depends
  on WAF health. This tests WAF readiness, not API health.
- Caddy's admin API is now loopback-only. Reload via `docker compose exec`
  inside the Caddy container, not from another network container.

The real isolated fullstack suite above exercises the actual Tomcat login bucket
with two clients and spoofed forwarding headers. The fixture-backed WAF suite
alone does not establish that property. Never run account-creating or
limit-exhausting tests against production.
