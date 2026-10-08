import logging
import os
import random
import signal
import time

from opentelemetry import metrics, trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Status, StatusCode


def endpoint(signal_type: str) -> str:
    base = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://telemetry-collector:4318").rstrip("/")
    return f"{base}/v1/{signal_type}"


def main() -> None:
    service_name = os.getenv("OTEL_SERVICE_NAME", "vigil-mock-service")
    interval = float(os.getenv("SEND_INTERVAL_SECONDS", "5"))
    headers = {"Authorization": f"Bearer {os.environ['VIGIL_INGESTION_KEY']}"}
    resource = Resource.create({"service.name": service_name, "deployment.environment": "mock"})

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint("traces"), headers=headers)))
    trace.set_tracer_provider(tracer_provider)

    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=endpoint("metrics"), headers=headers),
        export_interval_millis=max(1000, int(interval * 1000)),
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(BatchLogRecordProcessor(OTLPLogExporter(endpoint=endpoint("logs"), headers=headers)))
    set_logger_provider(logger_provider)
    logger = logging.getLogger("vigil.mock")
    logger.setLevel(logging.INFO)
    logger.addHandler(LoggingHandler(logger_provider=logger_provider))

    tracer = trace.get_tracer("vigil.mock")
    meter = metrics.get_meter("vigil.mock")
    request_counter = meter.create_counter("mock.requests", unit="{request}")
    latency = meter.create_histogram("mock.request.duration", unit="ms")
    active_requests = meter.create_up_down_counter("mock.requests.active", unit="{request}")

    running = True

    def stop(*_: object) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    while running:
        duration_ms = random.uniform(5, 750)
        failed = random.random() < 0.1
        attributes = {"http.request.method": "GET", "http.route": "/mock", "mock.failed": failed}
        active_requests.add(1, attributes)
        with tracer.start_as_current_span("mock-request", attributes=attributes) as span:
            span.set_attribute("http.response.status_code", 500 if failed else 200)
            span.add_event("mock response prepared")
            if failed:
                span.set_status(Status(StatusCode.ERROR, "simulated failure"))
                logger.error("simulated request failed", extra={"duration_ms": duration_ms})
            else:
                logger.info("simulated request completed", extra={"duration_ms": duration_ms})
            request_counter.add(1, attributes)
            latency.record(duration_ms, attributes)
        active_requests.add(-1, attributes)
        time.sleep(interval)

    tracer_provider.shutdown()
    meter_provider.shutdown()
    logger_provider.shutdown()


if __name__ == "__main__":
    main()
