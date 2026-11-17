package main

import (
	"context"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

// Opt in only in an isolated container/network namespace with ports 80, 443 and
// 2019 free. Nothing is published on the host and all Caddy state is temporary.
func TestRealCaddyLocalIssuance(t *testing.T) {
	if os.Getenv("VIGIL_TLS_TEST_REAL_CADDY") != "1" {
		t.Skip("set VIGIL_TLS_TEST_REAL_CADDY=1 in an isolated container with /usr/bin/caddy")
	}
	s := fixtureSettings(t)
	dir := t.TempDir()
	t.Setenv("XDG_DATA_HOME", filepath.Join(dir, "data"))
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(dir, "config"))
	t.Setenv("HOME", dir)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	cmd := exec.CommandContext(ctx, caddyBinary, "run", "--config", s.configPath(), "--adapter", "caddyfile")
	logPath := filepath.Join(dir, "caddy.log")
	logFile, err := os.Create(logPath)
	if err != nil {
		t.Fatal(err)
	}
	defer logFile.Close()
	cmd.Stdout, cmd.Stderr = logFile, logFile
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() {
		cancel()
		cmd.Wait()
		if t.Failed() {
			data, _ := os.ReadFile(logPath)
			t.Logf("Caddy log:\n%s", data)
		}
	}()
	c, err := newController(s)
	if err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(10 * time.Second)
	for {
		root, rootErr := os.ReadFile(filepath.Join(dir, "data", "caddy", "pki", "authorities", "local", "root.crt"))
		if rootErr == nil && c.ready(ctx) == nil {
			if err := os.WriteFile(s.ca, root, 0444); err != nil {
				t.Fatal(err)
			}
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("Caddy did not start and export its root")
		}
		time.Sleep(100 * time.Millisecond)
	}
	for _, raw := range []string{"https://probe.localhost:8443", "https://192.0.2.1:8443", "https://[::1]:8443"} {
		var r response
		deadline := time.Now().Add(5 * time.Second)
		for {
			r = c.configure(ctx, raw)
			if r.HTTPStatus != 202 || time.Now().After(deadline) {
				break
			}
			time.Sleep(100 * time.Millisecond)
		}
		assertResult(t, r, 200, true, "local")
		assertResult(t, c.configure(ctx, raw), 409, true, "local")
	}
	assertResult(t, c.configure(ctx, "https://localhost"), 409, true, "local")
	loaded, err := loadState(s.statePath())
	if err != nil || len(loaded) != 3 {
		t.Fatalf("real Caddy state: %v %v", loaded, err)
	}
}

// Run this test binary in a disposable proxy's network namespace. The hostname
// must route HTTP-01 traffic to that Caddy's port 80 (a quick tunnel is sufficient).
// Unlike a tunnel-edge HTTPS check, the independent probe below verifies Caddy's
// own certificate directly on 127.0.0.1:443 against the genuine system roots.
func TestLiveCaddyPublicFlow(t *testing.T) {
	raw := os.Getenv("VIGIL_TLS_TEST_PUBLIC_ADDRESS")
	if raw == "" {
		t.Skip("set VIGIL_TLS_TEST_PUBLIC_ADDRESS and VIGIL_TLS_SOCKET for a disposable live proxy")
	}
	a, err := normalize(raw)
	if err != nil || localName(a.host) {
		t.Fatalf("expected a public DNS HTTPS address: %q (%v)", raw, err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()
	socket := environment().socket
	send := func() response {
		t.Helper()
		conn, err := (&net.Dialer{}).DialContext(ctx, "unix", socket)
		if err != nil {
			t.Fatal(err)
		}
		defer conn.Close()
		conn.SetDeadline(time.Now().Add(8 * time.Second))
		if err := json.NewEncoder(conn).Encode(request{Operation: "configure", Address: raw}); err != nil {
			t.Fatal(err)
		}
		var r response
		if err := json.NewDecoder(conn).Decode(&r); err != nil {
			t.Fatal(err)
		}
		return r
	}
	for {
		r := send()
		t.Logf("configure %s: HTTP %d %s", a.origin, r.HTTPStatus, r.Body.Code)
		if r.HTTPStatus == 200 || r.HTTPStatus == 409 {
			assertResult(t, r, r.HTTPStatus, true, "public")
			break
		}
		if r.HTTPStatus != 202 {
			t.Fatalf("public issuance failed: %+v", r)
		}
		if r.Body.Configured == nil {
			t.Fatalf("pending response omitted configured: %+v", r)
		}
		assertResult(t, r, 202, *r.Body.Configured, "")
		select {
		case <-ctx.Done():
			t.Fatal("production ACME did not become verified within 90s")
		case <-time.After(3 * time.Second):
		}
	}
	probeCtx, stop := context.WithTimeout(ctx, 2*time.Second)
	defer stop()
	if err := verifyCertificate(probeCtx, a.host, "public", "/deliberately-unavailable-local-ca", (&net.Dialer{}).DialContext, x509.SystemCertPool); err != nil {
		t.Fatal(fmt.Errorf("Caddy's own certificate failed direct system-root verification: %w", err))
	}
	assertResult(t, send(), 409, true, "public")
}
