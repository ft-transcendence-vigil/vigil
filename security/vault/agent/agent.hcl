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
# Spring Boot configtree makes JWT_SECRET available to ${JWT_SECRET} placeholder.
template {
  contents = "{{ with secret \"secret/data/ft_transcendence/backend\" }}{{ .Data.data.JWT_SECRET }}{{ end }}"
  destination = "/run/secrets/JWT_SECRET"
  perms = "0400"
  error_on_missing_key = true
}
