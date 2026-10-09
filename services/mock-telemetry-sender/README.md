# Mock telemetry sender

Runs a plain Flask server and side-loads the OpenTelemetry SDK with `opentelemetry-instrument`. A background client calls the server repeatedly, producing HTTP logs, metrics, and traces. All OpenTelemetry configuration is supplied through `OTEL_*` environment variables in Compose.

```sh
docker compose --profile mock-telemetry-sender up -d mock-telemetry-sender
```

The sender is isolated from the collector and exports through Caddy at `https://$VIGIL_DOMAIN/otlp`. Normal `docker compose up` does not start it.

Stop it with:

```sh
docker compose --profile mock-telemetry-sender down
```
