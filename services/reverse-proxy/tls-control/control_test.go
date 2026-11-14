package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/netip"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

func fixtureController(t *testing.T) *controller {
	t.Helper()
	c, err := newController(fixtureSettings(t))
	if err != nil {
		t.Fatal(err)
	}
	c.ready = func(context.Context) error { return nil }
	c.resolve = func(context.Context, string) ([]netip.Addr, error) {
		return []netip.Addr{netip.MustParseAddr("1.1.1.1")}, nil
	}
	c.reload = func(context.Context, string) error { return nil }
	c.probe = func(context.Context, string, string) error { return nil }
	return c
}

func assertResult(t *testing.T, r response, status int, configured bool, mode string) {
	t.Helper()
	if r.HTTPStatus != status || r.Body.Configured == nil || *r.Body.Configured != configured || r.Body.TLSMode != mode {
		t.Fatalf("unexpected response: %+v", r)
	}
	data, err := json.Marshal(r)
	if err != nil {
		t.Fatal(err)
	}
	if status == 202 {
		if r.Body.Status != "pending" || r.Body.RetryAfter != 3 || strings.Contains(string(data), `"tls_mode"`) {
			t.Fatalf("pending contract: %s", data)
		}
	} else if r.Body.Status != "verified" || strings.Contains(string(data), `"retry_after_seconds"`) {
		t.Fatalf("verified contract: %s", data)
	}
}

func TestConfigurePublicPendingThenFreshlyVerifiedAndDuplicate(t *testing.T) {
	c := fixtureController(t)
	reloads, probes := 0, 0
	c.reload = func(ctx context.Context, path string) error {
		reloads++
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		if string(data) != testBase+"\n\nhttps://public.example:443 {\n\timport vigil-routes\n}\n" {
			t.Fatalf("unexpected candidate config: %s", data)
		}
		return nil
	}
	c.probe = func(ctx context.Context, host, mode string) error {
		probes++
		if host != "public.example" || mode != "public" {
			t.Fatalf("wrong TLS probe: %s %s", host, mode)
		}
		return errors.New("ACME still issuing")
	}
	r := c.configure(context.Background(), "https://PUBLIC.example:8443/")
	assertResult(t, r, 202, true, "")
	if r.Body.Code != "CERTIFICATE_PENDING" || r.Body.Address != "https://public.example:8443" || r.Body.OTLPEndpoint != "https://public.example:8443/otlp" {
		t.Fatalf("bad response: %+v", r)
	}
	if reloads != 1 || len(c.hosts) != 1 || c.hosts[0].Mode != "public" {
		t.Fatal("public issuance did not persist its selected policy")
	}
	c.resolve = func(context.Context, string) ([]netip.Addr, error) {
		t.Fatal("stored policy must not be reclassified")
		return nil, nil
	}
	c.probe = func(context.Context, string, string) error { probes++; return nil }
	assertResult(t, c.configure(context.Background(), "https://public.example:8443"), 200, true, "public")
	r = c.configure(context.Background(), "https://public.example:9443")
	assertResult(t, r, 409, true, "public")
	if r.Body.Code != "ALREADY_CONFIGURED" || reloads != 1 || probes != 3 || r.Body.Address != "https://public.example:9443" {
		t.Fatalf("duplicate was reloaded, cached, or tied to an external port: %+v", r)
	}
	data, _ := json.Marshal(r)
	if !strings.Contains(string(data), `"ca_download_url":null`) {
		t.Fatalf("public CA URL must be null: %s", data)
	}
	// Previously verified must not bypass a new failing handshake.
	c.probe = func(context.Context, string, string) error { return errors.New("expired/untrusted cert") }
	assertResult(t, c.configure(context.Background(), "https://public.example"), 202, true, "")
}

