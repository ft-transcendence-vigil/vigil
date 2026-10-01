# Vigil Spec vs. Project — Difference Table

> **Source spec**: `vigil.json` (3 013 lines, last updated 2026-07-19)
> **Project root**: `services/api/src/main/java/com/ft_transcendence/vigil/`
> **Generated**: 2026-09-29

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Matches spec |
| ⚠️ | Partial / minor deviation |
| ❌ | Missing or wrong |
| 🆕 | Present in project but not in spec |

---

## 1. Endpoint Route & Method Differences

| # | Spec ID | Spec Route | Spec Method | Project Route | Project Method | Status | Notes |
|---|---------|-----------|-------------|---------------|----------------|--------|-------|
| 1 | `ep-auth-setup` | `/api/auth/setup` | `POST` | `/api/setup` | `POST` | 📌 Override | **Project overrides spec.** Route is `/api/setup` under `SetupController`, not `/api/auth/setup`. vigil.json should be updated. |
| 2 | — | — | — | `/api/setup` | `GET` | 📌 Override | **Project addition.** Returns `Boolean` (setupRequired). Not in spec — vigil.json should add `GET /api/setup` with `PERMIT_ALL`. |
| 3 | `ep-alert-ack` | `/api/alerts/{id}` | `PUT` | `/api/alerts/ack/{id}` | `PUT` | 📌 Override | **Project overrides spec.** Route has extra `/ack` segment. vigil.json should be updated to `/api/alerts/ack/{id}`. |
| 4 | `ep-config-keys` | `/api/config/keys` | `GET` | — | — | ❌ | **Missing.** No `ConfigKeysController` exists. Spec requires returning `{ api_key, ingestion_key }` for ADMIN. |
| 5 | `ep-llm-analyze` | `/api/llm/analyze` | `POST` | — | — | ❌ | **Missing.** No LLM/AI controller exists. Spec requires streaming proxy to FastAPI + Ollama. |
| 6 | `ep-ingest-logs` | `/internal/ingest/v1/logs` | `POST` | — | — | ❌ | **Missing.** No internal ingest controller. Spec requires alert evaluation + SSE push + silence watchdog. |
| 7 | `ep-ingest-metrics` | `/internal/ingest/v1/metrics` | `POST` | — | — | ❌ | **Missing.** Same as above for metrics. |
| 8 | `ep-ingest-traces` | `/internal/ingest/v1/traces` | `POST` | — | — | ❌ | **Missing.** Same as above for traces. |
| 9 | `ep-fastapi-analyze` | `/internal/llm/forward` | `POST` | — | — | ❌ | **Missing.** FastAPI endpoint for LLM alert summarization. (Owned by AI Engineer, may be a separate service.) |
| 10 | `ep-alerts-ws` | `/api/alerts/ws` | `WS` | `/api/alerts/ws` | `WS` | ✅ | Route matches. WebSocket handler exists (`AlertSocketHandler`). |
| 11 | `ep-alerts-list` | `/api/alerts` | `GET` | `/api/alerts` | `GET` | ✅ | Route matches. |
| 12 | `ep-alert-rules-list` | `/api/alerts/rules` | `GET` | `/api/alerts/rules` | `GET` | ✅ | Route matches. |
| 13 | `ep-alert-rules-create` | `/api/alerts/rules` | `POST` | `/api/alerts/rules` | `POST` | ✅ | Route matches. |
| 14 | `ep-alert-rules-update` | `/api/alerts/rules/{id}` | `PATCH` | `/api/alerts/rules/{id}` | `PATCH` | ✅ | Route matches. |
| 15 | `ep-alert-rules-delete` | `/api/alerts/rules/{id}` | `DELETE` | `/api/alerts/rules/{id}` | `DELETE` | ✅ | Route matches. |
| 16 | `ep-auth-login` | `/api/auth/login` | `POST` | `/api/auth/login` | `POST` | ✅ | Route matches. |
| 17 | `ep-auth-refresh` | `/api/auth/refresh` | `POST` | `/api/auth/refresh` | `POST` | ✅ | Route matches. |
| 18 | `ep-auth-logout` | `/api/auth/logout` | `POST` | `/api/auth/logout` | `POST` | ✅ | Route matches. |
| 19 | `ep-auth-sessions-list` | `/api/auth/sessions` | `GET` | `/api/auth/sessions` | `GET` | ✅ | Route matches. |
| 20 | `ep-auth-sessions-revoke` | `/api/auth/sessions/{id}` | `DELETE` | `/api/auth/sessions/{id}` | `DELETE` | ✅ | Route matches. |
| 21 | `ep-users-list` | `/api/users` | `GET` | `/api/users` | `GET` | ✅ | Route matches. |
| 22 | `ep-users-create` | `/api/users` | `POST` | `/api/users` | `POST` | ✅ | Route matches. |
| 23 | `ep-users-me-get` | `/api/users/me` | `GET` | `/api/users/me` | `GET` | ✅ | Route matches. |
| 24 | `ep-users-me` | `/api/users/me` | `PATCH` | `/api/users/me` | `PATCH` | ✅ | Route matches. |
| 25 | `ep-users-update` | `/api/users/{id}` | `PATCH` | `/api/users/{id}` | `PATCH` | ✅ | Route matches. |
| 26 | `ep-users-delete` | `/api/users/{id}` | `DELETE` | `/api/users/{id}` | `DELETE` | ✅ | Route matches. |
| 27 | `ep-webhooks-list` | `/api/webhooks` | `GET` | `/api/webhooks` | `GET` | ✅ | Route matches. |
| 28 | `ep-webhooks-create` | `/api/webhooks` | `POST` | `/api/webhooks` | `POST` | ✅ | Route matches. |
| 29 | `ep-webhooks-delete` | `/api/webhooks/{id}` | `DELETE` | `/api/webhooks/{id}` | `DELETE` | ✅ | Route matches. |
| 30 | `ep-telemetry-metrics` | `/api/telemetry/metrics` | `GET` | `/api/telemetry/metrics` | `GET` | ✅ | Route matches. |
| 31 | `ep-telemetry-traces` | `/api/telemetry/traces` | `GET` | `/api/telemetry/traces` | `GET` | ✅ | Route matches. |
| 32 | `ep-telemetry-logs` | `/api/telemetry/logs` | `GET` | `/api/telemetry/logs` | `GET` | ✅ | Route matches. |
| 33 | `ep-telemetry-logs-live` | `/api/telemetry/logs/live` | `GET (SSE)` | `/api/telemetry/logs/live` | `GET (SSE)` | ✅ | Route matches. |
| 34 | `ep-telemetry-traces-live` | `/api/telemetry/traces/live` | `GET (SSE)` | `/api/telemetry/traces/live` | `GET (SSE)` | ✅ | Route matches. |
| 35 | `ep-telemetry-metrics-live` | `/api/telemetry/metrics/live` | `GET (SSE)` | `/api/telemetry/metrics/live` | `GET (SSE)` | ✅ | Route matches. |
| 36 | `ep-telemetry-attributes` | `/api/telemetry/attributes` | `GET` | `/api/telemetry/attributes` | `GET` | ✅ | Route matches. |

