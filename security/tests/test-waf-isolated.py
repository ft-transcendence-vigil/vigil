#!/usr/bin/env python3
"""Disposable Caddy -> WAF -> fixture tests; no compose, .env, or app volumes.

Run on the Docker host: python3 security/tests/test-waf-isolated.py
Images can be overridden with WAF_TEST_PYTHON_IMAGE / WAF_TEST_CADDY_IMAGE.
The fixture is NOT the API: this verifies forwarding, not Tomcat/rate-limit code.
"""
import base64
import hashlib
import http.client
import json
import os
from pathlib import Path
import socket
import ssl

import subprocess
import sys
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Backend(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *_args):
        pass

    def do_GET(self):
        if self.headers.get("Upgrade", "").lower() == "websocket":
            key = self.headers["Sec-WebSocket-Key"]
            accept = base64.b64encode(hashlib.sha1(
                (key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()
            ).digest()).decode()
            self.send_response(101)
            self.send_header("Upgrade", "websocket")
            self.send_header("Connection", "Upgrade")
            self.send_header("Sec-WebSocket-Accept", accept)
            self.end_headers()
            # Read one masked client text frame, and echo it unmasked.
            first, length = self.rfile.read(2)
            assert first == 0x81 and length & 0x80
            length &= 0x7f
            mask = self.rfile.read(4)
            data = self.rfile.read(length)
            data = bytes(value ^ mask[index % 4] for index, value in enumerate(data))
            self.wfile.write(bytes([0x81, len(data)]) + data)
            self.wfile.flush()
            self.close_connection = True
        elif self.path.endswith("/live") or self.path.endswith("/ask"):
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(b"data: first\n\n")
            self.wfile.flush()
            time.sleep(2)
            self.wfile.write(b"data: last\n\n")
            self.wfile.flush()
            self.close_connection = True
        else:
            body = json.dumps({"path": self.path, "headers": dict(self.headers)}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        self.do_GET()

    do_PATCH = do_POST
    do_PUT = do_POST
    do_DELETE = do_GET


def connection(host):
    if host == "reverse-proxy":
        conn = http.client.HTTPSConnection("localhost", 443, timeout=8,
                                           context=ssl._create_unverified_context())
        # Keep production Host/SNI while dialing the isolated Docker alias.
        conn._create_connection = lambda _address, timeout, *_args, **_kw: socket.create_connection(
            (host, 443), timeout=timeout)
        return conn
    return http.client.HTTPConnection(host, 8080, timeout=8)


def request(host, path, method="GET", body=None, headers=None):
    conn = connection(host)
    try:
        conn.request(method, path, body=body, headers={"User-Agent": "vigil-security-test", **(headers or {})})
        response = conn.getresponse()
        return response.status, response.read()
    finally:
        conn.close()


def client_tests():
    failures = []

    def check(name, test):
        try:
            test()
            print("PASS:", name, flush=True)
        except Exception as error:
            failures.append(name)
            print("FAIL:", name, repr(error), flush=True)

    def status(host, path, expected, **kwargs):
        actual, _ = request(host, path, **kwargs)
        assert actual == expected, (path, actual, expected)

    for host in ("reverse-proxy", "waf"):
        check(host + " normal API", lambda h=host: status(h, "/api/alerts", 200))
        for path in ("/internal", "/internal/test"):
            check(host + " hides " + path, lambda h=host, p=path: status(h, p, 404))
        for path in ("/.env", "/.env.local", "/.git", "/.git/config", "/.ENV",
                     "/%2eenv", "/.svn/entries", "/.hg/store", "/.htpasswd",
                     "/assets/.env.production", "/api/.env",
                     "/api/nested/.env.production", "/api/.git/config",
                     "/api/%2eenv", "/api/%2egit/config", "/api/.ENV",
                     "/api/.svn/entries", "/api/.hg/store", "/api/.htpasswd"):
            check(host + " blocks " + path, lambda h=host, p=path: status(h, p, 403))
        for path in ("/api/alerts?search=1%27%20OR%20%271%27%3D%271",
                     "/api/alerts?search=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
                     "/api/alerts?file=..%2F..%2Fetc%2Fpasswd"):
            check(host + " blocks injection " + path,
                  lambda h=host, p=path: status(h, p, 403))

    check("SPA route still works", lambda: status("reverse-proxy", "/dashboard", 200))
    for method in ("PUT", "PATCH", "DELETE"):
        check(method + " reaches API", lambda m=method: status(
            "reverse-proxy", "/api/alerts/rules/123", 200, method=m))
    check("TRACE remains forbidden", lambda: status(
        "reverse-proxy", "/api/alerts", 405, method="TRACE"))
    check("CRS rejects unsupported methods", lambda: status(
        "reverse-proxy", "/api/alerts", 403, method="PROPFIND"))

    # Passwords are opaque, not SQL/HTML; exercise valid complex credentials.
    for path, method in (("/api/auth/login", "POST"), ("/api/setup", "POST"),
                         ("/api/users", "POST"), ("/api/users/me", "PATCH")):
        for password in ("ValidPass1!", "Correct1!<script>alert(1)</script>",
                         "Correct1!' OR '1'='1", "Correct1!/etc/passwd"):
            body = json.dumps({"email": "test@example.org", "password": password,
                               **({"role": "viewer"} if path == "/api/users" else {})})
            check(method + " " + path + " opaque password " + repr(password),
                  lambda p=path, m=method, b=body: status(
                      "reverse-proxy", p, 200, method=m, body=b,
                      headers={"Content-Type": "application/json"}))

    for path in ("/api/config/keys", "/api/auth/sessions", "/api/alerts/rules",
                 "/api/webhooks", "/api/telemetry/logs?service=checkout-api"):
        check("legitimate " + path, lambda p=path: status("reverse-proxy", p, 200))

    # An exclusion for passwords must not disable inspection of other fields/routes.
    for path, body in (("/api/auth/login", {"email": "<script>alert(1)</script>",
                                          "password": "ValidPass1!"}),
                       ("/api/alerts/rules", {"password": "<script>alert(1)</script>"})):
        check("still inspects " + path, lambda p=path, b=body: status(
            "reverse-proxy", p, 403, method="POST", body=json.dumps(b),
            headers={"Content-Type": "application/json"}))

    def forwarded():
        own_ip = socket.gethostbyname(socket.gethostname())
        actual, body = request("reverse-proxy", "/api/echo?limit=10", headers={
            "X-Forwarded-For": "198.51.100.99, 10.0.0.99",
            "X-Real-IP": "198.51.100.98", "Forwarded": "for=198.51.100.97",
            "X-Forwarded-Proto": "http", "X-Forwarded-Host": "evil.example",
            "X-Forwarded-Port": "80"})
        assert actual == 200, actual
        result = json.loads(body)
        headers = {key.lower(): value for key, value in result["headers"].items()}
        chain = [ip.strip() for ip in headers["x-forwarded-for"].split(",")]
        assert chain[0] == own_ip and len(chain) == 2, (own_ip, chain)
        assert headers["x-forwarded-proto"] == "https", headers
        assert headers["x-forwarded-port"] == "443", headers
        assert headers["x-forwarded-host"] == "localhost", headers
        assert "forwarded" not in headers, headers
        assert headers["x-real-ip"] != "198.51.100.98", headers
        assert result["path"] == "/api/echo?limit=10", result
        print("Verified client IP:", own_ip, flush=True)

    check("sanitized forwarding headers and original URI", forwarded)
    check("password query arguments remain inspected", lambda: status(
        "reverse-proxy", "/api/auth/login?password=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
        403, method="POST", body='{"password":"ValidPass1!"}',
        headers={"Content-Type": "application/json"}))
    check("password exclusion is not a route-prefix bypass", lambda: status(
        "reverse-proxy", "/api/auth/login/other", 403, method="POST",
        body='{"password":"<script>alert(1)</script>"}',
        headers={"Content-Type": "application/json"}))

    def websocket():
        conn = connection("reverse-proxy")
        conn.request("GET", "/api/alerts/ws?token=synthetic-test-token", headers={
            "User-Agent": "vigil-security-test",
            "Connection": "Upgrade", "Upgrade": "websocket",
            "Sec-WebSocket-Version": "13",
            "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
            "Origin": "https://localhost"})
        response = conn.getresponse()
        assert response.status == 101, response.status
        assert response.getheader("Sec-WebSocket-Accept") == "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=", response.headers
        payload, mask = b"hello", b"abcd"
        conn.sock.sendall(bytes([0x81, 0x80 | len(payload)]) + mask +
                          bytes(value ^ mask[i % 4] for i, value in enumerate(payload)))
        assert response.fp.read(2) == b"\x81\x05"
        assert response.fp.read(5) == payload
        conn.close()

    check("WebSocket handshake and bidirectional frame", websocket)

    def sse(path, method):
        conn = connection("reverse-proxy")
        start = time.monotonic()
        conn.request(method, path, body='{"question":"Explain this alert"}' if method == "POST" else None,
                     headers={"Accept": "text/event-stream", "Content-Type": "application/json",
                              "User-Agent": "vigil-security-test"})
        response = conn.getresponse()
        assert response.status == 200, response.status
        assert response.readline() == b"data: first\n"
        assert time.monotonic() - start < 1.5, "first event was buffered"
        assert response.read() == b"\ndata: last\n\n"
        assert time.monotonic() - start >= 2, "fixture did not stream"
        conn.close()

    for path, method in (("/api/telemetry/logs/live", "GET"),
                         ("/api/telemetry/metrics/live", "GET"),
                         ("/api/telemetry/traces/live", "GET"),
                         ("/api/alerts/12345678-1234-1234-1234-123456789abc/ask", "POST")):
        check(method + " streaming " + path, lambda p=path, m=method: sse(p, m))
    if failures:
        raise SystemExit(f"{len(failures)} isolated checks failed")


def isolated():
    root = Path(__file__).resolve().parents[2]
    fixture = Path(__file__).resolve()
    name = "vigil-waf-test-" + uuid.uuid4().hex[:10]
    python_image = os.environ.get("WAF_TEST_PYTHON_IMAGE", "python:3.13-alpine")
    caddy_image = os.environ.get("WAF_TEST_CADDY_IMAGE", "caddy:2.11.4-alpine")
    image = name + ":local"
    containers = []

    def docker(*args, **kwargs):
        return subprocess.run(["docker", *args], check=True, **kwargs)

    def run(role, image_name, *args):
        container = name + "-" + role
        containers.append(container)
        docker("run", "--detach", "--name", container, "--network", name,
               "--network-alias", role, *args, image_name,
               *(["python3", "/fixture.py", "backend"] if role == "api" else []),
               stdout=subprocess.DEVNULL)
        return container

    mount = "type=bind,src=" + str(fixture) + ",dst=/fixture.py,readonly"
    try:
        docker("build", "--tag", image, str(root / "security/waf"))
        docker("network", "create", name, stdout=subprocess.DEVNULL)
        run("api", python_image, "--mount", mount)
        waf = run("waf", image, "--env", "BACKEND=http://api:8080",
                  "--env", "BLOCKING_PARANOIA=2", "--env", "ANOMALY_INBOUND=5",
                  "--env", "MODSEC_RESP_BODY_ACCESS=Off", "--env", "MODSEC_AUDIT_LOG_PARTS=AFHZ",
                  "--env", "MODSEC_REQ_BODY_NOFILES_LIMIT=13107200",
                  "--env", "NGINX_WORKER_PROCESSES=1",
                  "--env", "NGINX_X_FORWARDED_PROTO=https", "--env", "NGINX_X_FORWARDED_PORT=443")
        run("reverse-proxy", caddy_image, "--tmpfs", "/data", "--tmpfs", "/config",
            "--mount", "type=bind,src=" + str(root / "services/reverse-proxy/Caddyfile") +
            ",dst=/etc/caddy/Caddyfile,readonly")
        for _ in range(60):
            ready = subprocess.run(["docker", "exec", waf, "curl", "--fail", "--silent",
                                    "http://127.0.0.1:8080/healthz"], capture_output=True)
            if ready.returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError("WAF failed to become ready")
        docker("exec", waf, "nginx", "-t")
        # Distinct containers must produce distinct real client IPs. Neither can
        # choose a new bucket by spoofing forwarding headers through Caddy.
        clients = []
        for index in range(2):
            client = name + "-client-" + str(index)
            containers.append(client)
            clients.append(client)
            docker("run", "--detach", "--name", client, "--network", name, "--mount", mount,
                   python_image, "python3", "/fixture.py", "client", stdout=subprocess.DEVNULL)
        client_ips = []
        for client in clients:
            result = docker("wait", client, capture_output=True, text=True, timeout=90)
            logs = docker("logs", client, capture_output=True, text=True)
            print(logs.stdout, end="")
            assert result.stdout.strip() == "0", logs.stderr
            client_ips.extend(line.split(": ", 1)[1] for line in logs.stdout.splitlines()
                              if line.startswith("Verified client IP: "))
        assert len(client_ips) == 2 and len(set(client_ips)) == 2, client_ips
        print("PASS: isolated forwarding/security checks (not application auth/rate-limit tests)")
    except Exception:
        for container in containers:
            logs = subprocess.run(["docker", "logs", "--tail", "70", container],
                                  check=False, capture_output=True, text=True)
            print("Diagnostics:", container)
            for line in logs.stdout.splitlines():
                if line.startswith('{"transaction"'):
                    event = json.loads(line)["transaction"]
                    print(event["request"]["uri"], event["response"]["http_code"],
                          [(msg["details"]["ruleId"], msg["message"])
                           for msg in event.get("messages", [])])
            print("\n".join(logs.stderr.splitlines()[-8:]))
        raise
    finally:
        for container in reversed(containers):
            subprocess.run(["docker", "rm", "--force", "--volumes", container],
                           check=False, stdout=subprocess.DEVNULL)
        subprocess.run(["docker", "network", "rm", name], check=False, stdout=subprocess.DEVNULL)
        subprocess.run(["docker", "image", "rm", image], check=False, stdout=subprocess.DEVNULL)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "backend":
        ThreadingHTTPServer(("0.0.0.0", 8080), Backend).serve_forever()
    elif len(sys.argv) > 1 and sys.argv[1] == "client":
        client_tests()
    else:
        isolated()
