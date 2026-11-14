ui = false

# Demonstration only: mlock is disabled. Production must prevent swapping secret memory.
disable_mlock = true

# Single-node project storage. Vault encrypts data before it reaches this backend.
storage "file" {
  path = "/vault/file"
}

# Vault is isolated on a Docker-internal network and is NOT published to the host.
# The project subject permits unencrypted connections inside the backend deployment.
listener "tcp" {
  address                  = "0.0.0.0:8200"
  tls_disable              = true
  redact_addresses         = true
  redact_cluster_name      = true
  redact_version           = true
}

api_addr = "http://vault:8200"
