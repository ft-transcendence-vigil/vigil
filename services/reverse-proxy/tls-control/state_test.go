package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

const testBase = "{\n admin localhost:2019\n default_sni localhost\n}\n(vigil-routes) {\n respond \"ok\"\n}\nlocalhost {\n tls internal\n import vigil-routes\n}\n"

func fixtureSettings(t *testing.T) settings {
	t.Helper()
	dir := t.TempDir()
	s := settings{socket: filepath.Join(dir, "control.sock"), stateDir: filepath.Join(dir, "state"), base: filepath.Join(dir, "base.Caddyfile"), ca: filepath.Join(dir, "root.crt")}
	if err := os.WriteFile(s.base, []byte(testBase), 0600); err != nil {
		t.Fatal(err)
	}
	if err := prepare(s); err != nil {
		t.Fatal(err)
	}
	return s
}

func putState(t *testing.T, s settings, hosts []hostEntry) {
	t.Helper()
	data, err := json.Marshal(savedState{Version: 1, Hosts: hosts})
	if err != nil {
		t.Fatal(err)
	}
	if err := atomicWrite(s.statePath(), data); err != nil {
		t.Fatal(err)
	}
}

func TestPrepareRestoresSavedHostsPreservingBase(t *testing.T) {
	s := fixtureSettings(t)
	hosts := []hostEntry{{"private.example", "local"}, {"public.example", "public"}, {"2001:db8::1", "local"}}
	putState(t, s, hosts)
	// The generated file is disposable; hosts.json, not this file, is authoritative.
	if err := os.WriteFile(s.configPath(), []byte("stale/tampered generated file"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := prepare(s); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(s.configPath())
	if err != nil {
		t.Fatal(err)
	}
	want := testBase + "\n\nhttps://private.example:443 {\n\ttls internal\n\timport vigil-routes\n}\n" +
		"\n\nhttps://public.example:443 {\n\timport vigil-routes\n}\n" +
		"\n\nhttps://[2001:db8::1]:443 {\n\ttls internal\n\timport vigil-routes\n}\n"
	if string(got) != want {
		t.Fatalf("rendered config mismatch:\n%s", got)
	}
	loaded, err := loadState(s.statePath())
	if err != nil || !reflect.DeepEqual(loaded, hosts) {
		t.Fatalf("state round trip: %v %v", loaded, err)
	}
	base, _ := os.ReadFile(s.base)
	if string(base) != testBase {
		t.Fatal("base configuration was modified")
	}
	for _, path := range []string{s.configPath(), s.statePath()} {
		info, err := os.Stat(path)
		if err != nil || info.Mode().Perm() != 0600 {
			t.Fatalf("private file mode %s: %v %v", path, info, err)
		}
	}
}

func TestRejectTamperedState(t *testing.T) {
	s := fixtureSettings(t)
	states := []string{
		`{}`, `null`, `{"version":2,"hosts":[]}`, `{"version":1,"hosts":[],"extra":true}`,
		`{"version":1,"hosts":[{"host":"evil.example\n{","mode":"public"}]}`,
		`{"version":1,"hosts":[{"host":"https://evil.example","mode":"public"}]}`,
		`{"version":1,"hosts":[{"host":"EXAMPLE.com","mode":"public"}]}`,
		`{"version":1,"hosts":[{"host":"public.example","mode":"auto"}]}`,
		`{"version":1,"hosts":[{"host":"localhost","mode":"local"}]}`,
		`{"version":1,"hosts":[{"host":"nas.local","mode":"public"}]}`,
		`{"version":1,"hosts":[{"host":"127.0.0.1","mode":"public"}]}`,
		`{"version":1,"hosts":[{"host":"example.com:8443","mode":"local"}]}`,
		`{"version":1,"hosts":[{"host":"2001:0db8::1","mode":"local"}]}`,
		`{"version":1,"hosts":[{"host":"example.com","mode":"local"},{"host":"example.com","mode":"public"}]}`,
		`{"version":1,"hosts":[]} {}`, strings.Repeat(" ", 65537),
	}
	hosts := make([]hostEntry, maxHosts+1)
	for i := range hosts {
		hosts[i] = hostEntry{fmt.Sprintf("host%d.local", i), "local"}
	}
	tooMany, _ := json.Marshal(savedState{Version: 1, Hosts: hosts})
	states = append(states, string(tooMany))
	for i, raw := range states {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			if err := os.WriteFile(s.statePath(), []byte(raw), 0600); err != nil {
				t.Fatal(err)
			}
			if err := prepare(s); err == nil {
				t.Fatalf("accepted invalid state %s", raw)
			}
			if data, _ := os.ReadFile(s.configPath()); string(data) != testBase {
				t.Fatal("prepare changed generated config on invalid state")
			}
		})
	}
}

func TestAtomicWriteFailureLeavesOriginalAndNoStagingFiles(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "target")
	if err := os.Mkdir(path, 0700); err != nil {
		t.Fatal(err)
	}
	if err := atomicWrite(path, []byte("new")); err == nil {
		t.Fatal("rename over directory should fail")
	}
	entries, err := os.ReadDir(dir)
	if err != nil || len(entries) != 1 || entries[0].Name() != "target" {
		t.Fatalf("temporary files leaked: %v %v", entries, err)
	}
}

func TestEnvironment(t *testing.T) {
	for _, key := range []string{"VIGIL_TLS_SOCKET", "VIGIL_TLS_STATE_DIR", "VIGIL_TLS_BASE_CONFIG", "VIGIL_TLS_CA_PATH"} {
		t.Setenv(key, "")
	}
	if got := environment(); got != (settings{"/run/vigil-tls/control.sock", "/config/vigil-tls", "/etc/caddy/Caddyfile", "/public-ca/root.crt"}) {
		t.Fatalf("defaults: %+v", got)
	}
	t.Setenv("VIGIL_TLS_SOCKET", "/tmp/custom.sock")
	t.Setenv("VIGIL_TLS_STATE_DIR", "/tmp/custom-state")
	t.Setenv("VIGIL_TLS_BASE_CONFIG", "/tmp/base")
	t.Setenv("VIGIL_TLS_CA_PATH", "/tmp/root")
	if got := environment(); got != (settings{"/tmp/custom.sock", "/tmp/custom-state", "/tmp/base", "/tmp/root"}) {
		t.Fatalf("overrides: %+v", got)
	}
}
