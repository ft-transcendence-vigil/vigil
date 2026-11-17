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
An engineer is asking a question about one alert. Below you get the alert rule, the telemetry
collected around the moment it fired, maybe an earlier automatic analysis, and maybe
earlier questions and answers about this alert.

Answer from that data in at most 5 sentences of plain prose, no markdown, no preamble.
Use only the data given. Never invent log lines, metric values, span names or timestamps.
You may suggest common fixes for the problem the data shows.
If the data cannot answer the question, say so plainly and name what is missing.
Do not repeat the earlier analysis unless the engineer asks for it.

Questions about the cause, a fix, what to check, or the logs, traces and metrics are always answered.
Questions about cooking, poems, jokes, sports or other topics outside software get only this reply:
I can only answer questions about this alert.

Examples:
Question: Suggest a fix
Answer: (a short fix based on the telemetry)
Question: what caused this?
Answer: (the cause the telemetry points to)
Question: write a poem about the sea
Answer: I can only answer questions about this alert.
Question: give me a cake recipe
Answer: I can only answer questions about this alert."""

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
    history = ""
    if req.history:
        turns = "\n\n".join(f"Question: {item.question}\nAnswer: {item.answer or ''}" for item in req.history)
        history = f"Previous questions and answers:\n{turns}\n\n"
    return [
        {"role": "system", "content": ASK_MESSAGE},
        {
            "role": "user",
            "content": f"Question: {req.question}\n\nservice: {req.service}\n{_rule_line(req.rule)}\n\n{final_str(req.context, req.triggered_at)}\n\n{analysis}{history}Question again: {req.question}",
        },
    ]