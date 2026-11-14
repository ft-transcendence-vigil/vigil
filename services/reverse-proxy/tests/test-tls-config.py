#!/usr/bin/env python3
"""Disposable, real TLS configuration integration test (Python 3.10+, PyYAML, Docker).

Run from the repository root with freshly built images, for example:
  python3 services/reverse-proxy/tests/test-tls-config.py \
    --image api=vigil-api:tls-config --image reverse-proxy=vigil-reverse-proxy:tls-config \
    --image telemetry-collector=vigil-telemetry-collector:tls-config --image waf=vigil-waf:tls-config

Add --validate-only to check Compose isolation without starting/pulling containers.
Add --public-acme to opt into production ACME issuance and a temporary Cloudflare
public ingress: external network access, CA rate limits and public certificate
transparency records apply. No Cloudflare account/secret is needed. The tunnel's
edge certificate is NEVER used as evidence: all TLS probes dial local Caddy.
Default tests require external DNS for sslip.io, but do not publish any ingress.
The four explicit image overrides must contain current sources; this script does
not rebuild or refresh them. Other Compose dependency images must be cached.
This is a targeted non-AI integration test, not a full-stack/LLM regression run.
"""
import argparse
import hashlib
import http.client
import importlib.util
import json
import os
import re
import signal
import socket
import ssl
import sys
import time
from email.message import Message
from pathlib import Path
from typing import Any

HARNESS = Path(__file__).resolve().parents[3] / "security/tests/test-fullstack.py"
spec = importlib.util.spec_from_file_location("vigil_fullstack_tls_harness", HARNESS)
assert spec is not None and spec.loader is not None, "cannot load fullstack harness"
base = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = base
spec.loader.exec_module(base)
require, eventually = base.require, base.eventually

CLOUDFLARED = "cloudflare/cloudflared@sha256:b94b96edf2c9c4360f8879c8580cfaa99077f19c849ec595ca2f711b27d4f344"
BUILD_SERVICES = {"api", "reverse-proxy", "telemetry-collector", "waf"}
TARGET_SERVICES = BUILD_SERVICES | {
    "vault", "vault-init", "vault-agent-api", "vault-agent-postgres",
    "vault-agent-clickhouse", "vault-agent-collector", "postgres", "clickhouse", "clickhouse-init",
}
ADDRESSES, CA = "/api/config/tls/addresses", "/api/config/tls/ca"


class LoopbackHTTPS(http.client.HTTPSConnection):
    """Keep the real hostname for SNI/Host/verification, never dial its DNS IP."""

    def __init__(self, host, port, context, timeout):
        super().__init__(host, port, context=context, timeout=timeout)
        self.tls_context = context

    def connect(self):
        raw = socket.create_connection(("127.0.0.1", self.port), self.timeout)
        try:
            self.sock = self.tls_context.wrap_socket(raw, server_hostname=self.host)
        except BaseException:
            raw.close()
            raise


