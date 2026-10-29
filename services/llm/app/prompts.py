from app.context import final_str
from app.schemas import AlertRule, ForwardRequest, AskRequest



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

ASK_MESSAGE = """You are an on-call assistant for an observability platform.
An engineer is asking a question about one specific alert. You are given the alert,
the telemetry collected around the moment it fired, and maybe an earlier automatic analysis.

Rules:
- Answer the question in at most 5 sentences. Plain prose, no markdown.
- Use only the data given. Never invent log lines, metric values, span names or timestamps.
- If the data cannot answer the question, say so plainly and name what is missing.
- If the question is not about this alert or its telemetry, say you can only answer questions about this alert."""
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
def ask_prompt(req: AskRequest) -> list[dict[str, str]]:
    analysis = f"Earlier analysis: {req.previous_analysis}\n\n" if req.previous_analysis else ""
    return [
        {"role": "system", "content": ASK_MESSAGE},
        {
            "role": "user",
            "content": f"service: {req.service}\n{_rule_line(req.rule)}\n\n{final_str(req.context, req.triggered_at)}\n\n{analysis}Question: {req.question}",
        },
    ]