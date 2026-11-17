package main

import (
	"context"
	"errors"
	"net"
	"net/netip"
	"net/url"
	"strconv"
	"strings"
	"unicode"
)

type address struct {
	origin string
	host   string
}

func normalize(raw string) (address, error) {
	invalid := errors.New("expected an HTTPS origin with a valid ASCII hostname or IP address")
	if strings.ContainsAny(raw, "\\*?#") || strings.IndexFunc(raw, func(r rune) bool { return unicode.IsSpace(r) || unicode.IsControl(r) }) >= 0 {
		return address{}, invalid
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Opaque != "" || u.User != nil || u.Host == "" || (u.Path != "" && u.Path != "/") || u.RawPath != "" || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" {
		return address{}, invalid
	}
	host := strings.ToLower(u.Hostname())
	ip, ipErr := netip.ParseAddr(host)
	if ipErr == nil {
		if ip.Zone() != "" {
			return address{}, invalid
		}
		host = ip.Unmap().String()
	} else if !validDNSName(host) {
		return address{}, invalid
	}
	// Reject malformed authorities (including bare IPv6, empty ports and stray brackets).
	authorityHost := host
	if strings.Contains(host, ":") {
		authorityHost = "[" + host + "]"
	}
	originalHost := u.Hostname()
	originalAuthority := originalHost
	if strings.Contains(originalHost, ":") {
		originalAuthority = "[" + originalHost + "]"
	}
	port := u.Port()
	if port != "" {
		n, err := strconv.Atoi(port)
		if err != nil || n < 1 || n > 65535 {
			return address{}, invalid
		}
		for _, c := range port {
			if c < '0' || c > '9' {
				return address{}, invalid
			}
		}
		originalAuthority += ":" + port
		if n != 443 {
			authorityHost += ":" + strconv.Itoa(n)
		}
	}
	if u.Host != originalAuthority || (strings.HasPrefix(u.Host, "[") && ipErr != nil) {
		return address{}, invalid
	}
	return address{origin: "https://" + authorityHost, host: host}, nil
}

func validDNSName(host string) bool {
	if len(host) == 0 || len(host) > 253 {
		return false
	}
	for _, label := range strings.Split(host, ".") {
		if len(label) == 0 || len(label) > 63 || label[0] == '-' || label[len(label)-1] == '-' {
			return false
		}
		for _, c := range label {
			if !(c >= 'a' && c <= 'z' || c >= '0' && c <= '9' || c == '-') {
				return false
			}
		}
	}
	// Numeric dotted strings must be genuine IP literals, not ambiguous legacy IPv4.
	return strings.Trim(host, "0123456789.") != ""
}

func localName(host string) bool {
	if _, err := netip.ParseAddr(host); err == nil {
		return true
	}
	return host == "localhost" || strings.HasSuffix(host, ".localhost") || host == "local" || strings.HasSuffix(host, ".local")
}

var nonPublicRanges = []netip.Prefix{
	netip.MustParsePrefix("0.0.0.0/8"),
	netip.MustParsePrefix("100.64.0.0/10"),
	netip.MustParsePrefix("192.0.0.0/24"),
	netip.MustParsePrefix("192.0.2.0/24"),
	netip.MustParsePrefix("192.88.99.0/24"),
	netip.MustParsePrefix("198.18.0.0/15"),
	netip.MustParsePrefix("198.51.100.0/24"),
	netip.MustParsePrefix("203.0.113.0/24"),
	netip.MustParsePrefix("240.0.0.0/4"),
	netip.MustParsePrefix("2001:2::/48"),
	netip.MustParsePrefix("2001:db8::/32"),

	netip.MustParsePrefix("3fff::/20"),
}

func publicIP(ip netip.Addr) bool {
	ip = ip.Unmap()
	if !ip.IsGlobalUnicast() || ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() {
		return false
	}
	// IPv6 global unicast is currently allocated from 2000::/3; this also excludes
	// translation/discard prefixes that must not opt a private deployment into ACME.
	if ip.Is6() && !netip.MustParsePrefix("2000::/3").Contains(ip) {
		return false
	}
	for _, prefix := range nonPublicRanges {
		if prefix.Contains(ip) {
			return false
		}
	}
	return true
}

type resolver func(context.Context, string) ([]netip.Addr, error)

func lookup(ctx context.Context, host string) ([]netip.Addr, error) {
	return net.DefaultResolver.LookupNetIP(ctx, "ip", host)
}

func classify(ctx context.Context, host string, resolve resolver) (string, error) {
	if localName(host) {
		return "local", nil
	}
	ips, err := resolve(ctx, host)
	if err != nil || len(ips) == 0 {
		return "", errors.New("DNS resolution pending")
	}
	for _, ip := range ips {
		if !publicIP(ip) {
			return "local", nil
		}
	}
	return "public", nil
}