func TestConfigureLocalAndBuiltinLocalhost(t *testing.T) {
	c := fixtureController(t)
	probes := 0
	c.probe = func(context.Context, string, string) error {
		probes++
		if probes == 1 {
			return errors.New("local issuer starting")
		}
		return nil
	}
	r := c.configure(context.Background(), "https://nas.local:8443")
	assertResult(t, r, 200, true, "local")
	if probes != 2 || r.Body.CADownloadURL != "/api/config/tls/ca" {
		t.Fatalf("local retry/CA contract: %+v; probes=%d", r, probes)
	}
	assertResult(t, c.configure(context.Background(), "https://nas.local"), 409, true, "local")
	c.reload = func(context.Context, string) error { t.Fatal("localhost must not reload"); return nil }
	assertResult(t, c.configure(context.Background(), "https://localhost"), 409, true, "local")
	if len(c.hosts) != 1 {
		t.Fatal("builtin localhost should not consume the host limit")
	}
}

func TestDNSPendingDoesNotAttemptIssuance(t *testing.T) {
	c := fixtureController(t)
	c.resolve = func(ctx context.Context, host string) ([]netip.Addr, error) { return nil, errors.New("NXDOMAIN") }
	c.reload = func(context.Context, string) error { t.Fatal("unresolved host must not reload"); return nil }
	c.probe = func(context.Context, string, string) error { t.Fatal("unresolved host must not probe"); return nil }
	r := c.configure(context.Background(), "https://not-resolved.example")
	assertResult(t, r, 202, false, "")
	if r.Body.Code != "DNS_PENDING" || len(c.hosts) != 0 {
		t.Fatalf("bad DNS pending state: %+v", r)
	}
	if _, err := os.Stat(c.s.statePath()); !os.IsNotExist(err) {
		t.Fatal("unresolved host was persisted")
	}
}

func TestLimitsAndValidationBeforeSideEffects(t *testing.T) {
	c := fixtureController(t)
	c.ready = func(context.Context) error { t.Fatal("invalid address should fail before admin access"); return nil }
	if r := c.configure(context.Background(), "https://evil.example\n{ tls internal }"); r.HTTPStatus != 400 || r.Body.Code != "INVALID_ADDRESS" {
		t.Fatalf("invalid address: %+v", r)
	}
	c.ready = func(context.Context) error { return nil }
	for i := 0; i < maxHosts; i++ {
		c.hosts = append(c.hosts, hostEntry{fmt.Sprintf("host%d.local", i), "local"})
	}
	c.resolve = func(context.Context, string) ([]netip.Addr, error) {
		t.Fatal("full state should not look up new host")
		return nil, nil
	}
	if r := c.configure(context.Background(), "https://overflow.example"); r.HTTPStatus != 400 || r.Body.Code != "HOST_LIMIT_REACHED" {
		t.Fatalf("host limit: %+v", r)
	}
	assertResult(t, c.configure(context.Background(), "https://host0.local"), 200, true, "local")
	assertResult(t, c.configure(context.Background(), "https://host0.local"), 409, true, "local")
	assertResult(t, c.configure(context.Background(), "https://localhost"), 409, true, "local")
}

func TestServiceFailuresAreSafeAndRollbackAcceptedConfig(t *testing.T) {
	for _, problem := range []string{"admin", "reload", "generated", "state", "rollback"} {
		t.Run(problem, func(t *testing.T) {
			c := fixtureController(t)
			reloads := 0
			secret := errors.New("PRIVATE /data/caddy/private-key-internal-error")
			if problem == "admin" {
				c.ready = func(context.Context) error { return secret }
			}
			c.reload = func(ctx context.Context, path string) error {
				reloads++
				data, _ := os.ReadFile(path)
				if reloads > 1 && string(data) != testBase {
					t.Fatalf("rollback did not restore old policy: %s", data)
				}
				if problem == "reload" && reloads == 1 || problem == "rollback" && reloads == 2 {
					return secret
				}
				return nil
			}
			c.write = func(path string, data []byte) error {
				if problem == "generated" && path == c.s.configPath() || (problem == "state" || problem == "rollback") && path == c.s.statePath() {
					return secret
				}
				return atomicWrite(path, data)
			}
			r := c.configure(context.Background(), "https://public.example")
			if r.HTTPStatus != 503 || r.Body.Code != "TLS_SERVICE_UNAVAILABLE" || len(c.hosts) != 0 {
				t.Fatalf("service failure: %+v", r)
			}
			data, _ := json.Marshal(r)
			if strings.Contains(string(data), "PRIVATE") || strings.Contains(string(data), "/data/") {
				t.Fatalf("private error exposed: %s", data)
			}
			if problem != "admin" && reloads != 2 {
				t.Fatalf("expected candidate and rollback reloads, got %d", reloads)
			}
			if problem == "state" || problem == "reload" {
				data, _ := os.ReadFile(c.s.configPath())
				if string(data) != testBase || c.broken {
					t.Fatal("failed persistence/reload did not restore generated config")
				}
			}
			if problem == "rollback" {
				if !c.broken {
					t.Fatal("rollback failure should fail closed")
				}
				if r := c.configure(context.Background(), "https://another.example"); r.HTTPStatus != 503 || reloads != 2 {
					t.Fatal("broken controller accepted more changes")
				}
			}
			if _, err := os.Stat(c.s.statePath()); !os.IsNotExist(err) {
				t.Fatal("rejected host was persisted")
			}
		})
	}
}

