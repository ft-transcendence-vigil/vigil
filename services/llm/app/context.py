from datetime import datetime
from app.config import settings
from app.schemas import AlertsContext, LogRow, MetricsRow, TracesRow

SEVERITY_LEVELS = {
    "critical" :0,
    "fatal" : 0,
    "error": 1,
    "err": 1,
    "warning": 2,
    "warn": 2,
    "info": 3,
    "debug": 4,
}

MAX_MESSAGE_CHARS = 160

#we trip and lower case severity and return it if not found we return 3 as info
def _severity_level(severity: str) -> int:
    return SEVERITY_LEVELS.get(severity.strip().lower(), 3)

#time between when error happened and when alert fired
def _distance(row_time: datetime, alert_time: datetime)-> float:
    return abs(row_time - alert_time).total_seconds()

def cut_message(message: str ) -> str:
    message = " ".join(message.split())
    if len(message) <= MAX_MESSAGE_CHARS:
        return message
    return message[: MAX_MESSAGE_CHARS - 3] + "..."

def select_logs(logs: list[LogRow], alert_time: datetime) -> list[LogRow]:
    rank = sorted(
        logs,
        key= lambda row: (_severity_level(row.severity), _distance(row.timestamp, alert_time)),
    )
    keep = rank[: settings.max_context_logs]
    #we sort by creticallity first then we sort by timing because we want chrononical order of the errors 
    return sorted(keep, key= lambda row: row.timestamp)

def select_traces(traces: list[TracesRow]) -> list[TracesRow]:
    rank = sorted(
        traces,
        #negative duration because we want spans that took the most time
        key= lambda row: (row.status.strip().lower() != "error", -row.duration_ms),
    )
    return rank[: settings.max_context_traces]

# row = cpu_usage 21 (25s away)
#   best.get("cpu_usage") → None, nothing stored yet
#   → best = {"cpu_usage": 21}

# row = cpu_usage 24 (15s away)
#   best.get("cpu_usage") → the 21 row
#   15s < 25s, so this one is closer
#   → best = {"cpu_usage": 24}        the 21 row is gone, overwritten

# row = cpu_usage 23 (5s away)
#   best.get("cpu_usage") → the 24 row
#   5s < 15s, closer again
#   → best = {"cpu_usage": 23}

# row = disk_io 8 (25s away)
#   best.get("disk_io") → None, different key
#   → best = {"cpu_usage": 23, "disk_io": 8}
def select_metrics(Metrics: list[MetricsRow], alert_time: datetime) -> list[MetricsRow]:
    best: dict[str, MetricsRow] = {}
    for row in Metrics :
        current = best.get(row.name)
        #if distance in time is closer so row is the latest fire so we store it 
        if current is None or _distance(current.timestamp, alert_time) > _distance(row.timestamp, alert_time):
            best[row.name] = row
    rank = sorted (
        best.values(),
        key= lambda row: (_distance(row.timestamp, alert_time)),
    )
    #!!!!! important for now sorted by timestamp still need to know what the alert guy will give me
    return rank[: settings.max_context_metrics]

def final_str(context: AlertsContext, alert_time: datetime) -> str:
    logs = select_logs(context.logs, alert_time)
    traces = select_traces(context.traces)
    metrics = select_metrics(context.metrics, alert_time)
    if not (logs or traces or metrics):
        return f"Alert happened at {alert_time:%H:%M:%S}\n\nNo telemetry was recorded in this window."

    return "\n\n".join([
        f"Alert happened at {alert_time:%H:%M:%S}", 
        "LOGS\n" + "\n".join(f"{r.timestamp:%H:%M:%S} severity: {r.severity} message: {cut_message(r.message)}" for r in logs),
        "TRACES\n" + "\n" .join(f"name: {r.name}  duration: {r.duration_ms:.0f}ms status: {r.status} " for r in traces),
        "METRICS\n" + "\n" .join(f"name: {r.name} value: {r.value:g} " for r in metrics)
    ])
