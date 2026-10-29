from app.context import final_str
from app.schemas import ChatMessage, AlertRule, ForwardRequest



ALERT_MESSAGE= """You are an on-call assistant for an observability platform.
You are given telemetry collected around the moment an alert fired.

Write 2 to 4 sentences for an engineer who just got paged:
1. what the telemetry shows
2. the most likely cause, if the telemetry supports one
3. what to check first

Rules:
- Use only the telemetry given. Never invent log lines, metric values or span names.
- Do not repeat the service name or the severity. The alert title already has them.
- If the telemetry does not show a cause, say so plainly and name what is missing.
- Plain prose. No markdown, no headings, no bullet points, no preamble.
- If no telemetry was recorded, reply exactly: Analysis unavailable. No telemetry was recorded in this window."""

CHAT_SYSTEM = """You are an assistant inside an observability platform.

You can only see this conversation. You have no access to logs, metrics or
traces, and you cannot run queries.

If the user asks about telemetry they have not pasted into the conversation,
say you cannot see it and tell them what to paste or which page to open.
Never invent log lines, metric values, span names or timestamps.

Be direct and short. Engineers are reading this while something is broken."""


def _rule_line(rule: AlertRule | None) -> str:
    if rule is None:
        return "rule: unknown"
    if rule.threshold is None:
        return "rule: the service went silent (no telemetry before the timeout)"
    what = rule.aggregation or "value"
    if rule.metric_name:
        what = f"{what}({rule.metric_name})"
    window = f" over {rule.window_seconds}s" if rule.window_seconds else ""
    severity = f" ({rule.severity})" if rule.severity else ""
    return (f"rule: {what} on {rule.signal_type or 'telemetry'}{window} "
            f"reached {rule.threshold:g} or more{severity}")


def alert_prompt(req: ForwardRequest) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": ALERT_MESSAGE},
        {
            "role": "user",
            "content": f"service: {req.service}\n{_rule_line(req.rule)}\n\n{final_str(req.context, req.triggered_at)}",
        },
    ]
def chat_prompt(messages: list[ChatMessage]) ->list[dict[str, str]]:
    return [
        #model_dump converts pydantic model to dict
        {"role": "system", "content":  f"{CHAT_SYSTEM}", },
        *(m.model_dump() for m in messages)
    ]