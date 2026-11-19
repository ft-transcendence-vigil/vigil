*This project has been created as part of the 42 curriculum by mboutahir, jhamdaou, TODO_reda_login, TODO_elamrani_login, TODO_ismail_login.*

# Vigil

## Description

**Vigil** is a self-hosted observability platform. Any application ("a service") sends its **logs, metrics and traces** to Vigil using the OpenTelemetry standard. Vigil stores them, shows them live in a web dashboard, evaluates **alert rules** on them and, when a rule fires, notifies every connected user in real time and asks a **local LLM** to explain the alert in plain English. Users can then ask the AI follow-up questions about that alert.

The goal is a small, private alternative to tools like Grafana or Datadog: one `docker compose` command gives a team a secured place to watch their services, get paged, and understand incidents faster, without sending their telemetry to a third party.

### Key features

- **Service onboarding wizard:** choose a language, get the OpenTelemetry setup, the ingestion key and the CA certificate, then watch the first telemetry arrive live.
- **Telemetry ingestion** over OTLP/HTTP through a custom-built OpenTelemetry Collector with deduplication and a storage confirmation step.
- **Logs, Metrics and Traces pages** with live streaming, filters, pagination and CSV export, plus full-text search and sorting on logs.
- **Overview dashboard** with KPIs, interactive charts, custom date ranges, live mode and a PDF report export.
- **Alert rules** on any signal (count, average, min, max, sum, latest, p50, p95, p99 over a time window) plus automatic **silence alerts** when a service stops sending.
- **Real-time alerts** over WebSocket: toast, notification bell with per-user read state, acknowledge and resolve.
- **AI analysis** of every alert, streamed from a local model, and **Ask AI** follow-up questions with conversation history.
- **Users and roles:** admin and viewer, account settings, active sessions with remote logout.
- **Webhooks** to forward alerts to other tools.
- **Security:** HTTPS everywhere, a hardened WAF (ModSecurity + OWASP CRS) in front of the API, all secrets in HashiCorp Vault.
- **Installable PWA** with an offline page.
- **Privacy Policy and Terms of Service** at `/legal`, linked from the login page, the setup page and the sidebar.

## Instructions

### Prerequisites

| Tool | Version |
|---|---|
| Docker Engine | 24 or newer |
| Docker Compose | v2 (`docker compose`, not `docker-compose`) |
| Google Chrome | latest stable |
| Free RAM | about 6 GB (the LLM runs on the CPU) |
| Free disk | about 5 GB for images, the model and data |

No local Java, Node or Python is needed: everything is built inside the containers.

### 1. Configure the environment

```sh
cp .env.example .env
```

Edit `.env` and replace every `PassWord42!` with a different strong value. `JWT_SECRET` must be a long random string, for example the output of `openssl rand -base64 48`.

Pick the HTTPS port and make the frontend URL match it, otherwise the browser's origin won't match the one the API allows and the live alerts WebSocket is refused:

```sh
HTTPS_PORT=8443
VIGIL_FRONTEND_BASE_URL=https://localhost:8443
```

`.env` is ignored by Git. On first start, Vault imports these values and from then on every service reads its secrets from Vault, not from the environment.

### 2. Start everything

```sh
docker compose up -d --build
```

The first start takes several minutes: images are built, Vault is initialized and unsealed, the databases are created, and the model (`qwen2.5:0.5b`) is downloaded. Check progress with:

```sh
docker compose ps
```

All services should be `running` or `healthy`. The one-shot jobs `clickhouse-init` and `ollama-model-init` exit with code 0, which is expected.

### 3. Trust the local certificate authority

Caddy issues the `localhost` certificate from its own local CA. Export it:

```sh
docker cp vigil-reverse-proxy:/public-ca/root.crt ./vigil-ca.crt
```

Then trust it. On macOS:

```sh
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain vigil-ca.crt
```

On Linux, in Chrome, open `chrome://settings/certificates`, go to **Authorities**, import `vigil-ca.crt` and tick "Trust this certificate for identifying websites". Restart Chrome.

