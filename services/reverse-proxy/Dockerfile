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

FROM gcr.io/distroless/static-debian12:latest AS runtime

COPY --from=caddy-builder /usr/bin/caddy /usr/bin/caddy
COPY services/reverse-proxy/Caddyfile /etc/caddy/Caddyfile
COPY --from=frontend-builder /app/dist /usr/share/caddy

EXPOSE 80 443

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
