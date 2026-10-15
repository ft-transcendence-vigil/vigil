#!/bin/sh
set -eu

# Keep the public copy of Caddy's local root CA certificate in sync.
source=/data/caddy/pki/authorities/local/root.crt
public=/public-ca/root.crt
/bin/busybox mkdir -p /public-ca

(
    while true; do
        if [ -r "$source" ]; then
            if ! /bin/busybox cmp -s "$source" "$public"; then
                /bin/busybox cp "$source" "$public.tmp"
                /bin/busybox chmod 0444 "$public.tmp"
                /bin/busybox mv -f "$public.tmp" "$public"
            fi
        else
            /bin/busybox rm -f "$public"
        fi
        /bin/busybox sleep 5
    done
) &

# Start Caddy, replacing this shell process.
exec /usr/bin/caddy "$@"
