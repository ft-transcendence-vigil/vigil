package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"time"
)

const (
	caddyBinary   = "/usr/bin/caddy"
	caddyAdmin    = "localhost:2019"
	probeTarget   = "127.0.0.1:443"
	requestBudget = 7 * time.Second
)

type response struct {
	HTTPStatus int  `json:"http_status"`
	Body       body `json:"body"`
}

type body struct {
	Address       string `json:"address,omitempty"`
	Configured    *bool  `json:"configured,omitempty"`
	Status        string `json:"status,omitempty"`
	TLSMode       string `json:"tls_mode,omitempty"`
	OTLPEndpoint  string `json:"otlp_endpoint,omitempty"`
	CADownloadURL any    `json:"ca_download_url,omitempty"`
	Code          string `json:"code"`
	RetryAfter    int    `json:"retry_after_seconds,omitempty"`
	Message       string `json:"message"`
}

func failure(status int, code, message string) response {
	return response{HTTPStatus: status, Body: body{Code: code, Message: message}}
}

func result(a address, configured bool, mode string, verified, duplicate bool, code string) response {
	b := body{Address: a.origin, Configured: &configured, Status: "pending", OTLPEndpoint: a.origin + "/otlp", Code: code, RetryAfter: 3, Message: "TLS certificate is not ready; retry shortly.", CADownloadURL: json.RawMessage("null")}
	if mode == "local" {
		b.CADownloadURL = "/api/config/tls/ca"
	}
	r := response{HTTPStatus: 202, Body: b}
	if verified {
		r.HTTPStatus = 200
		r.Body.Status, r.Body.TLSMode, r.Body.RetryAfter = "verified", mode, 0
		r.Body.Message = "TLS certificate verified."
		if duplicate {
			r.HTTPStatus = 409
			r.Body.Code = "ALREADY_CONFIGURED"
			r.Body.Message = "This hostname is already configured and its TLS certificate is verified."
		}
	} else if code == "DNS_PENDING" {
		r.Body.Message = "DNS resolution is not ready; no configuration was changed."
	}
	return r
}

// Hooks keep tests on loopback and make DNS, Caddy and filesystem failures deterministic.
// Production supplies only the fixed admin address, binary and TLS probe target below.
type controller struct {
	mu        sync.Mutex
	s         settings
	base      []byte
	hosts     []hostEntry
	broken    bool
	confirmed map[string]bool
	resolve   resolver
	ready     func(context.Context) error
	reload    func(context.Context, string) error
	probe     func(context.Context, string, string) error
	write     func(string, []byte) error
}

func newController(s settings) (*controller, error) {
	base, hosts, err := readInputs(s)
	if err != nil {
		return nil, err
	}
	client := &http.Client{
		Timeout:       400 * time.Millisecond,
		Transport:     &http.Transport{Proxy: nil, DialContext: (&net.Dialer{Timeout: 300 * time.Millisecond}).DialContext},
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}
	c := &controller{s: s, base: base, hosts: hosts, resolve: lookup, reload: reloadCaddy, write: atomicWrite}
	c.ready = func(ctx context.Context) error {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://"+caddyAdmin+"/config/", nil)
		if err != nil {
			return err
		}
		r, err := client.Do(req)
		if err != nil {
			return err
		}
		defer r.Body.Close()
		if r.StatusCode != http.StatusOK {
			return errors.New("Caddy admin unavailable")
		}
		return nil
	}
	c.probe = func(ctx context.Context, host, mode string) error {
		return verifyCertificate(ctx, host, mode, s.ca, (&net.Dialer{}).DialContext, x509.SystemCertPool)
	}
	return c, nil
}

func reloadCaddy(ctx context.Context, path string) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	// reload adapts the Caddyfile, and the admin API validates the complete candidate
	// before replacing its active config. Never use a shell or interpolate addresses.
	cmd := exec.CommandContext(ctx, caddyBinary, "reload", "--config", path, "--adapter", "caddyfile", "--address", caddyAdmin)
	cmd.Stdout, cmd.Stderr = io.Discard, io.Discard
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("Caddy reload failed: %w", err)
	}
	return nil
}

func verifyCertificate(ctx context.Context, host, mode, caPath string, dial func(context.Context, string, string) (net.Conn, error), systemRoots func() (*x509.CertPool, error)) error {
	var roots *x509.CertPool
	if mode == "local" {
		pem, err := os.ReadFile(caPath)
		if err != nil {
			return err
		}
		roots = x509.NewCertPool()
		if !roots.AppendCertsFromPEM(pem) {
			return errors.New("installation root is not valid PEM")
		}
	} else if mode == "public" {
		var err error
		roots, err = systemRoots()
		if err != nil || roots == nil {
			return errors.New("system trust roots unavailable")
		}
	} else {
		return errors.New("invalid issuer policy")
	}
	conn, err := dial(ctx, "tcp", probeTarget)
	if err != nil {
		return err
	}
	defer conn.Close()
	config := &tls.Config{ServerName: host, RootCAs: roots, MinVersion: tls.VersionTLS12}
	if net.ParseIP(host) != nil {
		// Go omits literal IPs from SNI. A trailing dot is stripped when encoding
		// SNI, but prevents that omission, selecting Caddy's exact IP certificate
		// rather than its default localhost certificate over our loopback socket.
		// Since the dotted value is not an IP SAN, replace the built-in verifier
		// with mandatory, equivalent chain + exact IP SAN verification.
		config.ServerName = host + "."
		config.InsecureSkipVerify = true // VerifyConnection below always verifies.
		config.VerifyConnection = func(state tls.ConnectionState) error {
			if len(state.PeerCertificates) == 0 {
				return errors.New("TLS peer sent no certificate")
			}
			intermediates := x509.NewCertPool()
			for _, cert := range state.PeerCertificates[1:] {
				intermediates.AddCert(cert)
			}
			_, err := state.PeerCertificates[0].Verify(x509.VerifyOptions{Roots: roots, Intermediates: intermediates, DNSName: host})
			return err
		}
	} else if mode == "public" {
		// Caddy may install its local root into the OS trust store. Even then a
		// chain ending in this installation's exported root is never public TLS.
		rootPEM, _ := os.ReadFile(caPath)
		if block, _ := pem.Decode(rootPEM); block != nil {
			if localRoot, err := x509.ParseCertificate(block.Bytes); err == nil {
				config.VerifyConnection = func(state tls.ConnectionState) error {
					for _, chain := range state.VerifiedChains {
						if !bytes.Equal(chain[len(chain)-1].Raw, localRoot.Raw) {
							return nil
						}
					}
					return errors.New("installation certificate cannot prove public TLS")
				}
			}
		}
	}
	tc := tls.Client(conn, config)
	// No user-selected dial destination, HTTP probe or cached verified bit.
	return tc.HandshakeContext(ctx)
}

