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

After merge, test real rate limits on a disposable application stack: exhaust
one client's login/admin budget, verify a second client's budget is untouched,
and verify spoofed `X-Forwarded-For` cannot reset the first client's budget.
Never run account-creating or limit-exhausting tests against production.
