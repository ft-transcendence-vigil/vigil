FROM otel/opentelemetry-collector-builder:0.160.0 AS builder

COPY buildtime/builder-config.yaml ./builder-config.yaml
COPY buildtime/exporter/ ./exporter/

RUN ocb --config ./builder-config.yaml

FROM gcr.io/distroless/static:nonroot

COPY --from=builder /home/ocb/dist/vigcol /vigcol
COPY runtime/config.yaml /etc/vigcol/config.yaml

EXPOSE 4318

CMD [ "/vigcol", "--config", "/etc/vigcol/config.yaml" ]
