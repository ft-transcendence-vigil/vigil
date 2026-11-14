#!/usr/bin/env python3
"""Isolated Docker checks; never reads .env, runs Compose, or touches deployment volumes.

Requires local hashicorp/vault:1.17, PyYAML, and optionally --api-image plus Java 21.
--collector-image also requires local python:3.13-alpine for isolated HTTP probes/callbacks.
All containers/networks/volumes are uniquely named and removed in finally.
"""
import argparse
import json
import pathlib
import subprocess
import tempfile
import time
import uuid
import zipfile

import yaml

VAULT = pathlib.Path(__file__).resolve().parents[1]
REPO = VAULT.parents[1]
IMAGE = "hashicorp/vault:1.17"
ROLES = ("api", "postgres", "clickhouse", "collector")
SECRETS = {
    "JWT_SECRET": "synthetic-jwt-secret-for-review-only",
    "POSTGRES_PASSWORD": "synthetic-postgres-password",
    "CLICKHOUSE_PASSWORD": "synthetic-admin-password",
    "CLICKHOUSE_API_PASSWORD": "synthetic-api-password",
    "CLICKHOUSE_WRITER_PASSWORD": 'writer: # "quote" \\ ${env:DO_NOT_EXPAND} $cash',
    "VIGIL_INGESTION_KEY": "001234567890",
}


def docker(*args, check=True, input=None):
    result = subprocess.run(["docker", *args], input=input, text=True, capture_output=True, timeout=40, check=False)
    if check and result.returncode:
        # Do not include command arguments: some invocations contain synthetic tokens.
        raise RuntimeError(f"docker {args[0]} failed: {result.stderr}")
    return result


