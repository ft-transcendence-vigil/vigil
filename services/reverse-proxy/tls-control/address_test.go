package main

import (
	"context"
	"errors"
	"net/netip"
	"strings"
	"testing"
)

func TestNormalize(t *testing.T) {
	valid := []struct{ input, origin, host string }{
		{"https://EXAMPLE.com/", "https://example.com", "example.com"},
		{"https://Example.com:00443", "https://example.com", "example.com"},
		{"https://localhost:08443/", "https://localhost:8443", "localhost"},
		{"https://192.0.2.1:65535", "https://192.0.2.1:65535", "192.0.2.1"},
		{"https://[2001:0DB8:0:0::1]:8443/", "https://[2001:db8::1]:8443", "2001:db8::1"},
		{"https://[::1]", "https://[::1]", "::1"},
		{"https://[::ffff:192.0.2.1]", "https://192.0.2.1", "192.0.2.1"},
		{"https://xn--bcher-kva.example", "https://xn--bcher-kva.example", "xn--bcher-kva.example"},
		{"https://single-label", "https://single-label", "single-label"},
	}
	for _, test := range valid {
		t.Run(test.input, func(t *testing.T) {
			a, err := normalize(test.input)
			if err != nil || a.origin != test.origin || a.host != test.host {
				t.Fatalf("normalize = %+v, %v; want %s, %s", a, err, test.origin, test.host)
			}
		})
	}
	invalid := []string{
		"", "example.com", "//example.com", "http://example.com", "https:example.com", "ftp://example.com",
		"https://user:pass@example.com", "https://@example.com", "https://example.com/a", "https://example.com//",
		"https://example.com?", "https://example.com?q=a", "https://example.com#", "https://example.com/#a",
		" https://example.com", "https://example.com\t", "https://exa\nmple.com", "https://example.com\x00",
		"https://example.com\u00a0", "https://example.com\\evil", "https://*.example.com", "https://example.com/{}",
		"https://foo_bar.com", "https://éxample.com", "https://example.com.", "https://.example.com", "https://a..b",
		"https://-a.example", "https://a-.example", "https://" + strings.Repeat("a", 64) + ".example",
		"https://" + strings.Repeat("abc.", 64) + "abc", "https://example.com:", "https://example.com:0",
		"https://example.com:65536", "https://example.com:-1", "https://example.com:+443", "https://example.com:abc",
		"https://[::1", "https://::1", "https://[example.com]", "https://[127.0.0.1]", "https://[fe80::1%25eth0]",
		"https://127.01.0.1", "https://127.1", "https://2130706433", "https://256.0.0.1", "https://example.com/%2f",
		"https://exa%6dple.com", "https://a{b}.example", "https://a\"b.example", "https://a`b.example",
	}
	for _, raw := range invalid {
		t.Run(raw, func(t *testing.T) {
			if a, err := normalize(raw); err == nil {
				t.Fatalf("accepted invalid origin: %+v", a)
			}
		})
	}
}

func TestPublicIP(t *testing.T) {
	local := []string{
		"0.0.0.0", "0.1.2.3", "10.2.3.4", "127.0.0.1", "172.16.1.2", "192.168.1.2", "169.254.1.2",
		"100.64.0.1", "100.127.255.254", "192.0.0.1", "192.0.2.1", "198.51.100.1", "203.0.113.1",
		"198.18.0.1", "224.0.0.1", "240.0.0.1", "255.255.255.255", "::", "::1", "fc00::1", "fd12::1",
		"fe80::1", "ff02::1", "2001:db8::1", "2001:2::1", "3fff::1", "64:ff9b::a00:1", "::ffff:192.168.1.2",
	}
	for _, raw := range local {
		if publicIP(netip.MustParseAddr(raw)) {
			t.Errorf("nonpublic address classified public: %s", raw)
		}
	}
	for _, raw := range []string{"1.1.1.1", "8.8.8.8", "100.128.0.1", "172.32.0.1", "2606:4700:4700::1111", "2001:4860:4860::8888", "2001:3::1", "::ffff:8.8.8.8"} {
		if !publicIP(netip.MustParseAddr(raw)) {
			t.Errorf("public address classified local: %s", raw)
		}
	}
}

func TestClassify(t *testing.T) {
	neverDNS := func(context.Context, string) ([]netip.Addr, error) { t.Fatal("unexpected DNS lookup"); return nil, nil }
	for _, host := range []string{"localhost", "a.localhost", "local", "nas.local", "127.0.0.1", "8.8.8.8", "::1", "2001:4860::1"} {
		mode, err := classify(context.Background(), host, neverDNS)
		if mode != "local" || err != nil {
			t.Errorf("literal/local name %s: %s %v", host, mode, err)
		}
	}
	for _, test := range []struct {
		ips  []netip.Addr
		want string
	}{
		{[]netip.Addr{netip.MustParseAddr("1.1.1.1"), netip.MustParseAddr("2606:4700::1")}, "public"},
		{[]netip.Addr{netip.MustParseAddr("1.1.1.1"), netip.MustParseAddr("192.0.2.5")}, "local"},
		{[]netip.Addr{netip.MustParseAddr("fd00::1")}, "local"},
	} {
		mode, err := classify(context.Background(), "arbitrary.example", func(context.Context, string) ([]netip.Addr, error) { return test.ips, nil })
		if mode != test.want || err != nil {
			t.Fatalf("classify %v: %s, %v", test.ips, mode, err)
		}
	}
	for _, lookup := range []resolver{
		func(context.Context, string) ([]netip.Addr, error) { return nil, nil },
		func(context.Context, string) ([]netip.Addr, error) { return nil, errors.New("NXDOMAIN") },
	} {
		if _, err := classify(context.Background(), "missing.example", lookup); err == nil {
			t.Fatal("unresolved DNS must stay pending")
		}
	}
}

func FuzzNormalize(f *testing.F) {
	for _, raw := range []string{"https://example.com", "https://[::1]:8443/", "https://a\n{b}", "https://127.0.0.1"} {
		f.Add(raw)
	}
	f.Fuzz(func(t *testing.T, raw string) {
		a, err := normalize(raw)
		if err != nil {
			return
		}
		again, err := normalize(a.origin)
		if err != nil || again != a {
			t.Fatalf("non-idempotent canonicalization: %q -> %+v -> %+v (%v)", raw, a, again, err)
		}
		if _, err := netip.ParseAddr(a.host); err != nil && !validDNSName(a.host) {
			t.Fatalf("unsafe interpolated host %q", a.host)
		}
	})
}