---

## 2. Auth & Role Enforcement Differences

| # | Endpoint | Spec Auth | Spec Role | Project Auth | Project Role | Status | Notes |
|---|----------|-----------|-----------|--------------|--------------|--------|-------|
| 1 | `POST /api/setup` | `PERMIT_ALL` | `NO_AUTH` | `permitAll` (SecurityConfig) | No `@PreAuthorize` | ✅ | Matches. |
| 2 | `POST /api/auth/login` | `PERMIT_ALL` | `NO_AUTH` | `permitAll` (SecurityConfig) | No `@PreAuthorize` | ✅ | Matches. |
| 3 | `POST /api/auth/refresh` | `PERMIT_ALL` | `NO_AUTH` | `permitAll` (SecurityConfig) | No `@PreAuthorize` | ✅ | Matches. |
| 4 | `POST /api/auth/logout` | `PERMIT_ALL` | `NO_AUTH` | `permitAll` (SecurityConfig) | No `@PreAuthorize` | ✅ | Matches. |
| 5 | `GET /api/auth/sessions` | `PERMIT_ALL` | `NO_AUTH` | `permitAll` (SecurityConfig) | No `@PreAuthorize` | ✅ | Matches. Service-layer cookie validation. |
| 6 | `DELETE /api/auth/sessions/{id}` | `PERMIT_ALL` | `NO_AUTH` | `permitAll` (SecurityConfig) | No `@PreAuthorize` | ✅ | Matches. |
| 7 | `WS /api/alerts/ws` | `WS_AUTH_HANDSHAKE` | `ADMIN_/_VIEWER` | `permitAll` (SecurityConfig) | Handshake interceptor validates JWT | ⚠️ | SecurityConfig marks it as `permitAll()` but `MyHandShake` interceptor validates the token at upgrade time. Functionally correct but the permitAll in the filter chain means the rate limiter is the only pre-upgrade gate. |
| 8 | `GET /api/alerts` | `JWT, API_KEY` | `ADMIN_/_VIEWER` | JWT/ApiKey filter | `hasAnyRole('admin','viewer')` | ✅ | Matches. |
| 9 | `GET /api/alerts/rules` | `JWT, API_KEY` | `ADMIN_/_VIEWER` | JWT/ApiKey filter | `hasAnyRole('admin','viewer')` | ✅ | Matches. |
| 10 | `POST /api/alerts/rules` | `JWT, API_KEY` | `ADMIN` | JWT/ApiKey filter | `hasRole('admin')` | ✅ | Matches. |
| 11 | `PATCH /api/alerts/rules/{id}` | `JWT, API_KEY` | `ADMIN` | JWT/ApiKey filter | `hasRole('admin')` | ✅ | Matches. |
| 12 | `DELETE /api/alerts/rules/{id}` | `JWT, API_KEY` | `ADMIN` | JWT/ApiKey filter | `hasRole('admin')` | ✅ | Matches. |
| 13 | `PUT /api/alerts/ack/{id}` | `JWT, API_KEY` | `ADMIN_/_VIEWER` | JWT/ApiKey filter | `hasAnyRole('admin','viewer')` | ✅ | Matches. |
| 14 | SSE live endpoints | `JWT, API_KEY` via `?token=` | `ADMIN_/_VIEWER` | Class-level `hasAnyRole` + `JjwtAuthFilter` `?token=` fallback | ✅ | `JjwtAuthFilter.java` falls back to `request.getParameter("token")` when no `Authorization` header is present. This correctly enables native `EventSource` clients to authenticate via `?token=`. |
| 15 | `GET /api/users` | `JWT, API_KEY` | `ADMIN` | JWT/ApiKey filter | `hasRole('admin')` | ✅ | Matches. |
| 16 | `POST /api/users` | `JWT, API_KEY` | `ADMIN` | JWT/ApiKey filter | `hasRole('admin')` | ✅ | Matches. |
| 17 | `GET /api/users/me` | `JWT, API_KEY` | `ADMIN_/_VIEWER` | JWT/ApiKey filter | `hasAnyRole('admin','viewer')` | ✅ | Matches. |
| 18 | `PATCH /api/users/me` | `JWT, API_KEY` | `ADMIN_/_VIEWER` | JWT/ApiKey filter | `hasAnyRole('admin','viewer')` | ✅ | Matches. |
| 19 | `PATCH /api/users/{id}` | `JWT, API_KEY` | `ADMIN` | JWT/ApiKey filter | `hasRole('admin')` | ✅ | Matches. |
| 20 | `DELETE /api/users/{id}` | `JWT, API_KEY` | `ADMIN` | JWT/ApiKey filter | `hasRole('admin')` | ✅ | Matches. |
| 21 | All webhooks | `JWT, API_KEY` | `ADMIN` | JWT/ApiKey filter | Class-level `hasRole('admin')` | ✅ | Matches. |
| 22 | All telemetry | `JWT, API_KEY` | `ADMIN_/_VIEWER` | JWT/ApiKey filter | Class-level `hasAnyRole('admin','viewer')` | ✅ | Matches. |

