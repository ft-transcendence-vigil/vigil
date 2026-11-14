package main

import (
	"bufio"
	"context"
	"encoding/json"
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func pipeRequest(t *testing.T, c *controller, input string, halfClose bool) response {
	t.Helper()
	// A real Unix socket also lets the client terminate an incomplete request.
	path := filepath.Join(t.TempDir(), "request.sock")
	listener, err := net.ListenUnix("unix", &net.UnixAddr{Name: path, Net: "unix"})
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	done := make(chan struct{})
	go func() {
		defer close(done)
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		c.handle(context.Background(), conn)
	}()
	conn, err := net.DialUnix("unix", nil, &net.UnixAddr{Name: path, Net: "unix"})
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(3 * time.Second))
	if _, err := conn.Write([]byte(input)); err != nil {
		t.Fatal(err)
	}
	if halfClose {
		conn.CloseWrite()
	}
	var r response
	if err := json.NewDecoder(conn).Decode(&r); err != nil {
		t.Fatal(err)
	}
	<-done
	return r
}

func TestSocketFramingAndStrictRequest(t *testing.T) {
	c := fixtureController(t)
	for _, input := range []string{
		"{}\n", "null\n", "[]\n", "not JSON\n", "{\n",
		`{"operation":"read","address":"https://localhost"}` + "\n",
		`{"operation":"configure","address":"https://localhost","admin":"/config"}` + "\n",
		`{"operation":"configure","address":7}` + "\n",
		`{"operation":"configure","address":"https://localhost"} {}` + "\n",
		strings.Repeat(" ", maxRequestBytes) + "\n",
	} {
		r := pipeRequest(t, c, input, true)
		if r.HTTPStatus != 400 || r.Body.Code != "INVALID_REQUEST" {
			t.Fatalf("input %q: %+v", input, r)
		}
	}
	missingNewline := `{"operation":"configure","address":"https://localhost"}`
	if r := pipeRequest(t, c, missingNewline, true); r.HTTPStatus != 400 {
		t.Fatalf("accepted missing newline: %+v", r)
	}
	valid := missingNewline + "\n"
	assertResult(t, pipeRequest(t, c, valid, false), 409, true, "local")
	atLimit := missingNewline + strings.Repeat(" ", maxRequestBytes-len(missingNewline)-1) + "\n"
	assertResult(t, pipeRequest(t, c, atLimit, false), 409, true, "local")
	// Process only the first request and close, never interpret a second command.
	assertResult(t, pipeRequest(t, c, valid+`{"operation":"configure","address":"https://other.local"}`+"\n", false), 409, true, "local")
	if len(c.hosts) != 0 {
		t.Fatal("processed a second request on one connection")
	}
}

func TestSocketPermissionsStaleRecoveryAndLiveRefusal(t *testing.T) {
	path := filepath.Join(t.TempDir(), "subdir", "control.sock")
	listener, err := listenSocket(path)
	if err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(path)
	if err != nil || info.Mode().Perm() != 0600 {
		t.Fatalf("socket permissions: %v %v", info, err)
	}
	if other, err := listenSocket(path); err == nil {
		other.Close()
		t.Fatal("replaced a live socket")
	}
	listener.SetUnlinkOnClose(false)
	listener.Close()
	recovered, err := listenSocket(path)
	if err != nil {
		t.Fatalf("could not recover stale socket: %v", err)
	}
	recovered.Close()
	if err := os.WriteFile(path, []byte("keep"), 0600); err != nil {
		t.Fatal(err)
	}
	if other, err := listenSocket(path); err == nil {
		other.Close()
		t.Fatal("replaced a regular file")
	}
	data, _ := os.ReadFile(path)
	if string(data) != "keep" {
		t.Fatal("destroyed a non-socket path")
	}
}

func TestServeAvailableBeforeCaddyAndGracefulShutdown(t *testing.T) {
	s := fixtureSettings(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan error, 1)
	go func() { done <- serve(ctx, s) }()
	var conn net.Conn
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		var err error
		conn, err = net.DialTimeout("unix", s.socket, 100*time.Millisecond)
		if err == nil {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if conn == nil {
		t.Fatal("socket never became available before Caddy startup")
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(2 * time.Second))
	conn.Write([]byte(`{"operation":"configure","address":"https://localhost"}` + "\n"))
	var r response
	if err := json.NewDecoder(bufio.NewReader(conn)).Decode(&r); err != nil {
		t.Fatal(err)
	}
	if r.HTTPStatus != 503 {
		t.Fatalf("expected safe startup failure without admin: %+v", r)
	}
	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("serve did not shut down")
	}
	if _, err := os.Stat(s.socket); !os.IsNotExist(err) {
		t.Fatal("socket not cleaned up")
	}
}

func TestCLIRejectsUnknownCommands(t *testing.T) {
	for _, args := range [][]string{nil, {"unknown"}, {"prepare", "extra"}} {
		if err := run(context.Background(), args, settings{}); err == nil {
			t.Fatalf("accepted arguments %v", args)
		}
	}
}
