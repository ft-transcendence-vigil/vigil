package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
)

const maxHosts = 32

type hostEntry struct {
	Host string `json:"host"`
	Mode string `json:"mode"`
}

type savedState struct {
	Version int         `json:"version"`
	Hosts   []hostEntry `json:"hosts"`
}

type settings struct {
	socket   string
	stateDir string
	base     string
	ca       string
}

func environment() settings {
	get := func(key, fallback string) string {
		if value := os.Getenv(key); value != "" {
			return value
		}
		return fallback
	}
	return settings{
		socket:   get("VIGIL_TLS_SOCKET", "/run/vigil-tls/control.sock"),
		stateDir: get("VIGIL_TLS_STATE_DIR", "/config/vigil-tls"),
		base:     get("VIGIL_TLS_BASE_CONFIG", "/etc/caddy/Caddyfile"),
		ca:       get("VIGIL_TLS_CA_PATH", "/public-ca/root.crt"),
	}
}

func (s settings) configPath() string { return filepath.Join(s.stateDir, "Caddyfile") }
func (s settings) statePath() string  { return filepath.Join(s.stateDir, "hosts.json") }

func decodeStrict(data []byte, dest any) error {
	d := json.NewDecoder(bytes.NewReader(data))
	d.DisallowUnknownFields()
	if err := d.Decode(dest); err != nil {
		return err
	}
	if err := d.Decode(new(any)); err != io.EOF {
		return errors.New("unexpected trailing JSON")
	}
	return nil
}

func loadState(path string) ([]hostEntry, error) {
	f, err := os.Open(path)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, 65537))
	if err != nil || len(data) > 65536 {
		return nil, errors.New("cannot read TLS state")
	}
	var state savedState
	if err := decodeStrict(data, &state); err != nil {
		return nil, fmt.Errorf("invalid TLS state: %w", err)
	}
	if state.Version != 1 || len(state.Hosts) > maxHosts {
		return nil, errors.New("unsupported TLS state or host limit exceeded")
	}
	seen := make(map[string]bool)
	for _, entry := range state.Hosts {
		a, err := normalize("https://" + hostAuthority(entry.Host))
		if err != nil || a.host != entry.Host || entry.Host == "localhost" || seen[entry.Host] || (entry.Mode != "local" && entry.Mode != "public") || (entry.Mode == "public" && localName(entry.Host)) {
			return nil, errors.New("invalid host or issuer in TLS state")
		}
		seen[entry.Host] = true
	}
	return state.Hosts, nil
}

func hostAuthority(host string) string {
	return net.JoinHostPort(host, "443")
}

func render(base []byte, hosts []hostEntry) []byte {
	out := append([]byte(nil), base...)
	for _, host := range hosts {
		out = append(out, []byte("\n\nhttps://"+hostAuthority(host.Host)+" {\n")...)
		if host.Mode == "local" {
			out = append(out, "\ttls internal\n"...)
		}
		out = append(out, "\timport vigil-routes\n}\n"...)
	}
	return out
}

// Stage in the destination directory so rename is atomic and never crosses volumes.
func stageFile(dir, pattern string, data []byte) (path string, err error) {
	f, err := os.CreateTemp(dir, pattern)
	if err != nil {
		return "", err
	}
	path = f.Name()
	stagedPath := path
	defer func() {
		f.Close()
		if err != nil {
			os.Remove(stagedPath)
		}
	}()
	if _, err = f.Write(data); err != nil {
		return "", err
	}
	if err = f.Sync(); err != nil {
		return "", err
	}
	if err = f.Close(); err != nil {
		return "", err
	}
	return path, nil
}

func atomicWrite(path string, data []byte) error {
	tmp, err := stageFile(filepath.Dir(path), ".tls-write-*", data)
	if err != nil {
		return err
	}
	defer os.Remove(tmp)
	return os.Rename(tmp, path)
}

func readInputs(s settings) ([]byte, []hostEntry, error) {
	base, err := os.ReadFile(s.base)
	if err != nil {
		return nil, nil, err
	}
	hosts, err := loadState(s.statePath())
	return base, hosts, err
}

func prepare(s settings) error {
	base, hosts, err := readInputs(s)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(s.stateDir, 0700); err != nil {
		return err
	}
	return atomicWrite(s.configPath(), render(base, hosts))
}
