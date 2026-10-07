# Telemetry Collector

## Temporary ingestion-key configuration

The Collector currently reads `VIGIL_INGESTION_KEY` directly from its environment. This is temporary while waiting for the backend implementation that generates the ingestion key and writes it to a file shared with the Collector. Once that backend work is available, replace the environment-backed bearer token with the shared-file configuration.