class DirectHTTP(base.HTTP):
    """Same safe request protocol as the harness, plus direct SNI and status capture.

    Setup/login/refresh retain the original harness HTTP/cookie implementation.
    These clients use the resulting JWT, without copying cookies to another host.
    """

    def __init__(self, host, port, ca=None):
        self.host, self.port = host, port
        self.origin = f"https://{host}:{port}"
        # Public probes use ONLY host system roots: never load the installation CA.
        if ca:
            self.context = ssl.create_default_context(cafile=str(ca))
        else:
            paths = ssl.get_default_verify_paths()
            # Explicit compiled-in paths avoid SSL_CERT_FILE/SSL_CERT_DIR
            # redirecting a public proof to a caller-selected trust store.
            cafile = paths.openssl_cafile if Path(paths.openssl_cafile).is_file() else None
            capath = paths.openssl_capath if Path(paths.openssl_capath).is_dir() else None
            require(cafile or capath, "host system trust store unavailable")
            self.context = ssl.create_default_context(cafile=cafile, capath=capath)
        self.token = None
        self.status = None
        self.peer = self.fingerprint = None

    def request(self, path, method="GET", body=None, auth=True, headers=None,
                expected: int | tuple[int, ...] = 200) -> tuple[Any, Message]:
        headers = {"User-Agent": "vigil-tls-config-test", **(headers or {})}
        if auth and self.token:
            headers.setdefault("Authorization", "Bearer " + self.token)
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        connection = LoopbackHTTPS(self.host, self.port, context=self.context, timeout=20)
        try:
            connection.connect()
            self.peer = connection.sock.getpeercert()
            certificate = connection.sock.getpeercert(binary_form=True)
            assert certificate is not None, "TLS peer certificate missing"
            self.fingerprint = hashlib.sha256(certificate).hexdigest()
            connection.request(method, path, body=data, headers=headers)
            response = connection.getresponse()
            self.status, raw, metadata = response.status, response.read(), response.headers
        finally:
            connection.close()
        allowed = (expected,) if isinstance(expected, int) else expected
        # Like the base harness, never include response bodies/headers/credentials.
        require(self.status in allowed,
                f"{method} {path.split('?')[0]}: HTTP {self.status}, expected {allowed}")
        if "application/json" in metadata.get("Content-Type", "") and raw:
            return json.loads(raw), metadata
        return raw, metadata