Without this step Chrome shows a certificate warning and the service worker cannot register.

### 4. Use it

1. Open `https://localhost:8443`.
2. The first visit opens **Setup**: create the first account, which becomes the administrator.
3. Go to **Add service** and follow the wizard to connect a service.
4. To get demo data without your own service, start the bundled mock sender:

```sh
docker compose --profile mock-telemetry-sender up -d mock-telemetry-sender
```

5. In **Alert rules**, create a rule, for example service `checkout-api`, signal `logs`, metric `total_count`, window `300` s, threshold `1`. Within seconds an alert appears, and the AI analysis follows a few seconds later.

### Stop

```sh
docker compose down
```

Data is kept in Docker volumes. `docker compose down -v` deletes all data **and** the Vault keys; only use it to start completely from scratch.

## Team Information

| Member | Login | Role(s) | Responsibilities |
|---|---|---|---|
| Mohammed Boutahir | mboutahir | Project Manager, Developer | Organizes meetings and planning, tracks progress and deadlines, keeps the team in sync and handles blockers. LLM microservice (Python, FastAPI, Ollama): prompts, context selection, streaming, error handling, rate limiting. Traces and Metrics pages in the frontend. |
| Mohamed Reda Daghouj | TODO | Developer | Frontend (`services/web`): application structure, Overview dashboard, Logs and Alerts pages, design system, PWA, legal pages. |
| Mohamed El Amrani | TODO | Technical Lead / Architect, Developer | Defines the architecture and technology choices, reviews critical changes and keeps code quality consistent. Backend API (`services/api`): authentication, users and roles, alert rules and evaluation, WebSocket and SSE, telemetry endpoints, LLM client. |
| Ismail El Moufid | TODO | Product Owner, Developer | Defines the product vision, maintains and prioritizes the backlog, validates finished work and presents the product to evaluators. Infrastructure: Docker Compose, Caddy and TLS control, telemetry collector and its custom exporter, mock sender, full-stack tests. |
| Jihad Hamdaoui | jhamdaou | Developer | Cybersecurity: WAF (nginx + ModSecurity + OWASP CRS) and HashiCorp Vault secret management. |

Required roles: **Product Owner:** Ismail El Moufid. **Project Manager / Scrum Master:** Mohammed Boutahir. **Technical Lead / Architect:** Mohamed El Amrani. All five members are **Developers**: they write, test, review and document their own features.

## Project Management

- **Work split:** the project was divided by service: frontend, backend API, LLM service, ingestion and infrastructure, security. Each member owns a service and its interface with the others. The interfaces (for example the JSON contract between the API and the LLM service) were agreed first so members could work in parallel.
- **Git workflow:** one branch per feature or fix (`feat/...`, `fix/...`, `docs/...`), merged into `develop` through GitHub pull requests reviewed by another member. Commit messages follow the Conventional Commits style (`feat(llm): ...`, `fix(waf): ...`).
- **Meetings:** a weekly meeting to review progress, update the task list, plan the next week's tasks and resolve blockers.
- **Task tracking:** Discord, in a dedicated tasks channel. Each task was posted with its owner, its status moved through To do, In progress, Review and Done, and the list was reviewed at every meeting.
- **Communication:** Discord, with a team server for daily messages, quick calls when integrating two services, and sharing pull request links for review.

