import base64
import json
import time
import urllib.error
import urllib.request


def request(url, data=None, headers=None):
    body = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers=headers or {},
        method="POST" if data is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        return response.status, response.read().decode().strip()

try:
    request(
        "http://collector:4318/v1/logs",
        {"resourceLogs": []},
        {"Content-Type": "application/json"},
    )
    raise AssertionError("unauthenticated OTLP request succeeded")
except urllib.error.HTTPError as error:
    assert error.code == 401, error.code

headers = {
    "Authorization": "Bearer integration-ingestion-key",
    "Content-Type": "application/json",
}
timestamp = "1893456000000000000"
payloads = {
    "logs": {
        "resourceLogs": [
            {
                "resource": {
                    "attributes": [
                        {
                            "key": "service.name",
                            "value": {"stringValue": "integration-service"},
                        }
                    ]
                },
                "scopeLogs": [
                    {
                        "logRecords": [
                            {
                                "timeUnixNano": timestamp,
                                "severityNumber": 17,
                                "body": {"stringValue": "integration log"},
                            }
                        ]
                    }
                ],
            }
        ]
    },
    "metrics": {
        "resourceMetrics": [
            {
                "resource": {
                    "attributes": [
                        {
                            "key": "service.name",
                            "value": {"stringValue": "integration-service"},
                        }
                    ]
                },
                "scopeMetrics": [
                    {
                        "metrics": [
                            {
                                "name": "integration.requests",
                                "unit": "1",
                                "gauge": {
                                    "dataPoints": [
                                        {"timeUnixNano": timestamp, "asDouble": 42}
                                    ]
                                },
                            }
                        ]
                    }
                ],
            }
        ]
    },
    "traces": {
        "resourceSpans": [
            {
                "resource": {
                    "attributes": [
                        {
                            "key": "service.name",
                            "value": {"stringValue": "integration-service"},
                        }
                    ]
                },
                "scopeSpans": [
                    {
                        "spans": [
                            {
                                "traceId": "00000000000000000000000000000001",
                                "spanId": "0000000000000001",
                                "name": "integration span",
                                "startTimeUnixNano": timestamp,
                                "endTimeUnixNano": "1893456000001000000",
                                "status": {"code": 1},
                            }
                        ]
                    }
                ],
            }
        ]
    },
}
for signal, payload in payloads.items():
    try:
        status, _ = request(f"http://collector:4318/v1/{signal}", payload, headers)
    except urllib.error.HTTPError as error:
        raise AssertionError(
            f"{signal} returned {error.code}: {error.read().decode()}"
        ) from error
    assert status == 200, (signal, status)

basic = base64.b64encode(b"vigil_writer:integration-writer-password").decode()
for table in ("logs", "metrics", "traces"):
    query = (
        f"SELECT count() FROM {table} WHERE service = 'integration-service'".encode()
    )
    for _ in range(30):
        req = urllib.request.Request(
            "http://clickhouse:8123/",
            data=query,
            headers={"Authorization": f"Basic {basic}"},
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.read().decode().strip() == "1":
                break
        time.sleep(1)
    else:
        raise AssertionError(f"missing {table} row")

count = ""
for _ in range(30):
    _, count = request("http://backend:8081/count")
    if count == "3":
        break
    time.sleep(1)
else:
    raise AssertionError(f"expected 3 callbacks, got {count}")

print(
    "authenticated OTLP logs/metrics/traces, ClickHouse visibility, and callbacks passed"
)