class TLSStack(base.Stack):
    def prepare(self):
        overrides = {}
        for item in self.args.image:
            require("=" in item, "--image requires SERVICE=IMAGE")
            service, image = item.split("=", 1)
            require(service not in overrides and image, "duplicate/empty --image override")
            overrides[service] = image
        require(BUILD_SERVICES <= overrides.keys(),
                "pass freshly built --image overrides for api, reverse-proxy, telemetry-collector and waf")
        super().prepare()
        # Keep all 17 services, so the base harness's 16-default-service safety
        # assertion still applies. Only startup/readiness use the dependency closure.
        model = json.loads((self.work / "compose.json").read_text())
        require(len(model["services"]) == 17, "review changed Compose service inventory")
        selected = set()

        def visit(name):
            if name in selected:
                return
            selected.add(name)
            for dependency in model["services"][name].get("depends_on", {}):
                visit(dependency)

        visit("reverse-proxy")
        require(selected == TARGET_SERVICES, "review changed reverse-proxy dependency closure")
        self.services = selected
        self.images = overrides
        self.ca = self.work / "root.crt"
        self.local_host = "app-test.192.0.2.1.sslip.io"
        self.local_origin = f"https://{self.local_host}:{self.port}"
        self.public_host = None
        print("Target: 13 real non-AI services; Ollama/model-init/LLM excluded", flush=True)

    def startup(self):
        for service in sorted(BUILD_SERVICES):
            try:
                self.run(["docker", "image", "inspect", self.images[service]], timeout=10)
            except RuntimeError:
                raise AssertionError(f"missing {service} image: build current sources and pass --image") from None
        self.started = True
        self.dc("up", "--detach", "--no-build", "--pull", "never", "reverse-proxy", timeout=240)

        def ready():
            states = {item["Service"]: item for item in self.states()}
            require(set(states) <= self.services, "unexpected AI/profile service started")
            for service in self.services:
                state = states.get(service, {})
                if service == "clickhouse-init":
                    if state.get("State") != "exited" or state.get("ExitCode") != 0:
                        return False
                elif state.get("State") != "running" or state.get("Health", "") not in ("", "healthy"):
                    return False
            return True

        eventually(ready, 90, 2)

        def copy_ca():
            self.dc("cp", "reverse-proxy:/public-ca/root.crt", str(self.ca), timeout=10, check=False)
            return self.ca.is_file() and self.ca.stat().st_size > 0

        eventually(copy_ca, 30)
        self.http = base.HTTP(self.origin, self.ca)
        eventually(lambda: self.http.request("/api/setup", auth=False)[0] is True, 60)
        self.control = self.client("localhost")

    def client(self, host, public=False):
        client = DirectHTTP(host, self.port, None if public else self.ca)
        if hasattr(self, "http"):
            client.token = self.http.token
        return client

    def access_control(self):
        anonymous = base.HTTP(self.origin, self.ca)
        anonymous.request(CA, auth=False, expected=401)
        anonymous.request(ADDRESSES, "POST", {"address": self.local_origin}, auth=False, expected=401)
        password = "ViewerFixture42!" + os.urandom(8).hex()
        self.sensitive.append(password)
        body = {"email": "fixture-viewer@example.test", "password": password, "role": "viewer"}
        created, _ = self.http.request("/api/users", "POST", body, expected=201)
        require(created.get("role") == "viewer" and created.get("id") and created.get("email") == body["email"],
                "viewer creation DTO")
        viewer = base.HTTP(self.origin, self.ca)
        login, _ = viewer.request("/api/auth/login", "POST",
                                  {"email": body["email"], "password": password}, auth=False)
        viewer.token = login["access_token"]
        self.sensitive.append(viewer.token)
        self.sensitive.extend(cookie.value for cookie in viewer.cookies)
        require(viewer.request("/api/users/me")[0]["role"] == "viewer", "viewer JWT identity")
        viewer.request(CA, expected=403)
        viewer.request(ADDRESSES, "POST", {"address": self.local_origin}, expected=403)

    def download_ca(self):
        pem, headers = self.http.request(CA)
        require(headers.get_content_type() == "application/x-pem-file", "CA PEM content type")
        require(headers.get_content_disposition() == "attachment" and headers.get_filename() == "vigil-ca.crt",
                "CA attachment filename")
        require("no-store" in headers.get("Cache-Control", ""), "CA must not be cached")
        require(isinstance(pem, bytes) and pem.count(b"-----BEGIN CERTIFICATE-----") == 1
                and b"PRIVATE" not in pem and b"KEY" not in pem, "CA endpoint must expose only one public certificate")
        der = ssl.PEM_cert_to_DER_cert(pem.decode("ascii"))
        require(bool(der), "empty CA certificate")
        actual = self.work / "caddy-root.crt"
        self.dc("cp", "reverse-proxy:/data/caddy/pki/authorities/local/root.crt", str(actual), timeout=10)
        exported = self.work / "exported-root.crt"
        self.dc("cp", "reverse-proxy:/public-ca/root.crt", str(exported), timeout=10)
        require(pem == actual.read_bytes() == exported.read_bytes() == self.ca.read_bytes(),
                "downloaded CA differs from Caddy authority/export")
        if hasattr(self, "downloaded_ca"):
            require(pem == self.downloaded_ca, "CA changed after restart")
        self.downloaded_ca = pem
        # Compose cp preserves Caddy's read-only export mode; keep the API
        # download in a separate harness-owned file instead of overwriting it.
        self.ca = self.work / "downloaded-ca.crt"
        self.ca.write_bytes(pem)
        # A real X.509 loader, not merely a PEM delimiter/base64 check.
        ssl.create_default_context(cafile=str(self.ca))
        self.client("localhost").request("/api/users/me")

    def root_key_hash(self):
        # Hash inside the proxy; never copy/read/print a private key on the host.
        output = self.dc("exec", "-T", "reverse-proxy", "/bin/busybox", "sha256sum",
                         "/data/caddy/pki/authorities/local/root.key", timeout=10)
        digest = output.split()[0]
        require(re.fullmatch(r"[0-9a-f]{64}", digest), "cannot hash persistent CA key")
        return digest

    def verified(self, result, status, origin, mode):
        require(result.get("address") == origin and result.get("configured") is True
                and result.get("status") == "verified" and result.get("tls_mode") == mode,
                "verified address/configured/status/mode contract")
        require(result.get("otlp_endpoint") == origin + "/otlp", "OTLP endpoint contract")
        require(result.get("ca_download_url") == (CA if mode == "local" else None), "CA URL/mode contract")
        require(result.get("code") == ("ALREADY_CONFIGURED" if status == 409 else "TLS_VERIFIED"),
                "verified result code")
        require("retry_after_seconds" not in result, "verified result still asks for retry")

    def configure(self, origin, mode, fresh=True):
        self.control.token = self.http.token
        result, headers = self.control.request(ADDRESSES, "POST", {"address": origin}, expected=(200, 202, 409))
        status = self.control.status
        if fresh:
            require(status in ((202,) if mode == "public" else (200, 202)), "new address initial HTTP status")
        deadline = time.monotonic() + (180 if mode == "public" else 45)
        certificate_pending = False
        while status == 202:
            require("no-store" in headers.get("Cache-Control", ""), "pending response must not be cached")
            require(result.get("status") == "pending" and result.get("retry_after_seconds") == 3
                    and "tls_mode" not in result, "pending retry/no-mode contract")
            require(result.get("address") == origin and isinstance(result.get("configured"), bool)
                    and result.get("otlp_endpoint") == origin + "/otlp" and result.get("code"),
                    "pending address/configured/endpoint/code contract")
            certificate_pending |= result.get("configured") is True
            require(time.monotonic() < deadline, "certificate never became verified")
            time.sleep(3)
            result, headers = self.control.request(ADDRESSES, "POST", {"address": origin}, expected=(200, 202, 409))
            status = self.control.status
        if fresh:
            require(status == 200, "first verified configuration must return 200")
            if mode == "public":
                require(certificate_pending, "public ACME did not exercise configured-but-pending state")
        require("no-store" in headers.get("Cache-Control", ""), "configuration must not be cached")
        self.verified(result, status, origin, mode)
        duplicate, _ = self.control.request(ADDRESSES, "POST", {"address": origin}, expected=409)
        self.verified(duplicate, 409, origin, mode)

    def invalid_origins(self):
        self.control.token = self.http.token
        localhost, _ = self.control.request(ADDRESSES, "POST", {"address": self.origin}, expected=409)
        self.verified(localhost, 409, self.origin, "local")
        canonical, _ = self.control.request(ADDRESSES, "POST", {"address": "https://LOCALHOST:00443/"}, expected=409)
        self.verified(canonical, 409, "https://localhost", "local")
        cases = [
            ("HTTP scheme", "http://example.test", (400,)),
            ("credentials", "https://user:pass@example.test", (400, 403)),
            ("path", "https://example.test/path", (400, 403)),
            ("query", "https://example.test?x=1", (400, 403)),
            ("wildcard", "https://*.example.test", (400, 403)),
            ("CRLF", "https://example.test\r\nX-Test: invalid", (400, 403)),
        ]
        for label, origin, allowed in cases:
            self.control.request(ADDRESSES, "POST", {"address": origin}, expected=allowed)
            if self.control.status == 403:
                # Accept a security-policy rejection only with a real WAF audit,
                # never relax WAF rules to force malicious input through to Java.
                logs = self.dc("logs", "--no-color", "--tail", "100", "waf", timeout=10)
                audited = False
                for line in logs.splitlines():
                    if '{"transaction"' not in line:
                        continue
                    audit = json.loads(line[line.index('{"transaction"'):])["transaction"]
                    audited |= (audit.get("request", {}).get("uri", "").split("?")[0] == ADDRESSES
                                and audit.get("response", {}).get("http_code") == 403
                                and any(item.get("details", {}).get("ruleId") for item in audit.get("messages", [])))
                require(audited, "403 invalid origin lacks a WAF rule audit")
                print("PASS: invalid", label, "rejected by active WAF (audited)", flush=True)

    def routes(self, client):
        original = self.http
        self.http = client
        try:
            require(client.request("/api/users/me")[0]["email"] == self.email, "protected API via configured SNI")
            self.frontend()
            self.waf()
        finally:
            self.http = original

    def ingest_log(self, client, label):
        service = "tls-fixture-" + label
        message = "Synthetic TLS integration " + label
        payload = {"resourceLogs": [{"resource": {"attributes": [
            {"key": "service.name", "value": {"stringValue": service}}]},
            "scopeLogs": [{"logRecords": [{"timeUnixNano": str(time.time_ns()), "severityNumber": 9,
                                           "body": {"stringValue": message}}]}]}]}
        client.request("/otlp/v1/logs", "POST", payload, auth=False, expected=401)
        client.request("/otlp/v1/logs", "POST", payload, auth=False,
                       headers={"Authorization": "Bearer " + self.values["VIGIL_INGESTION_KEY"]})

        def visible():
            result, _ = client.request("/api/telemetry/logs?service=" + service + "&count=10")
            return any(row.get("message") == message and row.get("attributes", {}).get("service.name") == service
                       for row in result.get("data", []))

        eventually(visible, 45)

    def public_acme(self):
        print("OPT-IN: production CA issuance/CT logs, CA rate limits, temporary public Cloudflare ingress", flush=True)
        image = self.args.cloudflared_image
        try:
            self.run(["docker", "image", "inspect", image], timeout=10)
        except RuntimeError:
            self.run(["docker", "pull", image], timeout=90)
        # Exact random name registered BEFORE run, including partially successful run.
        tunnel = self.project + "-quicktunnel"
        self.clients.append(tunnel)
        self.run(["docker", "run", "--detach", "--name", tunnel, "--network", self.project + "_default",
                  "--label", "com.docker.compose.project=" + self.project, "--pull=never", image,
                  "tunnel", "--no-autoupdate", "--url", "http://reverse-proxy:80", "--protocol", "http2"], timeout=30)

        def hostname():
            logs = self.run(["docker", "logs", tunnel], timeout=10)
            match = re.search(r"https://([a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com)\b", logs)
            return match[1] if match else None

        self.public_host = eventually(hostname, 45)
        origin = f"https://{self.public_host}:{self.port}"
        print("Production ACME hostname:", self.public_host, flush=True)
        self.configure(origin, "public")
        self.public_certificate(self.client(self.public_host, public=True))
        self.ingest_log(self.client(self.public_host, public=True), "public")

    def public_certificate(self, client):
        require(client.context.verify_mode == ssl.CERT_REQUIRED and client.context.check_hostname,
                "public probe must verify chain and hostname")
        require(client.request("/api/setup", auth=False)[0] is False, "direct public certificate/API setup roundtrip")
        require(("DNS", client.host) in client.peer.get("subjectAltName", ()), "public leaf lacks exact hostname SAN")
        issuer = dict(item for rdn in client.peer["issuer"] for item in rdn)
        require(issuer.get("organizationName") == "Let's Encrypt"
                and "staging" not in json.dumps(client.peer).lower(), "expected production Let's Encrypt issuer")
        print("PASS: direct Caddy system-root trust/SAN; issuer:", issuer.get("commonName"),
              "SHA256:", client.fingerprint, flush=True)

    def persistence(self):
        key_hash = self.root_key_hash()
        self.dc("restart", "reverse-proxy", "api", timeout=60)
        eventually(lambda: self.http.request("/api/users/me")[0]["email"] == self.email, 75)
        self.download_ca()
        require(self.root_key_hash() == key_hash, "proxy restart rotated CA private key")
        require(self.read_admin_key() == self.admin_key, "API restart rotated generated API key")
        require(self.http.request("/api/config/keys")[0]["ingestion_key"] == self.values["VIGIL_INGESTION_KEY"],
                "API restart changed ingestion key")
        self.configure(self.local_origin, "local", fresh=False)
        self.routes(self.client(self.local_host))
        self.ingest_log(self.client(self.local_host), "restart")
        if self.public_host:
            origin = f"https://{self.public_host}:{self.port}"
            self.configure(origin, "public", fresh=False)
            self.public_certificate(self.client(self.public_host, public=True))
            self.routes(self.client(self.public_host, public=True))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--image", action="append", default=[], metavar="SERVICE=IMAGE",
                        help="fresh existing image; required for API/proxy/collector/WAF (never built by this test)")
    parser.add_argument("--validate-only", action="store_true", help="validate isolation only; no starts or pulls")
    parser.add_argument("--public-acme", action="store_true", help="opt in to real production ACME via public quicktunnel")
    parser.add_argument("--cloudflared-image", default=CLOUDFLARED, help="test dependency; pulled only if public and absent")
    parser.add_argument("--timeout", type=int, default=600, help="overall test deadline, at most 600s; bounded cleanup extra")
    args = parser.parse_args()
    require(0 < args.timeout <= 600, "timeout must be between 1 and 600 seconds")
    stack = TLSStack(args)

    def interrupted(_signum, _frame):
        raise TimeoutError("TLS integration deadline/signal reached")

    for sig in (signal.SIGALRM, signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, interrupted)
    signal.alarm(args.timeout)
    try:
        stack.check("reused full Compose isolation safety", stack.prepare, fatal=True)
        if args.validate_only:
            print("PASS: validation only; no services started/images pulled", flush=True)
        else:
            stack.check("real non-AI dependency chain and CA-verified localhost HTTPS", stack.startup, fatal=True)
            stack.check("real fresh setup/login/JWT/Vault keys", stack.auth, fatal=True)
            stack.check("unauthenticated 401 / viewer 403 on both TLS endpoints", stack.access_control, fatal=True)
            stack.check("public-only PEM download, headers, actual Caddy root and localhost trust", stack.download_ca, fatal=True)
            stack.check("localhost verified conflict/canonicalization and invalid origins", stack.invalid_origins, fatal=True)
            stack.check("local DNS-classified hostname verified + duplicate conflict",
                        lambda: stack.configure(stack.local_origin, "local"), fatal=True)
            stack.check("downloaded-CA direct SNI, protected API/WAF/SPA routes",
                        lambda: stack.routes(stack.client(stack.local_host)), fatal=True)
            stack.check("new local hostname real OTLP auth/collector/ClickHouse/API roundtrip",
                        lambda: stack.ingest_log(stack.client(stack.local_host), "local"), fatal=True)
            if args.public_acme:
                stack.check("production ACME pending/verified/conflict and independent direct trust",
                            stack.public_acme, fatal=True)
            else:
                print("SKIP: production ACME (requires explicit --public-acme)", flush=True)
            stack.check("proxy/API restart: persisted hosts, CA/key, public trust and routes", stack.persistence, fatal=True)
    except BaseException as error:
        if not stack.failures or isinstance(error, TimeoutError):
            stack.failures.append(type(error).__name__)
        print("STOP:", stack.redact(type(error).__name__ + ": " + str(error)), flush=True)
    finally:
        # The inherited cleanup removes only this isolated project and exact
        # tracked tunnel name. No prune, existing stack or original named volume.
        signal.alarm(30)
        try:
            if stack.failures:
                stack.diagnostics()
        except Exception as error:
            print("Diagnostics unavailable:", type(error).__name__, flush=True)
        finally:
            # A diagnostic timeout must not consume the cleanup watchdog.
            signal.alarm(150)
        try:
            stack.cleanup()
        except Exception as error:
            stack.failures.append("cleanup")
            print("FAIL: cleanup", stack.redact(str(error)), "project:", stack.project, flush=True)
        finally:
            signal.alarm(0)
    print("RESULT:", "FAIL " + ", ".join(stack.failures) if stack.failures
          else "PASS (targeted real non-AI TLS integration; no mocks)", flush=True)
    return 1 if stack.failures else 0


if __name__ == "__main__":
    sys.exit(main())