---

## 3. Request Parameter Differences

| # | Endpoint | Spec Param | Spec Detail | Project Detail | Status | Notes |
|---|----------|------------|-------------|----------------|--------|-------|
| 1 | `GET /api/alerts` | `count` | Default 20, max 100 | Default 20, min 1, max 100 — `@Min(1) @Max(100)` | ✅ | Matches. |
| 2 | `GET /api/alerts` | `before` | ISO8601, keyset pagination on `triggered_at` | String param `before` | ✅ | Present. |
| 3 | `GET /api/alerts/rules` | `count` / `offset` | Offset pagination, count default 20, max 100 | `count` (default 20), `offset` (min 0) | ✅ | Matches. |
| 4 | `POST /api/alerts/rules` | `service` | **Spec bug**: not in POST body but present in DB schema, 201 response, and PATCH body | Body correctly includes `service` field in DTO | ✅ Project / ❌ Spec | **Spec omission.** `alert_rules.service` is a required DB column (line 2718), appears in the 201 response (line 306), and is editable via PATCH (line 370) — but was accidentally left out of the POST body field list. The project is correct to include it. |
| 5 | `GET /api/telemetry/metrics` | `vigil.internal` | Boolean filter on `attributes['internal']` | `@RequestParam("vigil.internal")` boolean | ✅ | Present in controller. |
| 6 | `GET /api/telemetry/metrics` | `count` | Default 50, max 500 | Needs verification | ⚠️ | Spec says default 50 for telemetry, 20 for alerts. Need to verify project defaults match. |
| 7 | `GET /api/telemetry/logs` | `search` | Text search filter | Present in controller | ✅ | Matches. |
| 8 | `GET /api/telemetry/logs` | `severity` | Severity filter | Present in controller | ✅ | Matches. |
| 9 | `GET /api/telemetry/traces` | `sort` + `offset` | Sort with offset fallback | Both present | ✅ | Matches. |
| 10 | All telemetry GETs | `format` | `json \| csv` (default json) | Present in controller | ✅ | Matches. |

