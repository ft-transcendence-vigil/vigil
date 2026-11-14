pid_file = "/tmp/vault-agent.pid"
vault { address = "http://vault:8200" }
auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path = "/vault/credentials/role_id"
      secret_id_file_path = "/vault/credentials/secret_id"
      remove_secret_id_file_after_reading = false
    }
  }
}
template_config { static_secret_render_interval = "5m" }
template {
  contents = <<EOT
{{ with secret "secret/data/ft_transcendence/collector" }}{{ .Data.data.CLICKHOUSE_PASSWORD }}{{ end }}
EOT
  destination = "/run/secrets/CLICKHOUSE_PASSWORD"
  perms = "0444"
  error_on_missing_key = true
}
template {
  contents = <<EOT
{{ with secret "secret/data/ft_transcendence/collector" }}{{ .Data.data.VIGIL_INGESTION_KEY }}{{ end }}
EOT
  destination = "/run/secrets/VIGIL_INGESTION_KEY"
  perms = "0444"
  error_on_missing_key = true
}
template {
  source = "/vault/agent/collector-config.tpl"
  destination = "/run/secrets/collector-config.yaml"
  perms = "0444"
  error_on_missing_key = true
}
