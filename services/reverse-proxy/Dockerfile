FROM node:22-alpine AS frontend-builder

WORKDIR /app

COPY services/web/package*.json ./
RUN npm ci

COPY services/web/index.html services/web/tsconfig*.json services/web/vite.config.ts services/web/eslint.config.js ./
COPY services/web/public/ ./public/
COPY services/web/src/ ./src/
RUN npm run build

FROM caddy:builder AS caddy-builder

RUN xcaddy build v2.11.4

FROM busybox:1.37-musl AS shell

FROM gcr.io/distroless/static-debian12:latest AS runtime

ENV XDG_CONFIG_HOME=/config
ENV XDG_DATA_HOME=/data

COPY --from=caddy-builder /usr/bin/caddy /usr/bin/caddy
COPY --from=shell /bin/busybox /bin/busybox
COPY services/reverse-proxy/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY services/reverse-proxy/Caddyfile /etc/caddy/Caddyfile
COPY --from=frontend-builder /app/dist /usr/share/caddy

EXPOSE 80 443

ENTRYPOINT ["/bin/busybox", "sh", "/usr/local/bin/entrypoint.sh"]

CMD ["run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
