#!/usr/bin/env python3
"""Real, disposable Compose integration test. Never targets an existing stack.

Requires host Python 3.10+, PyYAML and Docker Compose v2+. See README.md.
Only synthetic credentials are used. No service mocks, existing .env, or volumes.
"""
import argparse
import base64
import hashlib
import http.client
import http.cookiejar
import json
import os
from pathlib import Path
import queue
import re
import secrets

import signal
import socket
import ssl
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def eventually(action, seconds=60, interval=2):
    deadline = time.monotonic() + seconds
    last = None
    while time.monotonic() < deadline:
        try:
            result = action()
            if result:
                return result
        except (OSError, ValueError, AssertionError, urllib.error.URLError) as error:
            last = type(error).__name__ + ": " + str(error)
        time.sleep(interval)
    raise AssertionError("poll timed out" + (": " + last if last else ""))


class HTTP:
    def __init__(self, origin, ca):
        self.origin = origin
        self.context = ssl.create_default_context(cafile=str(ca))
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=self.context),
            urllib.request.HTTPCookieProcessor(self.cookies))
        self.token = None

    def request(self, path, method="GET", body=None, auth=True, headers=None, expected=200):
        headers = {"User-Agent": "vigil-fullstack-test", **(headers or {})}
        if auth and self.token:
            headers.setdefault("Authorization", "Bearer " + self.token)
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(self.origin + path, data=data, headers=headers, method=method)
        try:
            response = self.opener.open(req, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            status, raw, metadata = response.code, response.read(), response.headers
        # Never put response bodies/headers (tokens and credentials) into assertions.
        require(status == expected, f"{method} {path.split('?')[0]}: HTTP {status}, expected {expected}")
        if "application/json" in metadata.get("Content-Type", "") and raw:
            return json.loads(raw), metadata
        return raw, metadata


class Events:
    """One bounded SSE request, started asynchronously because live streams are idle."""
    def __init__(self, http, path, body=None):
        self.events = queue.Queue()
        self.response = None
        self.closed = False
        self.thread = threading.Thread(target=self.read, args=(http, path, body), daemon=True)
        self.thread.start()

    def read(self, http, path, body):
        try:
            headers = {"Accept": "text/event-stream", "Authorization": "Bearer " + http.token,
                       "User-Agent": "vigil-fullstack-test"}
            data = None if body is None else json.dumps(body).encode()
            if data is not None:
                headers["Content-Type"] = "application/json"
            req = urllib.request.Request(http.origin + path, data=data, headers=headers)
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}),
                                                urllib.request.HTTPSHandler(context=http.context))
            with opener.open(req, timeout=150) as response:
                self.response = response
                require(response.status == 200, "SSE HTTP status")
                require("text/event-stream" in response.headers.get("Content-Type", ""), "SSE content type")
                event, parts = "message", []
                while not self.closed:
                    line = response.readline()
                    if not line:
                        break
                    line = line.decode().rstrip("\r\n")
                    if not line:
                        if parts:
                            self.events.put((event, json.loads("\n".join(parts))))
                        event, parts = "message", []
                    elif line.startswith("event:"):
                        event = line[6:].strip()
                    elif line.startswith("data:"):
                        parts.append(line[5:].lstrip())
        except Exception as error:
            if not self.closed:
                self.events.put(("reader-error", type(error).__name__))

    def wait(self, predicate, seconds=75):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            try:
                event, value = self.events.get(timeout=min(2, max(.01, deadline - time.monotonic())))
            except queue.Empty:
                continue
            require(event != "reader-error", "SSE reader failed: " + str(value))
            if predicate(event, value):
                return value
        raise AssertionError("SSE event timed out")

    def inference(self, seconds=120):
        chunks = []

        def accept(event, value):
            require(event != "error", "LLM SSE error: " + str(value.get("status", "stream failure")))
            if event == "token":
                require(isinstance(value.get("token"), str), "LLM token shape")
                chunks.append(value["token"])
            return event == "done"

        self.wait(accept, seconds)
        text = "".join(chunks).strip()
        require(text and "Analysis unavailable" not in text, "LLM returned empty/fallback inference")
        return text

    def close(self):
        self.closed = True
        # Do not block on a buffered reader held by a read thread. Shutdown its socket.
        if self.response:
            try:
                self.response.fp.raw._sock.shutdown(socket.SHUT_RDWR)
            except (AttributeError, OSError):
                pass
        self.thread.join(timeout=2)