## Technical Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19, TypeScript, Vite | Component model and ecosystem; TypeScript catches errors at build time |
| Styling | Tailwind CSS 4 with our own `--vigil-*` design tokens | One palette drives the whole theme |
| Frontend data | TanStack Query, axios, recharts, @react-pdf/renderer | Caching and loading states; charts; PDF reports |
| Backend | Spring Boot 4 (Java 21), Spring Security, Spring Data JPA (Hibernate) | Mature security, validation, WebSocket and ORM support |
| LLM service | Python 3.13, FastAPI, pydantic, httpx | Native async streaming, strict validation, Python is the AI ecosystem |
| LLM runtime | Ollama with `qwen2.5:0.5b` | Runs locally: free, no API key, and telemetry never leaves the machine |
| Ingestion | Custom OpenTelemetry Collector (built with OCB) + our Go exporter | Standard OTLP for any language, with our own storage and notification logic |
| Edge | Caddy | Automatic HTTPS (local CA or Let's Encrypt), serves the frontend |
| WAF | nginx + ModSecurity v3 + OWASP CRS 4 | Blocks attacks before they reach the API |
| Secrets | HashiCorp Vault with AppRole agents | Secrets encrypted at rest, each service only reads its own |
| Deployment | Docker Compose, distroless and alpine images, non-root users | One command; small attack surface |

### Databases

- **PostgreSQL 17** for application data: users, sessions, alert rules, alert history, notifications, webhooks. This data is relational and needs foreign keys and transactions (for example optimistic locking when two users acknowledge the same alert).
- **ClickHouse** for telemetry. Logs, metrics and traces are large, append-only time series. ClickHouse is a columnar database: aggregations such as `count`, `avg` or `quantile(0.95)` over a time window are very fast, data is compressed, and a TTL deletes rows after 30 days automatically.

## Database Schema

### PostgreSQL (managed by JPA/Hibernate)

```
users ─────────┬──────────────< sessions ──────< refresh_tokens
 (id, email,   │                (id, user_id,     (id, user_id, session_id,
  password_hash│                 user_agent,       token_hash, issued_at,
  role)        │                 ip_address,       expires_at, superseded,
               │                 last_used_at,     revoked)
               │                 revoked)
               │
               ├──────────────< alert_notification >──────────── alert_history
               │                 (user_id, alert_history_id,       (id, rule_id → alert_rules, user_id,
               │                  seen, seen_at)                     service, triggered_at, signal_type,
               │                 composite primary key               metric_name, aggregation, window_seconds,
               │                                                     threshold, severity, llm_analysis,
               └──────────────────────────────────────────────<      status, acked_at/by, resolved_at/by,
                                                                     version)
alert_rules                                                         webhooks
 (id, service, signal_type, metric_name, aggregation,               (id, url unique)
  window_seconds, threshold, severity, enabled, is_default)
```

| Table | Key fields and types | Relations |
|---|---|---|
| `users` | `id` UUID PK, `email` varchar unique, `password_hash` varchar (BCrypt), `role` enum `ADMIN`/`VIEWER` | has many sessions, refresh tokens, notifications |
| `sessions` | `id` UUID PK, `user_agent`, `ip_address`, `last_used_at` timestamptz, `revoked` boolean | many-to-one `users` |
| `refresh_tokens` | `id` UUID PK, `token_hash` unique, `issued_at`, `expires_at` timestamptz, `superseded`, `revoked` boolean | many-to-one `users`, many-to-one `sessions` |
| `alert_rules` | `id` UUID PK, `service`, `signal_type` enum, `metric_name`, `aggregation`, `window_seconds` int, `threshold` double, `severity` enum, `enabled`, `is_default` boolean | has many `alert_history` |
| `alert_history` | `id` UUID PK, `version` bigint (optimistic lock), `service`, `triggered_at` timestamptz, `metric_name`, `threshold` double (null for silence alerts), `severity`, `llm_analysis` text, `status` enum `sent`/`acknowledged`/`resolved`, `acked_at`/`acked_by`, `resolved_at`/`resolved_by` | many-to-one `alert_rules` (null for silence alerts), many-to-one `users` |
| `alert_notification` | PK (`user_id`, `alert_history_id`), `seen` boolean, `seen_at` timestamptz | many-to-one `users`, many-to-one `alert_history`: the per-user read state of each alert |
| `webhooks` | `id` UUID PK, `url` unique | none |

### ClickHouse (created by `services/telemetry-db/clickhouse-init.sh`)

All three tables use the `MergeTree` engine, are partitioned by month and keep rows for 30 days (`TTL timestamp + INTERVAL 30 DAY DELETE`).

| Table | Columns | Sort key |
|---|---|---|
| `logs` | `service` String, `timestamp` DateTime64(3), `severity` String, `message` String, `attributes` Map(String, String) | `(service, timestamp)` |
| `metrics` | `service`, `timestamp`, `name`, `value` Nullable(Float64), `metric_type`, `unit`, `aggregation_temporality`, `is_monotonic`, `start_timestamp`, `series_id`, `histogram_sum`, `histogram_count`, `attributes` | `(service, name, timestamp)` |
| `traces` | `trace_id`, `span_id`, `parent_span_id`, `name`, `service`, `timestamp`, `duration_ms` UInt32, `status`, `attributes` | `(service, timestamp, trace_id, span_id)` |

Two restricted ClickHouse accounts enforce least privilege: `vigil_writer` (the collector) can insert and read, and `vigil_api` (the API) can only read.

## Features List

| Feature | Description | Member(s) |
|---|---|---|
| First-admin setup and login | Setup page creates the first admin; email + password login, BCrypt hashes, 15-minute JWT access token, rotating refresh token in an httpOnly cookie | El Amrani (API), Reda (UI) |
| Users and roles | Admin creates, edits and deletes users with role admin or viewer; the last admin can't be removed or demoted; views and actions depend on the role | El Amrani, Reda |
| Account settings and sessions | Change email or password; list active sessions with device info and revoke them | El Amrani, Reda |
| Service onboarding wizard | Per-language OpenTelemetry instructions, ingestion key, TLS address and CA download, live verification of the first telemetry | Reda, Ismail (TLS), El Amrani |
| Telemetry ingestion | OTLP/HTTP with bearer-token authentication, memory limiting, batching, deduplication, storage confirmation and callback to the API | Ismail |
| Logs page | Live stream, full-text search, severity filter, sorting, pagination, CSV export | Reda, El Amrani |
| Metrics page | Per-metric charts, filters, time series endpoint, live updates, CSV export | Mohammed, El Amrani |
| Traces page | Span list with status and duration, filters, live updates, CSV export | Mohammed, El Amrani |
| Overview dashboard | KPIs, request performance chart, services and alerts summary, date ranges, live mode, PDF report | Reda, El Amrani |
| Alert rules | Create, edit, enable and delete threshold rules on logs, metrics or traces | El Amrani, Reda |
| Alert evaluation | Rules evaluated in ClickHouse after each stored batch; silence alerts when a service stops sending | El Amrani |
| Real-time notifications | WebSocket push of alerts and AI results, toasts, notification bell with per-user read state, acknowledge and resolve | El Amrani, Reda |
| AI alert analysis | Automatic, streamed plain-English explanation of each alert from the surrounding telemetry | Mohammed (LLM service), El Amrani (API side), Reda (UI) |
| Ask AI | Follow-up questions about an alert, streamed, with conversation history and per-user rate limiting | Mohammed, El Amrani, Reda (UI) |
| Webhooks | Forward alerts to external URLs | El Amrani, Reda |
| HTTPS and TLS management | Caddy with a local CA or Let's Encrypt, configurable public address | Ismail |
| WAF | ModSecurity + OWASP CRS at paranoia level 2 in front of the API | Jihad |
| Secret management | Vault initialization, AppRole agents rendering each service's secrets | Jihad |
| PWA | Web manifest, service worker, offline page, installable | Reda |
| Legal pages | Privacy Policy and Terms of Service | Reda |

## Modules

Total claimed: **21 points** (14 required, the rest counts as bonus).

| # | Module | Type | Pts | Member(s) |
|---|---|---|---|---|
| 1 | Web: frameworks for frontend and backend | Major | 2 | Reda, El Amrani |
| 2 | Web: real-time features (WebSockets) | Major | 2 | El Amrani, Reda |
| 3 | Web: ORM | Minor | 1 | El Amrani |
| 4 | Web: custom design system | Minor | 1 | Reda |
| 5 | Web: advanced search | Minor | 1 | Reda, El Amrani |
| 6 | Web: PWA | Minor | 1 | Reda |
| 7 | User Management: advanced permissions system | Major | 2 | El Amrani, Reda |
| 8 | Artificial Intelligence: LLM system interface | Major | 2 | Mohammed |
| 9 | Cybersecurity: WAF/ModSecurity + HashiCorp Vault | Major | 2 | Jihad |
| 10 | DevOps: backend as microservices | Major | 2 | Ismail, El Amrani, Mohammed |
| 11 | Data and Analytics: advanced analytics dashboard | Major | 2 | Reda, El Amrani |
| 12 | Module of choice: custom telemetry ingestion pipeline | Major | 2 | Ismail |
| 13 | Web: support for additional browsers | Minor | 1 | Reda |
| | **Total** | | **21** | |

### 1. Frameworks for frontend and backend (Major)
- **Why:** a frontend framework and a backend framework give us routing, state, security and validation without reinventing them.
- **How:** React 19 + TypeScript in `services/web`; Spring Boot in `services/api`.

### 2. Real-time features (Major)
- **Why:** an alerting tool is useless if users have to refresh to see an incident.
- **How:** a WebSocket endpoint (`services/api/.../websocket/`) broadcasts new alerts, AI analysis results and notification updates to every connected user. The client (`useAlertsWebSocket.ts`) reconnects with backoff and refetches missed data after a reconnection. Server-Sent Events stream live logs, metrics and traces. The broadcast is per message to all open sessions, and the socket endpoint is rate limited.

### 3. ORM (Minor)
- **Why:** typed entities and relations instead of hand-written SQL for application data.
- **How:** JPA/Hibernate entities in `services/api/.../domain/entities` with `@ManyToOne` relations, a composite key for notifications, and `@Version` optimistic locking on alerts.

### 4. Custom design system (Minor)
- **Why:** a consistent look across a dense dashboard.
- **How:** a color palette as `--vigil-*` CSS tokens used by Tailwind, chosen fonts, Font Awesome icons, and reusable components in `services/web/src/components/shared` (Button, FormButton, FormInput, PasswordInput, Dropdown, SwitchButton, ConfirmDialog, SectionHeader, StateMessage, AskAIButton, Logo, AppToaster, and more).

### 5. Advanced search (Minor)
- **Why:** finding one log line in thousands is the core task of an observability tool.
- **How:** the Logs page combines full-text search on the message, service and severity filters, a time period, sorting and offset pagination. The Metrics and Traces pages add service and period filters with pagination. All of it runs in ClickHouse through the API.

### 6. PWA (Minor)
- **Why:** on-call engineers want the dashboard as an app on their machine.
- **How:** `manifest.webmanifest`, a service worker (`public/sw.js`) registered in production, and `offline.html` shown when the network is down.

### 7. Advanced permissions system (Major)
- **Why:** not everyone on a team should be able to change alert rules or manage users.
- **How:** two roles, `admin` and `viewer`. Admins have full user CRUD and role management. Viewers can read telemetry and alerts, acknowledge alerts and ask the AI, but can't manage rules, users, keys or webhooks. It is enforced on the API with `@PreAuthorize` on every endpoint, and in the UI with `PermissionRoute` and role-dependent views.

### 8. LLM system interface (Major)
- **Why:** an alert says *that* something is wrong; an engineer woken at night needs *what* and *where to look*.
- **How:** a separate FastAPI service (`services/llm`) talking to Ollama.
  - **Text generation from user input:** an automatic analysis of each alert, and answers to the user's typed questions in Ask AI.
  - **Streaming:** Ollama's NDJSON stream is turned into Server-Sent Events, re-streamed by the API and shown token by token in the UI.
  - **Error handling:** input validation (400), the first token is read before answering so Ollama failures return a clean 503, errors in the middle of a stream are sent as an `error` event, and every phase has a timeout.
  - **Rate limiting:** 5 questions per user per minute (429 with retry time) and a concurrency limit on the model (503 when busy).
  - The service also chooses the most relevant logs, traces and metrics so the prompt fits the model's context window.

### 9. WAF/ModSecurity + HashiCorp Vault (Major)
- **Why:** the API is exposed to the internet and handles credentials.
- **How:** nginx with ModSecurity v3 and OWASP CRS 4 in blocking mode, paranoia level 2, inbound anomaly threshold 5, with narrow exclusions for false positives. Vault is initialized and unsealed automatically, imports the initial secrets, and AppRole agents render each service's secrets (database passwords, JWT secret, ingestion key) into volumes only that service mounts.

### 10. Backend as microservices (Major)
- **Why:** each part has a different job, language and scaling profile.
- **How:**
  - `api`: business logic, auth, alerts (Java).
  - `llm`: AI only, stateless (Python).
  - `telemetry-collector`: ingestion only (Go).
  - `tls-control`: certificate configuration only (Go).
  - They communicate over REST and SSE with documented JSON contracts. The collector notifies the API through an internal REST callback that isn't reachable from outside.

### 11. Advanced analytics dashboard (Major)
- **Why:** trends matter more than single values when diagnosing a service.
- **How:** interactive line, area and bar charts (recharts), live updates, custom date ranges and filters, CSV export of logs, metrics and traces, and a PDF report of the Overview.

### 12. Module of choice: custom telemetry ingestion pipeline (Major)
- **Why we chose it:** Vigil needs to receive telemetry from any application in any language. Writing our own ingestion API would force every user to write Vigil-specific code. OpenTelemetry is the standard, but the stock OpenTelemetry Collector can only store data. It cannot tell Vigil that new data has arrived so alert rules run immediately.
- **What we built:** a custom collector distribution, compiled with the OpenTelemetry Collector Builder so it contains only the components we use: an OTLP receiver, the memory limiter and batch processors, and bearer-token authentication. It also contains our own exporter written in Go (`services/telemetry-collector/buildtime/exporter`). For every batch, the exporter:
  1. Maps OTLP logs, metrics (gauges, sums, histograms) and spans to our ClickHouse schema.
  2. Removes duplicates within a 10-minute window, so retried batches from the SDK aren't stored twice. Concurrent batches are handled safely with reservations.
  3. Inserts the rows with the restricted `vigil_writer` account.
  4. Confirms the rows are visible in ClickHouse before going on, so alert evaluation never runs on data that isn't readable yet.
  5. Calls the API's internal callback with each service's latest timestamp, retrying with backoff. The API then evaluates rules and resets silence timers.
- **Technical challenges:**
  - Getting reliable delivery between two systems that can fail independently.
  - Deduplicating without losing data when an insert fails.
  - Matching OpenTelemetry's metric types to a flat table.
  - Building a minimal, non-root collector image.
- **Value to the project:** zero-code onboarding for any OpenTelemetry-instrumented service, near-instant alerting, and no duplicate alerts.
- **Why it deserves Major status:** it is a separate service written in a different language that extends a large external framework through its plugin API. It has its own tests (`*_test.go`, plus an integration test with a mock backend), and the whole alerting pipeline depends on it.

### 13. Support for additional browsers (Minor)
- **Why:** an on-call engineer opens the dashboard in whatever browser they already use.
- **How:** besides Chrome, every feature was tested in Firefox and Safari: login and setup, the onboarding wizard, the Overview, Logs, Metrics and Traces pages, CSV and PDF export, live alerts over WebSocket, the notification bell, AI analysis and Ask AI streaming, and the settings pages. The UI and layout are the same in all three.
- **Browser-specific limitations:**
  - **Firefox** keeps its own certificate store. If it still warns about the certificate after the CA is trusted by the system, import `vigil-ca.crt` in Settings > Privacy & Security > Certificates > View Certificates > Authorities.
  - **Firefox** on desktop doesn't offer to install Vigil as an app, so the PWA install is only available in Chrome, Edge and Safari. Everything else works the same.
  - **Safari** uses the macOS keychain, so trusting the CA as shown in the Instructions is enough.

## Individual Contributions

### Mohammed Boutahir (mboutahir): Project Manager, Developer
- **As Project Manager:** organized team meetings and planning, tracked progress and deadlines, coordinated integration between services, and followed up on blockers.
- **What he built:**
  - The whole LLM service in `services/llm`: configuration, request schemas shared with the API, context selection (most severe and closest logs, error and slowest traces, nearest metric points), the prompts for alert analysis and Ask AI, the streaming Ollama client, SSE responses, and the rate and concurrency limiters.
  - The Metrics and Traces pages in the frontend.
- **Challenges:**
  - A 0.5B-parameter model refused valid questions when asked to classify and answer in one prompt. Few-shot examples in the prompt fixed it.
  - Returning a real 503 instead of an empty 200 when the model is down: the service reads the first token before starting the response.
  - Keeping the whole answer within the API's 30-second timeout on a CPU.

### Mohamed Reda Daghouj: Developer
- **What he built:** most of the frontend: the application structure and routing, auth and setup pages, the Overview dashboard and PDF report, the Logs and Alerts pages, the alert drawer and notification bell, the settings pages, the design system, the PWA, the legal pages, and testing in Firefox and Safari.
- **Challenges:** TODO (for example keeping live charts smooth while data streams in, and one shared color system across all pages).

### Mohamed El Amrani: Technical Lead / Architect, Developer
- **As Technical Lead:** defined the service architecture and the contracts between services, made the backend technology choices, and reviewed critical changes.
- **What he built:** the Spring Boot API: authentication with JWT and refresh tokens, sessions, users and roles, alert rules and their evaluation in ClickHouse, silence detection, alert history with acknowledgment, WebSocket and SSE, webhooks, telemetry query endpoints, and the client that calls the LLM service and re-streams its answers.
- **Challenges:** TODO (for example two users acknowledging the same alert at once, solved with optimistic locking, and re-streaming the LLM's SSE to the browser).

### Ismail El Moufid: Product Owner, Developer
- **As Product Owner:** defined the product vision, prioritized features, and validated finished work.
- **What he built:**
  - The Docker Compose deployment.
  - Caddy and the `tls-control` helper (local CA or Let's Encrypt, configurable public address).
  - The custom telemetry collector and its exporter.
  - The mock telemetry sender.
  - The full-stack and TLS test suites.
- **Challenges:** TODO (for example reliable delivery and deduplication between the collector, ClickHouse and the API).

### Jihad Hamdaoui (jhamdaou): Developer
- **What he built:** the WAF (nginx, ModSecurity and OWASP CRS configuration and exclusion rules) and the Vault setup: automatic initialization and unsealing, policies, AppRole agents and secret delivery to each service.
- **Challenges:** TODO (for example removing CRS false positives on JSON and AI chat requests without weakening the rules, and delivering secrets to services that are not on Vault's network).

## Resources

### Documentation
- OpenTelemetry: https://opentelemetry.io/docs/ and the Collector Builder: https://opentelemetry.io/docs/collector/custom-collector/
- ClickHouse: https://clickhouse.com/docs
- Spring Boot: https://docs.spring.io/spring-boot/ and Spring Security: https://docs.spring.io/spring-security/reference/
- React: https://react.dev, TanStack Query: https://tanstack.com/query, Tailwind CSS: https://tailwindcss.com/docs
- FastAPI: https://fastapi.tiangolo.com, pydantic: https://docs.pydantic.dev
- Ollama API: https://github.com/ollama/ollama/blob/main/docs/api.md
- Server-Sent Events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Caddy: https://caddyserver.com/docs/
- ModSecurity: https://github.com/owasp-modsecurity/ModSecurity and OWASP CRS: https://coreruleset.org/docs/
- HashiCorp Vault: https://developer.hashicorp.com/vault/docs
- Docker Compose: https://docs.docker.com/compose/

### How AI was used
AI assistants were used as helpers. Every change was reviewed, tested and understood by the member who owns that part before it was merged.

- **LLM service (Mohammed):** Claude was used to iterate on and test the prompts for the small local model, to review the streaming and error-handling code, and to debug WAF false positives on Ask AI requests.
- **Other members:** TODO, each member: which tool, for which tasks, in which part (for example generating boilerplate, explaining unfamiliar libraries, drafting the legal pages, debugging configuration).
- **Documentation:** this README was drafted with AI help from our own notes and code, then reviewed by the team.
