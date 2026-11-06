# Security Design — Vigil

## 1. Web Application Firewall

API traffic follows this path:

```text
Client
  |
  v
Caddy (HTTPS)
  |
  v
Nginx + ModSecurity + OWASP CRS
  |
  v
Spring Boot API
```

Caddy remains the public HTTPS entry point. The WAF inspects `/api/*` traffic before forwarding permitted requests to the API.

Frontend and OTLP routes continue to be handled separately by Caddy.

The WAF uses OWASP CRS with blocking enabled, paranoia level 2, and an inbound anomaly threshold of 5.

## 2. HashiCorp Vault

Vault provides centralized storage for application secrets.

```text
HashiCorp Vault
       |
       +-- Vault Agent (API)
       |
       +-- Vault Agent (PostgreSQL)
       |
       +-- Vault Agent (ClickHouse)
       |
       +-- Vault Agent (Collector)
                |
                v
       Docker secret volumes
                |
                v
       Application services
```

Vault Agents authenticate through AppRole and render secrets into dedicated Docker volumes.

Applications read these generated files rather than retrieving secrets directly from Vault.

The API uses Spring Boot `configtree`, PostgreSQL uses `POSTGRES_PASSWORD_FILE`, and ClickHouse and the telemetry collector use secret-aware startup configurations.

Vault operates on a private Docker network without a publicly exposed Vault port.

## 3. Initialization and Persistence

On first deployment, the Vault initialization service imports six initial secrets from the root `.env` file.

Vault data and initialization information are stored in persistent Docker volumes. Subsequent restarts reuse the existing Vault data.

The demonstration setup automatically initializes and unseals Vault.

## 4. Validation

Fresh deployment and merged single-file Docker Compose startup were tested successfully.

Verification included healthy Vault Agents and databases, successful API routing, and SQL injection blocking by the WAF.

## 5. Security Limitations

This implementation is intended for coursework and demonstration.

Vault uses a single node, file storage, internal HTTP communication, and locally stored initialization credentials. Production deployment would require stronger key protection, TLS, access-control review, and additional security testing.