func TestRollbackAfterRequestDeadline(t *testing.T) {
	for _, restoreUnavailable := range []bool{false, true} {
		name := "successful restore"
		if restoreUnavailable {
			name = "restore deadline exceeded"
		}
		t.Run(name, func(t *testing.T) {
			c := fixtureController(t)
			oldHost := hostEntry{"existing.local", "local"}
			c.hosts = []hostEntry{oldHost}
			putState(t, c.s, c.hosts)
			if err := prepare(c.s); err != nil {
				t.Fatal(err)
			}
			before := make(map[string]string)
			for _, path := range []string{c.s.configPath(), c.s.statePath()} {
				data, err := os.ReadFile(path)
				if err != nil {
					t.Fatal(err)
				}
				before[path] = string(data)
			}
			oldConfig := before[c.s.configPath()]
			liveConfig := oldConfig
			reloads := 0
			var cleanupContext context.Context
			c.reload = func(ctx context.Context, path string) error {
				reloads++
				if c.mu.TryLock() {
					c.mu.Unlock()
					t.Error("configuration mutex was released before cleanup completed")
				}
				data, err := os.ReadFile(path)
				if err != nil {
					t.Fatal(err)
				}
				if reloads == 1 {
					if !strings.Contains(string(data), "https://public.example:443") {
						t.Fatal("candidate did not contain the new host")
					}
					// Model Caddy accepting the POST before the reload CLI reports
					// that its request context has expired.
					liveConfig = string(data)
					<-ctx.Done()
					return ctx.Err()
				}
				cleanupContext = ctx
				if err := ctx.Err(); err != nil {
					t.Errorf("rollback inherited the expired request context: %v", err)
					return err
				}
				deadline, ok := ctx.Deadline()
				if !ok || time.Until(deadline) > 2*time.Second {
					t.Error("rollback must have an independent timeout of at most two seconds")
					return errors.New("unbounded rollback context")
				}
				if string(data) != oldConfig {
					t.Fatal("rollback did not reload the original configuration")
				}
				if restoreUnavailable {
					<-ctx.Done()
					return ctx.Err()
				}
				liveConfig = string(data)
				return nil
			}
			ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
			defer cancel()
			start := time.Now()
			r := c.configure(ctx, "https://public.example")
			if elapsed := time.Since(start); elapsed > 3*time.Second {
				t.Fatalf("rollback exceeded its bounded cleanup budget: %v", elapsed)
			}
			if r.HTTPStatus != 503 || r.Body.Code != "TLS_SERVICE_UNAVAILABLE" || reloads != 2 {
				t.Fatalf("expected a failed update and one rollback attempt: %+v; reloads=%d", r, reloads)
			}
			if c.broken != restoreUnavailable {
				t.Fatalf("broken=%v, want %v", c.broken, restoreUnavailable)
			}
			if !restoreUnavailable && liveConfig != oldConfig {
				t.Fatal("unpersisted candidate remained active after successful rollback")
			}
			if restoreUnavailable && liveConfig == oldConfig {
				t.Fatal("test did not model the unavailable restore")
			}
			for path, original := range before {
				data, err := os.ReadFile(path)
				if err != nil || string(data) != original {
					t.Fatalf("saved configuration changed after rejected update: %s (%v)", path, err)
				}
			}
			if len(c.hosts) != 1 || c.hosts[0] != oldHost {
				t.Fatalf("in-memory hosts changed after rejected update: %+v", c.hosts)
			}
			if cleanupContext == nil || cleanupContext.Err() == nil {
				t.Fatal("rollback did not release its cleanup context")
			}
			if !c.mu.TryLock() {
				t.Fatal("configuration mutex was not released after cleanup")
			}
			c.mu.Unlock()
			if restoreUnavailable {
				if r := c.configure(context.Background(), "https://another.example"); r.HTTPStatus != 503 || reloads != 2 {
					t.Fatal("failed rollback did not keep the controller fail-closed")
				}
			} else {
				assertResult(t, c.configure(context.Background(), "https://existing.local"), 200, true, "local")
			}
		})
	}
}

