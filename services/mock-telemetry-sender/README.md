# Mock telemetry sender

Runs a plain Flask server and side-loads the OpenTelemetry SDK with `opentelemetry-instrument`. A background client calls the server repeatedly, producing HTTP logs, metrics, and traces. All OpenTelemetry configuration is supplied through `OTEL_*` environment variables in Compose.

From the repository root, launch the non-AI stack and host-network sender:

```sh
python services/mock-telemetry-sender/start-mock-telemetry.py
```

The launcher checks images for the sender and the complete non-AI dependency chain before starting anything. If images are missing, it prints targeted build and pull commands to run from the repository root. It never builds or pulls images itself. It starts the sender with the host networking already declared in Compose. The sender exports through Caddy at `https://localhost/otlp`, exercising VIGIL's permanent localhost certificate. It does not modify `.env`, build images, or start AI services. Python 2.7 or Python 3, host networking, and existing stack images are required.

Normal `docker compose up` does not start the sender because it remains behind the `mock-telemetry-sender` profile.

Stop it with:

```sh
docker compose --profile mock-telemetry-sender stop mock-telemetry-sender
```

## Local HTTPS certificate — development convenience only

For ease of development, Compose mounts the public-only `caddy_public_ca` volume read-only into the mock sender. `OTEL_EXPORTER_OTLP_CERTIFICATE=/etc/vigil/ca/root.crt` tells the SDK to trust that public CA. The sender still runs as non-root without an entrypoint wrapper, and no installation-specific certificate is baked into the image.

**This is not the intended setup for real users' telemetry producers.** They should obtain the public CA through Vigil's onboarding flow and place or mount the certificate into their own application's environment. They should not access Vigil's internal volumes. Never share Caddy's private signing keys or mount its private `caddy_data` volume into a producer.

Start Caddy first so it can generate and publish its CA. If the sender starts before the public file exists, exports may fail until it becomes available. The public CA is exported once per reverse-proxy startup; it is not continuously synchronized. Deliberate CA replacement requires an explicit export and a trust update for affected producers, including restarting runtimes that load trust only at startup.

For publicly trusted HTTPS, omit `OTEL_EXPORTER_OTLP_CERTIFICATE`; no custom CA is required. Production addresses must be added and verified through VIGIL's address configuration flow.