class WebSocket:
    def __init__(self, http):
        parsed = urllib.parse.urlsplit(http.origin)
        self.sock = http.context.wrap_socket(socket.create_connection((parsed.hostname, parsed.port), 15),
                                            server_hostname="localhost")
        self.sock.settimeout(120)
        key = base64.b64encode(secrets.token_bytes(16)).decode()
        path = "/api/alerts/ws?token=" + urllib.parse.quote(http.token)
        request = (f"GET {path} HTTP/1.1\r\nHost: {parsed.netloc}\r\nOrigin: {http.origin}\r\n"
                   f"Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\n"
                   f"Sec-WebSocket-Key: {key}\r\nUser-Agent: vigil-fullstack-test\r\n\r\n")
        self.sock.sendall(request.encode())
        self.reader = self.sock.makefile("rb")
        require(b" 101 " in self.reader.readline(), "authenticated WebSocket handshake failed")
        headers = {}
        while True:
            line = self.reader.readline()
            if line == b"\r\n":
                break
            require(bool(line), "WebSocket handshake EOF")
            name, value = line.decode().split(":", 1)
            headers[name.lower()] = value.strip()
        expected = base64.b64encode(hashlib.sha1(
            (key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode()
        require(headers.get("sec-websocket-accept") == expected, "WebSocket accept key")
        self.events = queue.Queue()
        self.thread = threading.Thread(target=self.read, daemon=True)
        self.thread.start()

    def exact(self, size):
        data = self.reader.read(size)
        require(len(data) == size, "WebSocket EOF")
        return data

    def read(self):
        try:
            fragments = bytearray()
            while True:
                first, second = self.exact(2)
                length = second & 127
                if length == 126:
                    length = struct.unpack("!H", self.exact(2))[0]
                elif length == 127:
                    length = struct.unpack("!Q", self.exact(8))[0]
                require(length <= 2**20 and not second & 128, "invalid server WebSocket frame")
                data = self.exact(length)
                opcode = first & 15
                if opcode == 8:
                    return
                if opcode == 9:
                    mask = secrets.token_bytes(4)
                    self.sock.sendall(bytes([0x8A, 128 | len(data)]) + mask +
                                      bytes(v ^ mask[i % 4] for i, v in enumerate(data)))
                    continue
                if opcode in (0, 1):
                    fragments.extend(data)
                    if first & 128:
                        self.events.put(json.loads(fragments))
                        fragments.clear()
        except Exception:
            self.events.put({"type": "reader-error"})

    def wait(self, kind, alert_id, seconds=60):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            try:
                value = self.events.get(timeout=2)
            except queue.Empty:
                continue
            require(value.get("type") != "reader-error", "WebSocket reader failed")
            if value.get("type") == kind and value.get("data", {}).get("alert_history_id") == alert_id:
                return value["data"]
        raise AssertionError("WebSocket " + kind + " event timed out")

    def close(self):
        try:
            self.sock.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass
        self.sock.close()
        self.thread.join(timeout=2)
        self.reader.close()


def rate_client():
    """Real HTTP client only; run inside two disposable containers, not a mock."""
    data = json.load(sys.stdin)
    context = ssl.create_default_context(cafile="/tmp/root.crt")
    statuses = []
    for _ in range(data["count"]):
        conn = http.client.HTTPSConnection("localhost", 443, context=context, timeout=15)
        conn._create_connection = lambda _address, timeout, *_args, **_kw: socket.create_connection(
            ("reverse-proxy", 443), timeout=timeout)
        headers = {"Content-Type": "application/json", "User-Agent": "vigil-fullstack-rate-client",
                   "Origin": data["origin"], "Host": urllib.parse.urlsplit(data["origin"]).netloc}
        if data.get("spoof"):
            headers.update({"X-Forwarded-For": "198.51.100.77", "Forwarded": "for=198.51.100.78"})
        conn.request("POST", "/api/auth/login", json.dumps({"email": data["email"],
                                                            "password": "WrongFixturePass42!"}), headers)
        response = conn.getresponse()
        statuses.append(response.status)
        response.read()
        conn.close()
    print(json.dumps({"statuses": statuses}))


class Stack:
    def __init__(self, args):
        self.args = args
        self.repo = Path(__file__).resolve().parents[2]
        self.project = "vigil-fs-" + uuid.uuid4().hex[:12]
        self.work = Path(tempfile.mkdtemp(prefix=self.project + "-"))
        os.chmod(self.work, 0o700)
        self.sensitive = []
        self.failures = []
        self.streams = []
        self.clients = []
        self.started = False
        self.validated = False
        self.env = {key: os.environ[key] for key in ("PATH", "HOME", "XDG_RUNTIME_DIR") if key in os.environ}
        self.env["COMPOSE_DISABLE_ENV_FILE"] = "1"
        self.compose = []
        self.known_volumes = set()

    def redact(self, text):
        variants = {variant for value in self.sensitive for variant in
                    (value, value.lower(), json.dumps(value)[1:-1]) if len(variant) >= 8}
        for value in sorted(variants, key=len, reverse=True):
            text = text.replace(value, "[REDACTED]")
        text = re.sub(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", "[JWT]", text)
        text = re.sub(r"\bhv[bsr]\.[A-Za-z0-9._-]+", "[VAULT-TOKEN]", text)
        text = re.sub(r"(?im)^.*(?:unseal key|root token|set-cookie|authorization:|secret_id|role_id).*$",
                      "[credential-bearing line omitted]", text)
        return text

    def run(self, args, timeout=60, input=None, check=True):
        with subprocess.Popen(args, cwd=self.repo, env=self.env, stdin=subprocess.PIPE,
                              stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                              text=True, start_new_session=True) as process:
            try:
                output, _ = process.communicate(input, timeout=timeout)
            except BaseException:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=10)
                raise
            if check and process.returncode:
                raise RuntimeError(f"subprocess failed ({process.returncode}): " + self.redact(output[-10000:]))
            return output

    def dc(self, *args, **kwargs):
        return self.run(self.compose + list(args), **kwargs)

    def check(self, name, action, fatal=False):
        try:
            action()
            print("PASS:", name, flush=True)
        except Exception as error:
            self.failures.append(name)
            print("FAIL:", name, self.redact(type(error).__name__ + ": " + str(error)), flush=True)
            if fatal:
                raise

    def prepare(self):
        import yaml
        # Parse source data directly: never ask Compose to load the original file/.env.
        model = yaml.safe_load((self.repo / "docker-compose.yml").read_text())
        require(set(model) <= {"services", "volumes", "networks", "name"}, "review new Compose top-level settings")
        model.pop("name", None)
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            self.port = sock.getsockname()[1]
        self.origin = f"https://localhost:{self.port}"
        values = {
            "POSTGRES_USER": "fixture_admin", "POSTGRES_DB": "fixture", "POSTGRES_HOST": "postgres",
            "POSTGRES_IMAGE": "postgres:17-alpine", "CLICKHOUSE_USER": "fixture_admin",
            "CLICKHOUSE_DB": "default", "CLICKHOUSE_CLIENT_IMAGE": "clickhouse/clickhouse-server:26.8.6.5",
            "HTTPS_PORT": str(self.port), "SPRING_JPA_HIBERNATE_DDL_AUTO": "update",
            "VIGIL_FRONTEND_BASE_URL": self.origin, "VIGIL_FRONT_END_URL": self.origin,
            "VIGIL_SILENCE_TIMEOUT_SECONDS": "600", "VIGIL_LLM_BASE_URL": "http://llm:8000",
            "VIGIL_LLM_TIMEOUT_SECONDS": "90", "LLM_TIMEOUT_SECONDS": "80",
            "OLLAMA_IMAGE": "ollama/ollama:0.12.3", "OLLAMA_MODEL": "qwen2.5:0.5b",
            "OLLAMA_NUM_CTX": "2048", "OLLAMA_NUM_PREDICT": "160", "OLLAMA_TEMPERATURE": "0.1",
            "MAX_CONTEXT_LOGS": "20", "MAX_CONTEXT_METRICS": "10", "MAX_CONTEXT_TRACES": "10",
            "BACKEND_CALLBACK_URL": "http://api:8081/internal/alerts/trigger-evaluation",
            "MAX_SERIALIZED_BATCH_BYTES": "1048576", "COLLECTOR_MEMORY_LIMIT_MIB": "384",
            "COLLECTOR_MEMORY_SPIKE_LIMIT_MIB": "96", "MOCK_TELEMETRY_INTERVAL_SECONDS": "5",
        }
        for key in ("JWT_SECRET", "POSTGRES_PASSWORD", "CLICKHOUSE_PASSWORD", "CLICKHOUSE_API_PASSWORD",
                    "CLICKHOUSE_WRITER_PASSWORD", "VIGIL_INGESTION_KEY"):
            values[key] = secrets.token_hex(40 if key == "JWT_SECRET" else 24)
            self.sensitive.append(values[key])
        self.values = values
        envfile = self.work / "synthetic.env"
        envfile.write_text("".join(key + "=" + value + "\n" for key, value in values.items()))
        os.chmod(envfile, 0o600)
        # Explicit environment wins over interpolation, without inheriting application settings.
        self.env.update(values)
        overrides = {}
        for item in self.args.image:
            service, image = item.split("=", 1)
            require(service in model["services"] and image, "invalid --image service=image")
            overrides[service] = image
        for service, config in model["services"].items():
            require("env_file" not in config and "extends" not in config, "unsafe inherited service config")
            config.pop("container_name", None)
            config.pop("ports", None)
            if service in overrides:
                config.pop("build", None)
                config["image"] = overrides[service]
            if service == "reverse-proxy":
                config["ports"] = [{"target": 443, "published": str(self.port), "host_ip": "127.0.0.1",
                                    "protocol": "tcp"}]
            for index, mount in enumerate(config.get("volumes", [])):
                if isinstance(mount, str) and mount.split(":")[1:2] == ["/vault/bootstrap/application.env"]:
                    require(service == "vault-init", "unexpected bootstrap bind")
                    config["volumes"][index] = f"{envfile}:/vault/bootstrap/application.env:ro"
        for kind in ("volumes", "networks"):
            for name, config in model.get(kind, {}).items():
                config = config or {}
                require(not config.get("external"), "external " + kind + " forbidden")
                config.pop("name", None)
                model[kind][name] = config
        generated = self.work / "compose.json"
        generated.write_text(json.dumps(model))
        self.compose = ["docker", "compose", "--project-directory", str(self.repo), "--env-file", str(envfile),
                        "--project-name", self.project, "--file", str(generated)]
        resolved = json.loads(self.dc("config", "--format", "json"))
        prefix = self.project + "_"
        for name, config in resolved.get("volumes", {}).items():
            actual = config.get("name", "")
            require(actual.startswith(prefix) and not config.get("external"), "non-isolated volume: " + name)
            self.known_volumes.add(actual)
        for config in resolved.get("networks", {}).values():
            require(config.get("name", "").startswith(prefix) and not config.get("external"), "non-isolated network")
        for name, config in resolved["services"].items():
            require("container_name" not in config, "fixed container name")
            require(not config.get("env_file"), "inherited env file")
            for mount in config.get("volumes", []):
                if mount["type"] == "volume":
                    require(prefix + mount["source"] in self.known_volumes, "unknown volume mount")
                else:
                    require(mount["type"] == "bind" and mount.get("read_only"), "non-read-only source bind")
                    source = Path(mount["source"]).resolve()
                    require(source == envfile or (source.is_relative_to(self.repo) and ".env" not in source.parts
                                                  and not source.name.startswith(".env")), "unsafe source bind")
            for port in config.get("ports", []):
                require(name == "reverse-proxy" and port["host_ip"] == "127.0.0.1" and port["target"] == 443,
                        "non-loopback/non-Caddy published port")
        self.validated = True
        self.services = {name for name, config in resolved["services"].items() if not config.get("profiles")}
        require(len(self.services) == 16, "expected all 16 default services")
        print("Isolated project:", self.project, "origin:", self.origin, flush=True)

    def states(self):
        raw = self.dc("ps", "--all", "--format", "json")
        try:
            result = json.loads(raw)
            return result if isinstance(result, list) else [result]
        except json.JSONDecodeError:
            return [json.loads(line) for line in raw.splitlines() if line.strip()]

    def startup(self):
        self.started = True  # up may partially succeed; finally must still down.
        self.dc("up", "--detach", "--build", timeout=300)
        def ready():
            states = {item["Service"]: item for item in self.states()}
            for service in self.services:
                state = states.get(service, {})
                if service in ("ollama-model-init", "clickhouse-init"):
                    if state.get("State") != "exited" or state.get("ExitCode") != 0:
                        return False
                elif state.get("State") != "running" or state.get("Health", "") not in ("", "healthy"):
                    return False
            return True
        eventually(ready, 240, 3)
        print("All 16 default services running/healthy or init exited 0", flush=True)
        ca = self.work / "root.crt"
        def copy_ca():
            self.dc("cp", "reverse-proxy:/public-ca/root.crt", str(ca), timeout=10, check=False)
            return ca.is_file() and ca.stat().st_size > 0
        eventually(copy_ca, 45)
        self.http = HTTP(self.origin, ca)
        eventually(lambda: self.http.request("/api/setup", auth=False)[0] is True, 60)

    def frontend(self):
        index, headers = self.http.request("/", auth=False)
        require("text/html" in headers.get("Content-Type", ""), "frontend HTML content type")
        match = re.search(rb'<script[^>]+src="([^"]+\.js)"', index)
        require(match is not None, "built frontend script missing")
        asset = match[1].decode()
        require(asset.startswith("/assets/"), "unexpected frontend asset location")
        body, metadata = self.http.request(asset, auth=False)
        require(len(body) > 1000 and "javascript" in metadata.get("Content-Type", ""), "built JS not served")
        for route in ("/dashboard", "/logs", "/alerts"):
            require(self.http.request(route, auth=False)[0] == index, "SPA fallback mismatch")

    def read_admin_key(self):
        # Distroless API images have no cat/shell. Copy only this run's generated credential.
        path = self.work / "generated-api-key"
        try:
            self.dc("cp", "api:/var/lib/vigil/admin/api-key", str(path))
            os.chmod(path, 0o600)
            return path.read_text()
        finally:
            path.unlink(missing_ok=True)

    def auth(self):
        self.email = "fixture-admin@example.test"
        self.password = "FixturePass42!<script>test</script>' OR '1'='1"
        self.sensitive.append(self.password)
        body = {"email": self.email, "password": self.password}
        result, headers = self.http.request("/api/setup", "POST", body, auth=False, expected=201)
        require(result.get("role") == "admin" and result.get("access_token"), "setup JWT DTO")
        self.sensitive.append(result["access_token"])
        require(self.http.request("/api/setup", auth=False)[0] is False, "setup still required")
        result, headers = self.http.request("/api/auth/login", "POST", body, auth=False)
        self.http.token = result["access_token"]
        self.sensitive.append(self.http.token)
        claims = json.loads(base64.urlsafe_b64decode(self.http.token.split(".")[1] + "=="))
        require(claims["sub"] == self.email and claims["exp"] > time.time(), "JWT claims")
        cookies = {item.name: item for item in self.http.cookies}
        require(set(cookies) == {"refresh_token", "session_hint"}, "auth cookie names")
        for item in cookies.values():
            self.sensitive.append(item.value)
            require(item.secure and item.get_nonstandard_attr("SameSite") == "Strict", "secure Strict cookies")
        require(cookies["refresh_token"].path == "/api/auth" and cookies["refresh_token"].has_nonstandard_attr("HttpOnly"),
                "refresh cookie path/HttpOnly")
        require(cookies["session_hint"].path == "/" and not cookies["session_hint"].has_nonstandard_attr("HttpOnly"),
                "session hint policy")
        old = cookies["refresh_token"].value
        refreshed, _ = self.http.request("/api/auth/refresh", "POST", auth=False)
        self.http.token = refreshed["access_token"]
        self.sensitive.append(self.http.token)
        current = next(item.value for item in self.http.cookies if item.name == "refresh_token")
        self.sensitive.append(current)
        require(old != current, "refresh token did not rotate")
        require(any(item["current"] for item in self.http.request("/api/auth/sessions", auth=False)[0]["sessions"]),
                "refresh cookie session lookup")
        keys, _ = self.http.request("/api/config/keys")
        self.admin_key = keys["api_key"]
        self.sensitive.append(self.admin_key)
        require(keys["ingestion_key"] == self.values["VIGIL_INGESTION_KEY"], "Vault ingestion key mismatch")
        persisted = self.read_admin_key()
        require(persisted == self.admin_key, "generated file/admin API key mismatch")
        me, _ = self.http.request("/api/users/me")
        require(me["email"] == self.email, "JWT user identity")
        self.http.request("/api/users", auth=False, headers={"Authorization": "ApiKey " + self.admin_key})

    def waf(self):
        for path in ("/api/alerts?search=1%27%20OR%20%271%27%3D%271",
                     "/api/alerts?search=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
                     "/api/alerts?file=..%2F..%2Fetc%2Fpasswd", "/api/.env", "/.git/config"):
            self.http.request(path, expected=403)
        self.http.request("/internal/alerts/trigger-evaluation", expected=404)
        self.http.request("/api/telemetry/logs", auth=False, expected=401)
        self.http.request("/otlp/v1/logs", "POST", {"resourceLogs": []}, auth=False, expected=401)

    def subscribe(self):
        self.ws = WebSocket(self.http)
        self.streams.append(self.ws)
        self.live = {}
        for signal_type in ("logs", "traces", "metrics"):
            stream = Events(self.http, f"/api/telemetry/{signal_type}/live?service=fixture-service")
            self.live[signal_type] = stream
            self.streams.append(stream)
        # There is no SSE ready event; give all requests time to register before sending.
        time.sleep(2)

    def ingest(self):
        rule = {"signal_type": "metrics", "metric_name": "fixture.requests", "aggregation": "latest",
                "window_seconds": 60, "threshold": 1, "service": "fixture-service", "severity": "warning",
                "enabled": True}
        created, _ = self.http.request("/api/alerts/rules", "POST", rule, expected=201)
        self.rule_id = created["id"]
        require(created["is_default"] is False and created["metric_name"] == rule["metric_name"], "created rule DTO")
        n = time.time_ns() // 1000000 * 1000000
        resource = {"attributes": [{"key": "service.name", "value": {"stringValue": "fixture-service"}}]}
        trace_id, span_id = "00000000000000000000000000000001", "0000000000000001"
        payloads = {
            "logs": {"resourceLogs": [{"resource": resource, "scopeLogs": [{"logRecords": [{
                "timeUnixNano": str(n), "severityNumber": 17,
                "body": {"stringValue": "Synthetic fixture request failed"},
                "attributes": [{"key": "trace_id", "value": {"stringValue": trace_id}}]}]}]}]},
            "traces": {"resourceSpans": [{"resource": resource, "scopeSpans": [{"spans": [{
                "traceId": trace_id, "spanId": span_id, "name": "fixture operation",
                "startTimeUnixNano": str(n), "endTimeUnixNano": str(n + 1000000), "status": {"code": 2}}]}]}]},
            "metrics": {"resourceMetrics": [{"resource": resource, "scopeMetrics": [{"metrics": [{
                "name": "fixture.requests", "unit": "1", "gauge": {"dataPoints": [{
                    "timeUnixNano": str(n + 2000000), "asDouble": 42}]}}]}]}]},
        }
        self.rows = {}
        for kind in ("logs", "traces", "metrics"):
            self.http.request("/otlp/v1/" + kind, "POST", payloads[kind], auth=False,
                              headers={"Authorization": "Bearer " + self.values["VIGIL_INGESTION_KEY"]})
            def visible():
                result, _ = self.http.request(f"/api/telemetry/{kind}?service=fixture-service&count=10")
                require("hasMore" in result, "telemetry pagination DTO")
                return result["data"]
            rows = eventually(visible, 60, 2)
            require(len(rows) == 1, kind + " fixture row count")
            row = rows[0]
            require(row["attributes"]["service.name"] == "fixture-service" and
                    row["attributes"].get("vigil.notification_id"), kind + " collector metadata")
            if kind == "logs":
                require(row["severity"] == "error" and row["trace_id"] == trace_id and
                        row["message"] == "Synthetic fixture request failed", "log normalization")
            elif kind == "traces":
                require(row["trace_id"] == trace_id and row["span_id"] == span_id and row["status"] == "error"
                        and row["duration_ms"] == 1 and row["parent_span_id"] is None, "trace normalization")
            else:
                require(row["name"] == "fixture.requests" and row["value"] == 42, "metric normalization")
            self.rows[kind] = row
            self.live[kind].wait(lambda event, value: event == "message" and value == row)
            print("PASS:", kind, "real ingestion, DB-backed read and public SSE", flush=True)
        series, _ = self.http.request("/api/telemetry/metrics/series?period=1h&service=fixture-service")
        require(series["interval_seconds"] == 60 and any(
            item["name"] == "fixture.requests" and item["kind"] == "gauge" and
            any(point["value"] == 42 for point in item["points"]) for item in series["series"]), "metric series")

    def alerts(self):
        def find():
            result, _ = self.http.request("/api/alerts?service=fixture-service&count=20")
            require("has_more" in result, "alert pagination DTO")
            return next((item for item in result["data"] if item["rule_id"] == self.rule_id), None)
        self.alert = eventually(find, 60)
        self.alert_id = self.alert["id"]
        require(self.alert["status"] == "sent" and self.alert["triggered_at"] == self.rows["metrics"]["timestamp"],
                "collector-triggered alert values")
        self.ws.wait("alert", self.alert_id)
        notification = self.ws.wait("Notification", self.alert_id)
        require(notification["seen"] is False, "initial WebSocket notification state")
        notifications, _ = self.http.request("/api/alerts/notifications?count=20")
        require("has_more" in notifications and any(item["alert_history_id"] == self.alert_id
                and not item["seen"] for item in notifications["notifications"]), "persisted user notification")
        changed, _ = self.http.request(f"/api/alerts/notifications/{self.alert_id}?seen=true", "PUT")
        require(changed["alert_id"] == self.alert_id and changed["seen"] and changed["seen_at"], "notification PUT")

    def analysis(self):
        def analyzed():
            alerts, _ = self.http.request("/api/alerts?service=fixture-service&count=20")
            alert = next(item for item in alerts["data"] if item["id"] == self.alert_id)
            text = alert["llm_analysis"]
            if text:
                require("Analysis unavailable" not in text, "automatic LLM stored fallback instead of inference")
                return text
            return None
        eventually(analyzed, 110, 3)

    def ask(self):
        stream = Events(self.http, f"/api/alerts/{self.alert_id}/ask", {
            "question": "What does the fixture.requests value show for this alert?"})
        self.streams.append(stream)
        stream.inference()

    def direct_llm(self):
        # A real network client, not a substitute service. Require actual tokens and done.
        code = '''import json, urllib.request
body = {"alert_id":"00000000-0000-4000-8000-000000000001", "service":"fixture-service",
"triggered_at":"2026-11-14T12:00:00Z", "question":"What value was recorded for fixture.requests?",
"context":{"metrics":[{"service":"fixture-service","timestamp":"2026-11-14T12:00:00Z",
"name":"fixture.requests","value":42}]}}
req = urllib.request.Request("http://llm:8000/internal/llm/ask", data=json.dumps(body).encode(),
headers={"Content-Type":"application/json","X-Vigil-User-Id":"fixture-direct-user"})
with urllib.request.urlopen(req, timeout=110) as r:
 text = r.read().decode()
 assert r.status == 200 and "event: done" in text and "event: token" in text
 assert "event: error" not in text and "Analysis unavailable" not in text
print("real direct LLM tokens and done")'''
        name = self.project + "-direct-client"
        self.clients.append(name)
        self.run(["docker", "run", "--rm", "--name", name, "--network", self.project + "_default", "--label",
                  "com.docker.compose.project=" + self.project, self.args.client_image,
                  "python", "-c", code], timeout=120)

    def rate_limits(self):
        rate_names = []
        for suffix in ("a", "b"):
            name = self.project + "-client-" + suffix
            self.clients.append(name)
            rate_names.append(name)
            self.run(["docker", "run", "--detach", "--name", name, "--network", self.project + "_default",
                      "--label", "com.docker.compose.project=" + self.project, self.args.client_image,
                      "python", "-c", "import time; time.sleep(300)"])
            # Stream fixture files through stdin: docker cp can preserve host UIDs
            # outside a rootless daemon's mapping. No host ownership is needed here.
            for source, target in ((Path(__file__).resolve(), "/tmp/test.py"),
                                   (self.work / "root.crt", "/tmp/root.crt")):
                self.run(["docker", "exec", "-i", name, "python", "-c",
                          "import pathlib, sys; pathlib.Path(sys.argv[1]).write_text(sys.stdin.read())", target],
                         input=source.read_text())
        def request(index, count, spoof=False):
            output = self.run(["docker", "exec", "-i", rate_names[index], "python", "/tmp/test.py", "--rate-client"],
                              input=json.dumps({"count": count, "email": self.email, "spoof": spoof, "origin": self.origin}), timeout=90)
            return json.loads(output)["statuses"]
        a = request(0, 11)
        require(a == [401] * 10 + [429], "client A login budget: " + str(a))
        b = request(1, 1)
        require(b == [401], "client B shares client A rate bucket: " + str(b))
        require(request(0, 1, True) == [429], "spoofed XFF reset exhausted client A budget")
        print("Client A: 10 x 401 then 429; client B: 401; spoofed client A: 429", flush=True)

    def restart(self):
        self.dc("restart", "api", timeout=60)
        eventually(lambda: self.http.request("/api/users/me")[0]["email"] == self.email, 90, 3)
        persisted = self.read_admin_key()
        require(persisted == self.admin_key, "API restart rotated generated key")
        self.http.request("/api/users", auth=False, headers={"Authorization": "ApiKey " + self.admin_key})
        self.http.request("/api/auth/sessions", auth=False)
        renewed, _ = self.http.request("/api/auth/refresh", "POST", auth=False)
        self.http.token = renewed["access_token"]
        self.sensitive.append(self.http.token)
        require(self.http.request("/api/config/keys")[0]["ingestion_key"] == self.values["VIGIL_INGESTION_KEY"],
                "Vault key did not survive API restart")
        require(self.http.request("/api/telemetry/metrics?service=fixture-service")[0]["data"][0]["value"] == 42,
                "telemetry persistence")
        notifications, _ = self.http.request("/api/alerts/notifications?count=20")
        require(any(item["alert_history_id"] == self.alert_id and item["seen"]
                    for item in notifications["notifications"]), "notification persistence")
        changed, _ = self.http.request("/api/alerts/rules/" + self.rule_id, "PATCH", {"enabled": False})
        require(changed["enabled"] is False, "rule PATCH")
        self.http.request("/api/alerts/rules/" + self.rule_id, "DELETE", expected=204)

    def diagnostics(self):
        if not self.started:
            return
        chunks = []
        try:
            chunks.append(json.dumps([{key: item.get(key) for key in ("Service", "State", "Health", "ExitCode")}
                                      for item in self.states()], indent=2))
            logs = self.dc("logs", "--no-color", "--tail", "60", timeout=30)
            for line in logs.splitlines():
                if '{"transaction"' in line:
                    try:
                        audit = json.loads(line[line.index('{"transaction"'):])["transaction"]
                        chunks.append("WAF audit: " + json.dumps({
                            "request": audit.get("request", {}),
                            "status": audit.get("response", {}).get("http_code"),
                            "rules": [item.get("details", {}).get("ruleId") for item in audit.get("messages", [])]
                        }))
                    except (ValueError, KeyError):
                        chunks.append("WAF audit omitted (unparseable)")
                else:
                    chunks.append(line)
        except Exception as error:
            chunks.append("diagnostic collection failed: " + type(error).__name__)
        safe = self.redact("\n".join(chunks))
        path = self.work / "diagnostics.log"
        path.write_text(safe)
        os.chmod(path, 0o600)
        print("Redacted failure diagnostics:", path, flush=True)
        print(safe[-18000:], flush=True)

    def cleanup(self):
        for stream in self.streams:
            stream.close()
        for client in self.clients:
            # These exact random names were created by this process; never enumerate/delete unrelated containers.
            self.run(["docker", "rm", "--force", client], check=False, timeout=20)
        if self.started and self.validated:
            prefix = self.project + "_"
            require(all(name.startswith(prefix) for name in self.known_volumes), "unsafe cleanup volume name")
            actual = self.run(["docker", "volume", "ls", "--filter", "label=com.docker.compose.project=" + self.project,
                               "--format", "{{.Name}}"])
            require(set(actual.split()) <= self.known_volumes, "unrecognized project volumes; refusing down -v")
            self.dc("down", "--volumes", "--remove-orphans", "--timeout", "10", timeout=120)
            remaining = self.run(["docker", "ps", "--all", "--filter", "label=com.docker.compose.project=" + self.project,
                                  "--format", "{{.Names}}"])
            volumes = self.run(["docker", "volume", "ls", "--filter", "label=com.docker.compose.project=" + self.project,
                                "--format", "{{.Name}}"])
            networks = self.run(["docker", "network", "ls", "--filter", "label=com.docker.compose.project=" + self.project,
                                 "--format", "{{.Name}}"])
            require(not remaining.strip() and not volumes.strip() and not networks.strip(), "project cleanup incomplete")
            print("PASS: isolated containers, networks and volumes removed", flush=True)
        for path in self.work.iterdir():
            if path.name != "diagnostics.log":
                path.unlink()
        if not (self.work / "diagnostics.log").exists():
            self.work.rmdir()


def main():
    if "--rate-client" in sys.argv:
        rate_client()
        return 0
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", action="append", default=[], metavar="SERVICE=IMAGE",
                        help="use an existing image and remove this service's build configuration")
    parser.add_argument("--client-image", default="python:3.13-alpine")
    parser.add_argument("--validate-only", action="store_true", help="validate isolation without starting containers")
    parser.add_argument("--timeout", type=int, default=900, help="total test deadline, excluding bounded cleanup")
    args = parser.parse_args()
    require(args.timeout > 0, "positive timeout required")
    stack = Stack(args)
    def interrupted(_signum, _frame):
        raise TimeoutError("fullstack deadline/signal reached")
    for sig in (signal.SIGALRM, signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, interrupted)
    signal.alarm(args.timeout)
    try:
        stack.check("isolated Compose model safety", stack.prepare, fatal=True)
        if args.validate_only:
            print("PASS: validation only; no services started", flush=True)
            return 0
        stack.check("all real services/init/health, CA-verified HTTPS", stack.startup, fatal=True)
        stack.check("built frontend asset and SPA fallback (not browser automation)", stack.frontend)
        stack.check("setup/login opaque password, JWT/cookies/refresh, Vault/generated ApiKey", stack.auth, fatal=True)
        stack.check("WAF attacks, protected API and unauthenticated OTLP", stack.waf)
        stack.check("authenticated real WebSocket and three live SSE subscriptions", stack.subscribe, fatal=True)
        stack.check("real OTLP, ClickHouse reads, three public SSE streams and series", stack.ingest, fatal=True)
        stack.check("collector-created alert, WebSocket alert/notification and notification PUT", stack.alerts, fatal=True)
        stack.check("automatic real LLM nonfallback analysis", stack.analysis)
        stack.check("public POST ask actual inference tokens/done", stack.ask)
        stack.check("direct LLM actual inference tokens/done", stack.direct_llm)
        stack.check("real Tomcat two-client rate isolation and spoof resistance", stack.rate_limits)
        stack.check("API restart key/session/data persistence, rule PATCH/DELETE", stack.restart)
    except BaseException as error:
        if not stack.failures or isinstance(error, TimeoutError):
            stack.failures.append(type(error).__name__)
        print("STOP:", stack.redact(type(error).__name__ + ": " + str(error)), flush=True)
    finally:
        signal.alarm(0)
        if stack.failures:
            stack.diagnostics()
        try:
            stack.cleanup()
        except Exception as error:
            stack.failures.append("cleanup")
            print("FAIL: cleanup", stack.redact(str(error)), "project:", stack.project, flush=True)
    print("RESULT:", "FAIL " + ", ".join(stack.failures) if stack.failures else "PASS (real services; no mocks)", flush=True)
    return 1 if stack.failures else 0


if __name__ == "__main__":
    sys.exit(main())