func TestRestartRetainsIssuerPolicyWithoutDNSReclassification(t *testing.T) {
	for _, mode := range []string{"local", "public"} {
		t.Run(mode, func(t *testing.T) {
			s := fixtureSettings(t)
			putState(t, s, []hostEntry{{"split-horizon.example", mode}})
			if err := prepare(s); err != nil {
				t.Fatal(err)
			}
			c, err := newController(s)
			if err != nil {
				t.Fatal(err)
			}
			c.ready = func(context.Context) error { return nil }
			c.resolve = func(context.Context, string) ([]netip.Addr, error) {
				t.Fatal("saved issuer must be retained")
				return nil, nil
			}
			c.reload = func(context.Context, string) error { t.Fatal("existing host must not reload"); return nil }
			c.probe = func(ctx context.Context, host, selected string) error {
				if selected != mode {
					t.Fatal("issuer changed")
				}
				return nil
			}
			assertResult(t, c.configure(context.Background(), "https://split-horizon.example"), 200, true, mode)
		})
	}
}

func TestConcurrentUpdatesAreSerializedAndNoLostState(t *testing.T) {
	c := fixtureController(t)
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			r := c.configure(context.Background(), fmt.Sprintf("https://host%d.local:8443", i))
			if r.HTTPStatus != 200 {
				t.Errorf("concurrent update failed: %+v", r)
			}
		}(i)
	}
	wg.Wait()
	loaded, err := loadState(c.s.statePath())
	if err != nil || len(loaded) != 8 || len(c.hosts) != 8 {
		t.Fatalf("lost updates: %v %v", loaded, err)
	}
}

func TestRequestBudgetIncludesMutexAndDNS(t *testing.T) {
	c := fixtureController(t)
	c.mu.Lock()
	ctx, cancel := context.WithTimeout(context.Background(), 40*time.Millisecond)
	defer cancel()
	start := time.Now()
	r := c.configure(ctx, "https://public.example")
	c.mu.Unlock()
	if r.HTTPStatus != 503 || time.Since(start) > time.Second {
		t.Fatalf("mutex wait ignored deadline: %+v", r)
	}
	c.resolve = func(ctx context.Context, host string) ([]netip.Addr, error) {
		deadline, ok := ctx.Deadline()
		if !ok || time.Until(deadline) > 1500*time.Millisecond {
			t.Error("DNS timeout is not bounded to 1.5s")
		}
		<-ctx.Done()
		return nil, ctx.Err()
	}
	ctx, stop := context.WithTimeout(context.Background(), 40*time.Millisecond)
	defer stop()
	assertResult(t, c.configure(ctx, "https://public.example"), 202, false, "")
}

func TestLocalPendingIsBounded(t *testing.T) {
	c := fixtureController(t)
	c.probe = func(ctx context.Context, host, mode string) error { <-ctx.Done(); return ctx.Err() }
	start := time.Now()
	assertResult(t, c.configure(context.Background(), "https://nas.local"), 202, true, "")
	if elapsed := time.Since(start); elapsed > 2*time.Second {
		t.Fatalf("local retry exceeded issuance probe budget: %v", elapsed)
	}
}
