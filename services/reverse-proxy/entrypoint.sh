#!/bin/sh
set -eu

# Caddy may generate its local CA on first startup.
source=/data/caddy/pki/authorities/local/root.crt
public=/public-ca/root.crt
/bin/busybox mkdir -p /public-ca

(
    while [ ! -r "$source" ]; do
        /bin/busybox sleep 1
    done
    /bin/busybox cp "$source" "$public.tmp"
    /bin/busybox chmod 0444 "$public.tmp"
    /bin/busybox mv -f "$public.tmp" "$public"
) &

# Start Caddy, replacing this shell process.
exec /usr/bin/caddy "$@"