def wait_for(predicate, message):
    until = time.monotonic() + 60
    while time.monotonic() < until:
        if predicate():
            return
        time.sleep(1)
    raise AssertionError(message() if callable(message) else message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-image", help="Existing local API image, for Spring configtree checks")
    parser.add_argument("--collector-image", help="Existing local nonroot collector image, for config validation and OTLP auth checks")
    parser.add_argument("--databases", action="store_true", help="Also test local postgres:17-alpine and ClickHouse 26.8.6.5 images")
    args = parser.parse_args()
    prefix = "vigil-vault-check-" + uuid.uuid4().hex[:10]
    network = prefix + "-net"
    containers, volumes = [], []
    with tempfile.TemporaryDirectory(prefix=prefix) as directory:
        temp = pathlib.Path(directory)
        env_file = temp / "application.env"
        env_file.write_text("".join(f"{key}='{value}'\n" for key, value in SECRETS.items()))

        def volume(name):
            name = prefix + "-" + name
            docker("volume", "create", name)
            volumes.append(name)
            return name

        def run(name, *options, command=(), image=IMAGE):
            name = prefix + "-" + name
            containers.append(name)
            docker("run", "-d", "--pull=never", "--name", name, "--network", network, *options, image, *command)
            return name

        def logs(name):
            result = docker("logs", name, check=False)
            return result.stdout + result.stderr

        try:
            empty_secrets = temp / "empty-secrets"
            empty_secrets.mkdir()
            sentinel = temp / "must-not-run.sh"
            sentinel.write_text("#!/bin/sh\necho unexpected-downstream-execution\nexit 0\n")
            sentinel.chmod(0o755)
            for state in ("missing", "empty"):
                if state == "empty":
                    for filename in ("CLICKHOUSE_PASSWORD", "CLICKHOUSE_API_PASSWORD", "CLICKHOUSE_WRITER_PASSWORD"):
                        (empty_secrets / filename).touch()
                for script in ("clickhouse-start.sh", "clickhouse-init.sh", "clickhouse-health.sh"):
                    result = docker("run", "--rm", "--pull=never", "--network", "none", "--entrypoint", "/bin/sh",
                                    "-v", f"{VAULT / 'scripts'}:/scripts:ro", "-v", f"{empty_secrets}:/run/secrets:ro",
                                    "-v", f"{sentinel}:/entrypoint.sh:ro", "-v", f"{sentinel}:/clickhouse-init.sh:ro",
                                    IMAGE, "/scripts/" + script, check=False)
                    assert result.returncode != 0 and "unexpected-downstream-execution" not in result.stdout, f"{script} accepted {state} secrets"
            print("PASS: ClickHouse wrappers reject missing/empty secrets before executing downstream commands")
            docker("network", "create", "--internal", network)
            data, init = volume("data"), volume("init")
            credentials = {role: volume(role + "-credentials") for role in ROLES}
            outputs = {role: volume(role + "-secrets") for role in ROLES}
            server = run("server", "--network-alias", "vault", "-e", "SKIP_SETCAP=true",
                         "-v", f"{data}:/vault/file", "-v", f"{VAULT / 'config'}:/vault/config:ro",
                         command=("server",))
            mounts = ["-v", f"{init}:/vault/init", "-v", f"{env_file}:/vault/bootstrap/application.env:ro",
                      "-v", f"{VAULT / 'scripts'}:/vault/scripts:ro", "-v", f"{VAULT / 'policies'}:/vault/policies:ro"]
            for role in ROLES:
                mounts += ["-v", f"{credentials[role]}:/vault/credentials/{role}"]
            bootstrap = run("bootstrap", "--user", "0:0", "--entrypoint", "/bin/sh",
                            "-e", "VAULT_ADDR=http://vault:8200", *mounts,
                            command=("/vault/scripts/init-vault.sh",))
            wait_for(lambda: "Bootstrap complete" in logs(bootstrap), lambda: "Bootstrap did not complete:\n" + logs(bootstrap) + "\nServer:\n" + logs(server))
            processes = [line.split() for line in docker("top", server, "-eo", "uid,pid,comm").stdout.splitlines()[1:]]
            assert any(uid != "0" and command == "vault" for uid, pid, command in processes), "Official server entrypoint must drop root privileges"
            print("PASS: fresh bootstrap and nonroot Vault server startup")

            # Root credentials are read only from this isolated test's init volume.
            root = docker("exec", bootstrap, "awk", "/Initial Root Token:/ {print $4}", "/vault/init/bootstrap.txt").stdout.strip()

            def vault(*command, check=True):
                return docker("exec", "-e", "VAULT_ADDR=http://vault:8200", "-e", "VAULT_TOKEN=" + root,
                              bootstrap, "vault", *command, check=check)

            def read(role):
                return json.loads(vault("kv", "get", "-format=json", "secret/ft_transcendence/" + role).stdout)["data"]["data"]

            original = {role: read(role) for role in ROLES}
            agents = {}
            for role in ROLES:
                agents[role] = run("agent-" + role, "--user", "0:0", "--entrypoint", "/bin/sh", "-e", "VAULT_ROLE=" + role,
                                   "-v", f"{VAULT / 'scripts'}:/vault/scripts:ro", "-v", f"{VAULT / 'agent'}:/vault/agent:ro",
                                   "-v", f"{credentials[role]}:/vault/credentials:ro", "-v", f"{outputs[role]}:/run/secrets",
                                   command=("/vault/scripts/start-agent.sh",))
            expected = {
                "api": ("JWT_SECRET", "SPRING_DATASOURCE_PASSWORD", "CLICKHOUSE_PASSWORD", "VIGIL_INGESTION_KEY"),
                "postgres": ("POSTGRES_PASSWORD",),
                "clickhouse": ("CLICKHOUSE_PASSWORD", "CLICKHOUSE_API_PASSWORD", "CLICKHOUSE_WRITER_PASSWORD"),
                "collector": ("CLICKHOUSE_PASSWORD", "VIGIL_INGESTION_KEY", "collector-config.yaml"),
            }
            for role, files in expected.items():
                for filename in files:
                    wait_for(lambda r=role, f=filename: docker("exec", agents[r], "test", "-s", "/run/secrets/" + f, check=False).returncode == 0,
                             f"Missing {role}/{filename}")
            print("PASS: all four AppRoles authenticate and render required files")
            for role in ROLES:
                login = docker("exec", agents[role], "sh", "-c",
                               'VAULT_ADDR=http://vault:8200 vault write -format=json auth/approle/login role_id=@/vault/credentials/role_id secret_id=@/vault/credentials/secret_id')
                token = json.loads(login.stdout)["auth"]["client_token"]
                for target in ROLES:
                    caps = docker("exec", "-e", "VAULT_ADDR=http://vault:8200", "-e", "VAULT_TOKEN=" + token,
                                  agents[role], "vault", "token", "capabilities", "secret/data/ft_transcendence/" + target).stdout.strip()
                    assert caps == ("read" if role == target else "deny"), f"Unexpected {role} access to {target}"
            print("PASS: each AppRole can read only its own role document")

            # A synthetic nonroot UID must be able to traverse the mount and read the rendered files.
            result = docker("exec", "--user", "65532:65532", agents["collector"], "cat", "/run/secrets/collector-config.yaml")
            rendered = yaml.safe_load(result.stdout)
            assert rendered["exporters"]["vigilclickhouse"]["clickhouse_password"] == SECRETS["CLICKHOUSE_WRITER_PASSWORD"].replace("$", "$$"), "Synthetic rendered password: " + repr(rendered["exporters"]["vigilclickhouse"]["clickhouse_password"])
            assert rendered["extensions"]["bearertokenauth"].pop("filename") == "/run/secrets/VIGIL_INGESTION_KEY"
            rendered["extensions"]["bearertokenauth"]["token"] = "${env:VIGIL_INGESTION_KEY}"
            rendered["exporters"]["vigilclickhouse"]["clickhouse_password"] = "${env:CLICKHOUSE_PASSWORD}"
            baseline = yaml.safe_load((REPO / "services/telemetry-collector/runtime/config.yaml").read_text())
            assert rendered == baseline, "Vault collector template drifted from runtime config"
            print("PASS: nonroot secret access, YAML quoting/dollar escaping, collector config parity")

            if args.api_image:
                api_container = docker("create", args.api_image).stdout.strip()
                containers.append(api_container)
                docker("cp", api_container + ":/app/api.jar", str(temp / "api.jar"))
                with zipfile.ZipFile(temp / "api.jar") as archive:
                    libraries = [name for name in archive.namelist() if name.startswith("BOOT-INF/lib/") and name.endswith(".jar")]
                    for name in libraries:
                        archive.extract(name, temp)
                tree = temp / "api-secrets"
                tree.mkdir()
                for name in expected["api"]:
                    (tree / name).write_text(docker("exec", agents["api"], "cat", "/run/secrets/" + name).stdout)
                subprocess.run(["java", "--class-path", ":".join(str(temp / name) for name in libraries),
                                str(VAULT / "tests/ConfigTreeCheck.java"), str(tree),
                                str(REPO / "services/api/src/main/resources/application.properties")], check=True, timeout=40)

            if args.databases:
                postgres = run("postgres", "-e", "POSTGRES_USER=review", "-e", "POSTGRES_DB=review",
                               "-e", "POSTGRES_PASSWORD_FILE=/run/secrets/POSTGRES_PASSWORD",
                               "-v", f"{volume('postgres-data')}:/var/lib/postgresql/data",
                               "-v", f"{outputs['postgres']}:/run/secrets:ro", image="postgres:17-alpine")

                postgres_ip = docker("inspect", "--format", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", postgres).stdout.strip()

                def psql(query, password=SECRETS["POSTGRES_PASSWORD"], check=True):
                    # Loopback may match initdb's trust rule; use the container IP to test password auth.
                    return docker("exec", "-e", "PGPASSWORD=" + password, postgres, "psql", "-h", postgres_ip,
                                  "-U", "review", "-d", "review", "-wAt", "-c", query, check=check)

                wait_for(lambda: psql("SELECT 1", check=False).returncode == 0, "PostgreSQL startup failed")
                psql("CREATE TABLE vault_review (id integer); INSERT INTO vault_review VALUES (1)")
                docker("exec", agents["postgres"], "sh", "-c", "printf %s synthetic-changed-password > /run/secrets/POSTGRES_PASSWORD")
                docker("stop", "-t", "3", postgres)
                docker("start", postgres)
                wait_for(lambda: psql("SELECT 1", check=False).returncode == 0, "Persisted PostgreSQL did not restart")
                assert psql("SELECT count(*) FROM vault_review").stdout.strip() == "1"
                assert psql("SELECT 1", password="synthetic-changed-password", check=False).returncode != 0
                docker("exec", agents["postgres"], "sh", "-c", "printf %s " + SECRETS["POSTGRES_PASSWORD"] + " > /run/secrets/POSTGRES_PASSWORD")
                print("PASS: persisted PostgreSQL retains data/password; changing _FILE does not rotate its role")

                clickhouse_image = "clickhouse/clickhouse-server:26.8.6.5"
                clickhouse = run("clickhouse", "--network-alias", "clickhouse", "--entrypoint", "/bin/sh",
                                 "-e", "CLICKHOUSE_USER=review", "-e", "CLICKHOUSE_DB=review", "-e", "CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1",
                                 "-v", f"{volume('clickhouse-data')}:/var/lib/clickhouse",
                                 "-v", f"{outputs['clickhouse']}:/run/secrets:ro", "-v", f"{VAULT / 'scripts'}:/security-entrypoint:ro",
                                 command=("/security-entrypoint/clickhouse-start.sh",), image=clickhouse_image)

                def ch(query, user="review", password=SECRETS["CLICKHOUSE_PASSWORD"], check=True):
                    return docker("exec", clickhouse, "clickhouse-client", "--host", "127.0.0.1", "--user", user,
                                  "--password", password, "--database", "review", "--query", query, check=check)

                wait_for(lambda: docker("exec", clickhouse, "/security-entrypoint/clickhouse-health.sh", check=False).returncode == 0,
                         lambda: "ClickHouse startup failed: " + logs(clickhouse))

                def initialize_clickhouse(suffix):
                    initializer = run("clickhouse-init-" + suffix, "--entrypoint", "/bin/sh", "-e", "CLICKHOUSE_ADMIN_USER=review", "-e", "CLICKHOUSE_DB=review",
                                      "-v", f"{outputs['clickhouse']}:/run/secrets:ro", "-v", f"{VAULT / 'scripts'}:/security-entrypoint:ro",
                                      "-v", f"{REPO / 'services/telemetry-db/clickhouse-init.sh'}:/clickhouse-init.sh:ro",
                                      command=("/security-entrypoint/clickhouse-init.sh",), image=clickhouse_image)
                    wait_for(lambda: docker("inspect", "--format", "{{.State.Running}}", initializer).stdout.strip() == "false", "ClickHouse init timed out")
                    assert docker("inspect", "--format", "{{.State.ExitCode}}", initializer).stdout.strip() == "0", logs(initializer)

                initialize_clickhouse("fresh")
                ch("INSERT INTO logs (service,timestamp,severity,message) VALUES ('vault-review',now(),'INFO','marker')",
                   user="vigil_writer", password=SECRETS["CLICKHOUSE_WRITER_PASSWORD"])
                docker("stop", "-t", "3", clickhouse)
                docker("start", clickhouse)
                wait_for(lambda: ch("SELECT 1", check=False).returncode == 0, "Persisted ClickHouse did not restart")
                initialize_clickhouse("persisted")
                assert ch("SELECT count(*) FROM logs WHERE service='vault-review'", user="vigil_api", password=SECRETS["CLICKHOUSE_API_PASSWORD"]).stdout.strip() == "1"
                print("PASS: fresh/persisted ClickHouse wrappers, role passwords, idempotent init, retained telemetry")

            if args.collector_image:
                callback = run("callback", "--network-alias", "callback",
                               "-v", f"{REPO / 'services/telemetry-collector/integration/mock_backend.py'}:/mock_backend.py:ro",
                               image="python:3.13-alpine", command=("python", "/mock_backend.py"))
                collector_options = ["-v", f"{outputs['collector']}:/run/secrets:ro"]
                for key, value in {
                    "CLICKHOUSE_ENDPOINT": "http://clickhouse:8123", "CLICKHOUSE_DATABASE": "review",
                    "CLICKHOUSE_USERNAME": "vigil_writer",
                    "BACKEND_CALLBACK_URL": "http://callback:8081/internal/alerts/trigger-evaluation",
                    "MAX_SERIALIZED_BATCH_BYTES": "1048576", "COLLECTOR_MEMORY_LIMIT_MIB": "384",
                    "COLLECTOR_MEMORY_SPIKE_LIMIT_MIB": "96",
                }.items():
                    collector_options += ["-e", f"{key}={value}"]
                validator = run("collector-validate", *collector_options, image=args.collector_image,
                                command=("/vigcol", "validate", "--config", "/run/secrets/collector-config.yaml"))
                wait_for(lambda: docker("inspect", "--format", "{{.State.Running}}", validator).stdout.strip() == "false",
                         "Collector config validation timed out")
                assert docker("inspect", "--format", "{{.State.ExitCode}}", validator).stdout.strip() == "0", logs(validator)
                collector = run("collector", "--network-alias", "collector", *collector_options, image=args.collector_image,
                                command=("/vigcol", "--config", "/run/secrets/collector-config.yaml"))

                def http(url, payload=None, token=None):
                    headers = {"Content-Type": "application/json"}
                    if token is not None:
                        headers["Authorization"] = "Bearer " + token
                    probe = (
                        "import json, sys, urllib.request, urllib.error\n"
                        "data = None if sys.argv[2] == '' else sys.argv[2].encode()\n"
                        "request = urllib.request.Request(sys.argv[1], data=data, headers=json.loads(sys.argv[3]))\n"
                        "try:\n"
                        "    with urllib.request.urlopen(request, timeout=5) as response:\n"
                        "        print(response.status)\n"
                        "        print(response.read().decode())\n"
                        "except urllib.error.HTTPError as error:\n"
                        "    print(error.code)\n"
                    )
                    return docker("exec", "-i", callback, "python", "-", url, payload or "", json.dumps(headers),
                                  input=probe, check=False).stdout.splitlines()

                token = SECRETS["VIGIL_INGESTION_KEY"]
                wait_for(lambda: http("http://collector:4318/v1/logs", "{}", token)[:1] == ["200"],
                         lambda: "Collector OTLP did not become ready:\n" + logs(collector))
                processes = [line.split() for line in docker("top", collector, "-eo", "uid,pid,comm").stdout.splitlines()[1:]]
                assert any(uid != "0" and command == "vigcol" for uid, pid, command in processes), "Collector must run nonroot"
                for signal in ("logs", "metrics", "traces"):
                    for credential, expected_status in ((None, "401"), ("synthetic-wrong-key", "401"), (token, "200")):
                        response = http(f"http://collector:4318/v1/{signal}", "{}", credential)
                        assert response[:1] == [expected_status], f"OTLP {signal}: expected {expected_status}, got {response[:1]}"
                print("PASS: actual nonroot collector validates rendered config; all OTLP signals accept valid auth and reject missing/wrong keys")
                if args.databases:
                    payload = json.dumps({"resourceLogs": [{
                        "resource": {"attributes": [{"key": "service.name", "value": {"stringValue": "vault-collector-review"}}]},
                        "scopeLogs": [{"logRecords": [{"timeUnixNano": str(time.time_ns()), "severityText": "INFO",
                                                       "body": {"stringValue": "synthetic collector integration marker"}}]}],
                    }]})
                    assert http("http://collector:4318/v1/logs", payload, token)[:1] == ["200"]
                    wait_for(lambda: ch("SELECT count(*) FROM logs WHERE service='vault-collector-review'").stdout.strip() == "1",
                             lambda: "Collector did not persist the synthetic log:\n" + logs(collector))
                    wait_for(lambda: http("http://callback:8081/count") == ["200", "1"], "Collector did not complete its isolated callback")
                    print("PASS: collector exports a real OTLP log with the escaped writer password and completes its callback")

            # Simulate an older complete installation missing only the newly introduced API key.
            old_secret_id = docker("exec", agents["api"], "cat", "/vault/credentials/secret_id").stdout
            vault("write", "auth/approle/role/api/secret-id/destroy", "secret_id=@/vault/credentials/api/secret_id")
            api = original["api"].copy()
            del api["VIGIL_INGESTION_KEY"]
            vault("kv", "put", "secret/ft_transcendence/api", *(f"{key}={value}" for key, value in api.items()))
            docker("stop", "-t", "2", bootstrap)
            # A changed bootstrap .env must not replace already-persisted database credentials.
            env_file.write_text("not a valid bootstrap file anymore\n")
            docker("start", bootstrap)
            wait_for(lambda: logs(bootstrap).count("Bootstrap complete") == 2, "Restart/migration failed")
            assert {role: read(role) for role in ROLES} == original
            assert docker("exec", agents["api"], "cat", "/vault/credentials/secret_id").stdout != old_secret_id
            print("PASS: existing Vault credentials retained despite changed .env; legacy API ingestion-key migration; revoked AppRole repaired")

            # Missing role documents must not silently leave consumers using stale rendered files.
            vault("kv", "delete", "secret/ft_transcendence/collector")
            docker("stop", "-t", "2", bootstrap)
            docker("start", bootstrap)
            wait_for(lambda: docker("inspect", "--format", "{{.State.Running}}", bootstrap).stdout.strip() == "false",
                     "Partial state should stop bootstrap")
            assert "Incomplete Vault import" in logs(bootstrap), logs(bootstrap)
            docker("start", bootstrap)
            wait_for(lambda: docker("inspect", "--format", "{{.State.Running}}", bootstrap).stdout.strip() == "false", "Bootstrap must remain failed")
            assert docker("cp", bootstrap + ":/vault/init/ready", str(temp / "unexpected-ready"), check=False).returncode != 0
            print("PASS: incomplete persisted Vault state fails closed and clears readiness")
        finally:
            for name in reversed(containers):
                docker("rm", "-f", name, check=False)
            for name in reversed(volumes):
                docker("volume", "rm", name, check=False)
            docker("network", "rm", network, check=False)


if __name__ == "__main__":
    main()
