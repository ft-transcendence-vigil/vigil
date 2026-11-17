package main

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"os/signal"
	"path/filepath"
	"sync"
	"syscall"
	"time"
)

const maxRequestBytes = 4096

type request struct {
	Operation string `json:"operation"`
	Address   string `json:"address"`
}

func (c *controller) handle(ctx context.Context, conn net.Conn) {
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(8 * time.Second))
	ctx, cancel := context.WithTimeout(ctx, requestBudget)
	defer cancel()
	line, err := bufio.NewReader(io.LimitReader(conn, maxRequestBytes+1)).ReadBytes('\n')
	r := failure(400, "INVALID_REQUEST", "Expected one newline-terminated JSON configure request of at most 4096 bytes.")
	if err == nil && len(line) <= maxRequestBytes {
		var req request
		if decodeStrict(line, &req) == nil && req.Operation == "configure" {
			r = c.configure(ctx, req.Address)
		}
	}
	json.NewEncoder(conn).Encode(r)
}

func listenSocket(path string) (*net.UnixListener, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return nil, err
	}
	if info, err := os.Lstat(path); err == nil {
		if info.Mode()&os.ModeSocket == 0 {
			return nil, errors.New("refusing to replace a non-socket control path")
		}
		conn, err := net.DialTimeout("unix", path, 200*time.Millisecond)
		if err == nil {
			conn.Close()
			return nil, errors.New("TLS control socket is already serving")
		}
		// Do not unlink a live or inaccessible socket on an ambiguous dial failure.
		if !errors.Is(err, syscall.ECONNREFUSED) && !errors.Is(err, syscall.ENOENT) {
			return nil, err
		}
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			return nil, err
		}
	} else if !os.IsNotExist(err) {
		return nil, err
	}
	// Unix permissions derive from the umask at bind time, before chmod is possible.
	// This runs once, before any helper goroutines are started.
	oldMask := syscall.Umask(0077)
	listener, err := net.ListenUnix("unix", &net.UnixAddr{Name: path, Net: "unix"})
	syscall.Umask(oldMask)
	if err != nil {
		return nil, err
	}
	if err := os.Chmod(path, 0600); err != nil {
		listener.Close()
		return nil, err
	}
	return listener, nil
}

func serve(ctx context.Context, s settings) error {
	c, err := newController(s)
	if err != nil {
		return err
	}
	listener, err := listenSocket(s.socket)
	if err != nil {
		return err
	}
	defer listener.Close()
	done := make(chan struct{})
	defer close(done)
	go func() {
		select {
		case <-ctx.Done():
			listener.Close()
		case <-done:
		}
	}()
	// Bound idle connections as well as request size and duration.
	slots := make(chan struct{}, 64)
	var handlers sync.WaitGroup
	defer handlers.Wait()
	for {
		conn, err := listener.Accept()
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			return err
		}
		select {
		case slots <- struct{}{}:
			handlers.Add(1)
			go func() {
				defer handlers.Done()
				defer func() { <-slots }()
				c.handle(ctx, conn)
			}()
		default:
			conn.Close()
		}
	}
}

func run(ctx context.Context, args []string, s settings) error {
	if len(args) != 1 {
		return fmt.Errorf("usage: vigil-tls-control prepare|serve")
	}
	switch args[0] {
	case "prepare":
		return prepare(s)
	case "serve":
		return serve(ctx, s)
	default:
		return fmt.Errorf("usage: vigil-tls-control prepare|serve")
	}
}

func main() {
	log.SetPrefix("vigil-tls-control: ")
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer cancel()
	if err := run(ctx, os.Args[1:], environment()); err != nil {
		log.Fatal(err)
	}
}