---

## 4. Response Shape / Status Code Differences

| # | Endpoint | Spec Status Codes | Project Status Codes | Status | Notes |
|---|----------|-------------------|---------------------|--------|-------|
| 1 | `PUT /api/alerts/ack/{id}` | 200, 400, 401, 404, 429, 500 | 200 + exception handler codes | ✅ | Functional match via GlobalExceptionsHandler. |
| 2 | `PATCH /api/alerts/rules/{id}` | 403 with `ADMIN_REQUIRED` or `DEFAULT_RULE_PROTECTED` codes | `ForbiddenException` thrown → `{ message }` | 📌 Override | Project uses `{ "message": "..." }`, no `code` field. |
| 3 | `DELETE /api/alerts/rules/{id}` | 403 with `DEFAULT_RULE_PROTECTED` code | `ForbiddenException` thrown → `{ message }` | 📌 Override | Same — no `code` field. |
| 4 | `PATCH /api/users/{id}` | 409 with `LAST_ADMIN` or `EMAIL_TAKEN` codes | `DuplicatedResourcesException` → `{ message }` | 📌 Override | No `code` field. |
| 5 | `DELETE /api/users/{id}` | 409 with `LAST_ADMIN` code | `DuplicatedResourcesException` → `{ message }` | 📌 Override | No `code` field. |
| 6 | `POST /api/auth/setup` | 201 | 201 | ✅ | Matches. |
| 7 | `POST /api/auth/login` | 200 with `{ role, access_token }` | 200 with `AuthResponse` | ✅ | Matches. |
| 8 | `POST /api/auth/refresh` | 200 with `{ access_token }` + cookie rotation | 200 with `RefreshResponse` + cookies | ✅ | Matches. Sets `refresh_token` and `refresh_hint` cookies. |
| 9 | `POST /api/auth/logout` | 204, clears `refresh_token` cookie | 204, clears cookies | ✅ | Matches. |

### 4a. Error Response Format Override

> [!IMPORTANT]
> **Project overrides spec:** All error responses use `{ "message": "<text>" }`, not `{ "error": "<text>" }`. The vigil.json spec should be updated to match.

