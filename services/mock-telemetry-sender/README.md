# Mock telemetry sender

Continuously emits logs, metrics, and traces through the official OpenTelemetry Python SDK.

```sh
docker compose --profile mock-telemetry-sender up -d --build mock-telemetry-sender
```

Stop it with `docker compose --profile mock-telemetry-sender down`. Normal `docker compose up` does not start it.
