FROM python:3.13-alpine AS builder

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"

RUN python -m venv "${VIRTUAL_ENV}"
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --requirement /tmp/requirements.txt

FROM python:3.13-alpine AS runtime

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN addgroup -S telemetry && adduser -S -G telemetry telemetry

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY sender.py ./sender.py

USER telemetry

EXPOSE 8000

CMD ["opentelemetry-instrument", "python", "sender.py"]