| Spec format | Project format | Override |
|-------------|----------------|----------|
| `{ "error": "<validation message>" }` | `{ "message": "<validation message>" }` | 📌 JSON key is `"message"` not `"error"` |
| `{ "error": "...", "code": "ADMIN_REQUIRED" }` | `{ "message": "..." }` (no `code` field) | 📌 No `code` discriminator in response |

All error handlers in [`GlobalExceptionsHandler.java`](file:///c:/Users/ULTRA%20PC/Desktop/transadnce%20both%20version/THELATEST/services/api/src/main/java/com/ft_transcendence/vigil/exceptions/GlobalExceptionsHandler.java) use `Map.of("message", ...)`. This is the project's standard. The spec's `"error"` key and `"code"` field should be updated to match.

---

## 5. Missing Entire Feature Areas

| # | Spec Feature | Status | Notes |
|---|--------------|--------|-------|
| 1 | **LLM / AI Chat** (`POST /api/llm/analyze`) | ❌ Missing | No controller for streaming AI chat proxy. Spec requires chunked token streaming via Spring Boot → FastAPI → Ollama. |
| 2 | **Config Keys** (`GET /api/config/keys`) | ❌ Missing | No controller to expose `api_key` and `ingestion_key`. Spec says ADMIN-only GET. |
| 3 | **Internal Ingest Pipeline** (`/internal/ingest/v1/{logs,metrics,traces}`) | ❌ Missing | No internal ingest controller. This is the **core alert evaluation pipeline**: receives batches from OTel collector, evaluates alert rules, fires alerts, pushes SSE, triggers silence watchdog. This is the pipeline that connects telemetry ingestion → alerting → LLM analysis → WebSocket broadcast → webhook delivery. |
| 4 | **Internal LLM Forward** (`/internal/llm/forward`) | ❌ Missing | FastAPI endpoint for LLM alert summarization. May be owned by AI Engineer as a separate service (not Spring Boot). |
| 5 | **Silence Watchdog** | ❌ Missing | Per-service timer (configurable via `vigil.silence-timeout-seconds`, default 300s). Fires a `service_silent` alert when a service goes quiet. Depends on ingest pipeline. |
| 6 | **Webhook Delivery on Alert** | ❌ Missing | On alert trigger + LLM completion, POST Grafana OnCall-compatible payload to all registered webhooks. Fire-and-forget. Depends on ingest pipeline. |
| 7 | **Dual-port Architecture** | ❌ Missing | Spec requires public port (API) + internal port (ingest). `SecurityConfig` doesn't configure an internal port or connector. |
| 8 | **Refresh Token Reuse Detection** | ⚠️ Unverified | Spec says: if a superseded token is presented, revoke ALL sessions/tokens for that user. Need to verify `AuthService` implements this. |

---

## 6. Security & Configuration Differences

| # | Spec Item | Spec Detail | Project Detail | Status | Notes |
|---|-----------|-------------|----------------|--------|-------|
| 1 | `vigil.jwt-secret` | Auto-generated HMAC secret via `@PostConstruct` if unset | `VigilProperties` config bean | ✅ | Present. |
| 2 | `vigil.api-key` | Auto-generated UUID via `@PostConstruct` if unset | `VigilProperties` config bean | ✅ | Present. |
| 3 | `vigil.ingestion-key` | Generated + written to shared file for collector | **Not in `VigilProperties`** | ❌ | Property does not exist in project config bean. No file-writing for collector. |
| 4 | `vigil.silence-timeout-seconds` | Default 300, configurable | **Not in `VigilProperties`** | ❌ | Property does not exist. No ingest pipeline, no silence watchdog. |
| 5 | `vigil.frontend-base-url` | Required for webhook `link_to_upstream_details` | `vigil.front-end-url` (defaults `http://localhost:3000`) | ⚠️ | Property exists but named differently (`front-end-url` vs `frontend-base-url`). Used for CORS, not webhook delivery (which doesn't exist). |
| 6 | Rate limiting | Bucket4j, 10 tokens, +10/60s, per IP, before auth | Custom `RateLimiter` filter, 10 req/60s per IP, excludes `/internal/*` | ✅ | Matches. Uses custom implementation (not Bucket4j library directly, but equivalent token-bucket logic). |
| 7 | Filter chain order | CorsFilter → RateLimitFilter → AuthFilter | Rate limiter runs as `OncePerRequestFilter` | ✅ | Rate limiter is a `OncePerRequestFilter` that runs before auth. |
| 8 | SSE `?token=` auth | Native EventSource can't set headers, token as query param | `JjwtAuthFilter` falls back to `request.getParameter("token")` | ✅ | Correctly implemented in the auth filter. |
| 9 | Internal port isolation | Internal routes on separate port, network-isolated | No second port/connector configured | ❌ | All routes on single port. Internal routes only excluded from rate limiting, not isolated. |
| 10 | `vigil.access-token-expiration` | 15-minute TTL (spec) | Configurable via `VigilProperties` | ✅ | Matches. |
| 11 | `vigil.refresh-token-expiration` | 30d (spec cookie maxAge) | Configurable via `VigilProperties` | ✅ | Matches. |

---

## 7. WebSocket Behavior Differences

| # | Spec Requirement | Project Implementation | Status | Notes |
|---|------------------|----------------------|--------|-------|
| 1 | Token validated at HTTP Upgrade via `HandshakeInterceptor` | `MyHandShake` interceptor exists | ✅ | Validates `?token=` at upgrade. |
| 2 | Ack frame: `{ type: 'ack', alert_id, status }` | `AlertSocketHandler.handleTextMessage()` processes acks | ✅ | Matches. |
| 3 | Alert frame broadcast on new alert | `AlertSessionRegistry` broadcast | ⚠️ | Registry exists but depends on ingest pipeline (missing) to trigger alerts. |
| 4 | LLM frame broadcast on analysis completion | `AlertSessionRegistry` broadcast | ⚠️ | Same — depends on ingest pipeline. |
| 5 | Status frame broadcast on ack | Broadcasts via `AlertSessionRegistry` | ✅ | Matches — ack from both WS and REST triggers broadcast. |
| 6 | Rate limiting: 10 ack/min per session | Needs verification in `AlertSocketHandler` | ⚠️ | WS ack rate limiting may or may not be implemented in handler. |
| 7 | Error frame for invalid ack | Needs verification | ⚠️ | Spec says error frame for unknown `alert_id`. |
| 8 | `rateLimited` error frame | Needs verification | ⚠️ | Spec defines `{ type: 'error', message: 'rate limited', retry_after_seconds }`. |

---

## 8. Summary Counts

| Category | ✅ Match | ⚠️ Partial | ❌ Missing | 🆕 Extra |
|----------|---------|-----------|----------|---------|
| **Endpoint Routes** | 27 | 2 (setup path, ack path) | 5 (config-keys, llm-analyze, 3× ingest) | 1 (GET /api/setup) |
| **Auth/Roles** | 20 | 1 (WS permitAll + handshake) | 0 | 0 |
| **Config Properties** | 5 | 1 (frontend-base-url naming) | 3 (ingestion-key, silence-timeout, dual-port) | 0 |
| **Feature Areas** | — | 1 (reuse detection) | 6 (LLM, config-keys, ingest pipeline, watchdog, webhook delivery, dual-port) | 0 |
| **Response Shapes** | 5 | 4 (403/409 code fields) | 0 | 0 |

---

## 9. Priority Actions

> [!CAUTION]
> The **internal ingest pipeline** (`/internal/ingest/v1/*`) is the single largest gap. It connects:
> OTel Collector → Alert Rule Evaluation → Alert History Insert → WebSocket Broadcast → LLM Analysis → Webhook Delivery → SSE Push.
> Without it, alerting, live SSE data push, silence watchdog, and webhook delivery are all non-functional.

> [!IMPORTANT]
> The **route path differences** (`/api/setup` vs `/api/auth/setup` and `/api/alerts/ack/{id}` vs `/api/alerts/{id}`) will break any frontend built against the spec.

> [!NOTE]
> The `vigil.ingestion-key` and `vigil.silence-timeout-seconds` config properties are absent from `VigilProperties`. The property `vigil.front-end-url` exists but is named differently from the spec's `vigil.frontend-base-url`.
