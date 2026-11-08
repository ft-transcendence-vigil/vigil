# API administration
Run from the repository root while `vigil-api` is running:

```sh
services/api/reset-password user@example.com
services/api/delete-all-accounts
services/api/restore-api-user
```

Each command supports `--help` and `-h`. The scripts execute the Java client inside the API container.

## Authentication

The API writes its current configured or generated API key to `/var/lib/vigil/admin/api-key` at startup. Docker Compose stores this file in the `api_admin_credentials` volume, mounted only by `api`. The CLI reads the same file automatically; a human admin account is not required.

The directory is owner-only (`0700`), the file is owner-only (`0600`), and updates are atomic. Treat access to this volume or the container as administrator access. `VIGIL_API_KEY_FILE` specifies the file path for both processes. Each startup publishes the API's actual key; the file does not change the API's existing key-generation behavior.

## Account recovery

The CLI first calls `GET /api/users` with the key. If authentication returns `401` or `403`, it checks only `mustbe@api.email` in the database using the container's existing `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD`.

If that service account is missing or no longer an admin, the CLI explains its purpose and asks `[y/N]` before creating it or restoring its admin role. Recovery uses a transaction and is restricted to that fixed account. An existing ID and password hash are preserved; a new account receives a random discarded BCrypt password. The API key is not changed. After recovery, the CLI verifies API-key access again before continuing.

If the account is already an admin, authentication failure is reported as a possible key or URL mismatch rather than changing the database. Connection failures and other HTTP errors do not trigger recovery. Declining confirmation leaves the account unchanged and cancels the command.

## Commands

- **`reset-password <email>`** prompts for a hidden password and confirmation, then uses the existing password-update endpoint. A missing target is reported before password entry. Passwords require at least eight characters, uppercase, lowercase, a digit, one of `@#$%^&+=!`, and at most 72 UTF-8 bytes. Existing sessions are not revoked by that endpoint.
- **`delete-all-accounts`** requires typing `DELETE ALL HUMAN ACCOUNTS`. It preserves the API-key account and deletes the initial snapshot of human accounts through the existing delete endpoint. Requests commit separately; failure can leave partial completion. The CLI counts all HTTP requests (including the initial users GET and recovery verification) against the shared `ApiRateLimitPolicy` budget and waits a full refill period before sending another batch. Large deletions therefore pause periodically. The counter starts fresh for each CLI invocation, not for each server window. Requests from a previous invocation or other clients sharing the same IP can still exhaust the server budget; a 429 stops the command without retrying.
- **`restore-api-user`** verifies the API-key account and offers the recovery described above if necessary.

Only fixed-account recovery accesses the database directly. Normal account operations use the existing HTTP endpoints. Requests have a 30-second timeout and are not automatically retried; inspect the current state after an uncertain failure.

## Deployment

Rebuild and recreate the API container to install the CLI and mount its credential volume:

```sh
docker compose up -d --build api
```

The default API address is `http://localhost:8080` inside the container. The client honors `SERVER_PORT`, `SERVER_SERVLET_CONTEXT_PATH` and `SERVER_SSL_ENABLED`. `VIGIL_API_URL` can select another trusted origin. Remote origins require HTTPS; plain HTTP is restricted to loopback. HTTPS validates certificates and hostnames using Java trust or the PEM certificates in `VIGIL_TLS_CA_PATH`.

## Tests

The tests require JDK 21 and use a mock HTTP server, temporary credential files and an in-memory H2 database:

```sh
# Inside services/api
./mvnw -Dtest=ApiAdminCliTest,ApiAccountRecoveryTest,ApiKeyFileTest,RateLimiterTest test
```