func (c *controller) acquire(ctx context.Context) bool {
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()
	for {
		if ctx.Err() != nil {
			return false
		}
		if c.mu.TryLock() {
			return true
		}
		select {
		case <-ctx.Done():
			return false
		case <-ticker.C:
		}
	}
}

func unavailable() response {
	return failure(503, "TLS_SERVICE_UNAVAILABLE", "TLS configuration service is temporarily unavailable; retry shortly.")
}

func (c *controller) configure(ctx context.Context, raw string) response {
	ctx, cancel := context.WithTimeout(ctx, requestBudget)
	defer cancel()
	a, err := normalize(raw)
	if err != nil {
		return failure(400, "INVALID_ADDRESS", err.Error())
	}
	if !c.acquire(ctx) {
		return unavailable()
	}
	defer c.mu.Unlock()
	if c.broken || c.ready(ctx) != nil {
		return unavailable()
	}
	mode, exists := "", false
	if a.host == "localhost" {
		mode, exists = "local", true
	}
	for _, entry := range c.hosts {
		if entry.Host == a.host {
			mode, exists = entry.Mode, true
			break
		}
	}
	if !exists {
		if len(c.hosts) >= maxHosts {
			return failure(400, "HOST_LIMIT_REACHED", "The maximum of 32 configured hostnames has been reached.")
		}
		dnsCtx, stop := context.WithTimeout(ctx, 1500*time.Millisecond)
		mode, err = classify(dnsCtx, a.host, c.resolve)
		stop()
		if err != nil {
			return result(a, false, "", false, false, "DNS_PENDING")
		}
		next := append(append([]hostEntry(nil), c.hosts...), hostEntry{Host: a.host, Mode: mode})
		if err := c.install(ctx, next); err != nil {
			log.Printf("TLS configuration update failed: %v", err)
			return unavailable()
		}
	}
	if c.verify(ctx, a.host, mode) {
		duplicate := a.host == "localhost" || c.confirmed[a.host]
		if c.confirmed == nil {
			c.confirmed = make(map[string]bool)
		}
		// This records only whether to return 200 or 409, never a trust decision.
		// Every request above still performs a fresh certificate verification.
		c.confirmed[a.host] = true
		return result(a, true, mode, true, duplicate, "TLS_VERIFIED")
	}
	return result(a, true, mode, false, false, "CERTIFICATE_PENDING")
}

func (c *controller) verify(ctx context.Context, host, mode string) bool {
	budget := 600 * time.Millisecond
	if mode == "local" {
		budget = 1600 * time.Millisecond
	}
	ctx, cancel := context.WithTimeout(ctx, budget)
	defer cancel()
	for {
		attempt, stop := context.WithTimeout(ctx, 400*time.Millisecond)
		err := c.probe(attempt, host, mode)
		stop()
		if err == nil && ctx.Err() == nil {
			return true
		}
		if mode == "public" {
			return false
		}
		timer := time.NewTimer(150 * time.Millisecond)
		select {
		case <-ctx.Done():
			timer.Stop()
			return false
		case <-timer.C:
		}
	}
}

func (c *controller) install(ctx context.Context, next []hostEntry) error {
	config := render(c.base, next)
	candidate, err := stageFile(c.s.stateDir, ".Caddyfile-candidate-*", config)
	if err != nil {
		return err
	}
	defer os.Remove(candidate)
	if err := c.reload(ctx, candidate); err != nil {
		// A timed-out CLI can have delivered its POST before being killed. Roll back
		// even on reload errors so a rejected request cannot leave an untracked host.
		c.rollback(ctx)
		return err
	}
	state, err := json.Marshal(savedState{Version: 1, Hosts: next})
	if err == nil {
		err = c.write(c.s.configPath(), config)
	}
	if err == nil {
		err = c.write(c.s.statePath(), state)
	}
	if err != nil {
		c.rollback(ctx)
		return err
	}
	c.hosts = next
	return nil
}

func (c *controller) rollback(ctx context.Context) {
	// Caddy may have accepted the candidate before the request expired. Cleanup
	// must outlive that request, but stay bounded while configure holds the mutex.
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Second)
	defer cancel()
	old := render(c.base, c.hosts)
	path, err := stageFile(c.s.stateDir, ".Caddyfile-rollback-*", old)
	if err == nil {
		defer os.Remove(path)
		err = c.reload(ctx, path)
	}
	if err == nil {
		err = c.write(c.s.configPath(), old)
	}
	if err != nil {
		// Refuse later changes rather than claiming a known policy after a failed
		// rollback. prepare + restart reconstructs the authoritative saved state.
		c.broken = true
		log.Printf("TLS rollback failed; restart required: %v", err)
	}
}
