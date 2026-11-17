package main

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"io"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"
)

type testAuthority struct {
	cert *x509.Certificate
	key  *ecdsa.PrivateKey
	pem  []byte
}

func makeAuthority(t *testing.T, name string) testAuthority {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	template := &x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: name}, IsCA: true, BasicConstraintsValid: true, KeyUsage: x509.KeyUsageCertSign, NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour)}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	cert, err := x509.ParseCertificate(der)
	if err != nil {
		t.Fatal(err)
	}
	return testAuthority{cert, key, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})}
}

func certificateServer(t *testing.T, authority testAuthority, names []string, expired bool) (string, <-chan string) {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	leaf := &x509.Certificate{SerialNumber: big.NewInt(2), DNSNames: names, IPAddresses: []net.IP{net.ParseIP("192.0.2.1"), net.ParseIP("2001:db8::1")}, NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour), KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}}
	if expired {
		leaf.NotAfter = time.Now().Add(-time.Minute)
	}
	der, err := x509.CreateCertificate(rand.Reader, leaf, authority.cert, &key.PublicKey, authority.key)
	if err != nil {
		t.Fatal(err)
	}
	observedSNI := make(chan string, 32)
	config := &tls.Config{MinVersion: tls.VersionTLS12, Certificates: []tls.Certificate{{Certificate: [][]byte{der}, PrivateKey: key}}, GetConfigForClient: func(info *tls.ClientHelloInfo) (*tls.Config, error) { observedSNI <- info.ServerName; return nil, nil }}
	listener, err := tls.Listen("tcp", "127.0.0.1:0", config)
	if err != nil {
		t.Fatal(err)
	}
	finished := make(chan struct{})
	go func() {
		defer close(finished)
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			conn.SetDeadline(time.Now().Add(2 * time.Second))
			// Read forces the server-side handshake, including on rejected certificates.
			io.Copy(io.Discard, conn)
			conn.Close()
		}
	}()
	t.Cleanup(func() { listener.Close(); <-finished })
	return listener.Addr().String(), observedSNI
}

func TestActualTCPCertificateVerification(t *testing.T) {
	installation := makeAuthority(t, "installation root")
	public := makeAuthority(t, "test system root")
	rootPath := filepath.Join(t.TempDir(), "root.crt")
	if err := os.WriteFile(rootPath, installation.pem, 0600); err != nil {
		t.Fatal(err)
	}
	publicPool := x509.NewCertPool()
	publicPool.AddCert(public.cert)
	systemCalls := 0
	systemRoots := func() (*x509.CertPool, error) { systemCalls++; return publicPool, nil }
	for _, test := range []struct {
		name, host, mode  string
		authority         testAuthority
		expired, succeeds bool
	}{
		{"installation trusted", "local.example", "local", installation, false, true},
		{"public trusted", "public.example", "public", public, false, true},
		{"local cannot prove public", "public.example", "public", installation, false, false},
		{"public cannot prove local", "local.example", "local", public, false, false},
		{"wrong SAN", "wrong.example", "public", public, false, false},
		{"expired", "public.example", "public", public, true, false},
		{"IPv4 SAN", "192.0.2.1", "local", installation, false, true},
		{"IPv6 SAN", "2001:db8::1", "local", installation, false, true},
		{"wrong IP SAN", "192.0.2.2", "local", installation, false, false},
		{"expired IP SAN", "192.0.2.1", "local", installation, true, false},
		{"untrusted IP issuer", "192.0.2.1", "local", public, false, false},
	} {
		t.Run(test.name, func(t *testing.T) {
			target, sni := certificateServer(t, test.authority, []string{"local.example", "public.example"}, test.expired)
			dialed := false
			dial := func(ctx context.Context, network, address string) (net.Conn, error) {
				if network != "tcp" || address != "127.0.0.1:443" {
					t.Fatalf("non-loopback probe: %s %s", network, address)
				}
				dialed = true
				return (&net.Dialer{}).DialContext(ctx, network, target)
			}
			ctx, cancel := context.WithTimeout(context.Background(), time.Second)
			defer cancel()
			before := systemCalls
			err := verifyCertificate(ctx, test.host, test.mode, rootPath, dial, systemRoots)
			if (err == nil) != test.succeeds || !dialed {
				t.Fatalf("verification: %v, want success=%v", err, test.succeeds)
			}
			if test.mode == "local" && systemCalls != before {
				t.Fatal("local verification consulted system roots")
			}
			select {
			case got := <-sni:
				if got != test.host {
					t.Fatalf("SNI %q != requested host %q", got, test.host)
				}
			case <-ctx.Done():
				t.Fatal("server did not observe SNI")
			}
		})
	}
	// Public TLS does not depend on the installation root being available.
	target, _ := certificateServer(t, public, []string{"public.example"}, false)
	dial := func(ctx context.Context, network, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, network, target)
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := verifyCertificate(ctx, "public.example", "public", "/nonexistent/installation/root", dial, systemRoots); err != nil {
		t.Fatal(err)
	}
	// Some Caddy installations import their own root into OS trust. This must
	// still never turn an installation-signed certificate into public mode.
	publicPool.AddCert(installation.cert)
	target, _ = certificateServer(t, installation, []string{"public.example"}, false)
	if err := verifyCertificate(ctx, "public.example", "public", rootPath, dial, systemRoots); err == nil {
		t.Fatal("installation root in system trust was incorrectly accepted as public")
	}
}

func TestMissingOrInvalidRootsDoNotDial(t *testing.T) {
	dial := func(context.Context, string, string) (net.Conn, error) {
		t.Fatal("must not dial without valid trust roots")
		return nil, nil
	}
	path := filepath.Join(t.TempDir(), "root.crt")
	if err := os.WriteFile(path, []byte("not PEM"), 0600); err != nil {
		t.Fatal(err)
	}
	for _, test := range []struct{ mode, path string }{{"local", path}, {"local", path + ".missing"}, {"public", path}, {"invalid", path}} {
		err := verifyCertificate(context.Background(), "example.com", test.mode, test.path, dial, func() (*x509.CertPool, error) { return nil, nil })
		if err == nil {
			t.Fatal("accepted invalid roots/mode")
		}
	}
}

func TestTCPHandshakeDeadline(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	connReady := make(chan net.Conn, 1)
	go func() { conn, _ := listener.Accept(); connReady <- conn }()
	dial := func(ctx context.Context, network, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, network, listener.Addr().String())
	}
	ctx, cancel := context.WithTimeout(context.Background(), 40*time.Millisecond)
	defer cancel()
	start := time.Now()
	err = verifyCertificate(ctx, "example.com", "public", "", dial, func() (*x509.CertPool, error) { return x509.NewCertPool(), nil })
	if err == nil || time.Since(start) > time.Second {
		t.Fatalf("handshake ignored deadline: %v", err)
	}
	if conn := <-connReady; conn != nil {
		conn.Close()
	}
}
