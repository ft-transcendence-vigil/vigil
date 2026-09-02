from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID

from typing import Literal
#basemodel is a class we inhernt from for validation we dont use constructor and we specify the fields that we are filling in the class

class TelemetryRow(BaseModel):
    #model_config just to specify base model without it we use a defaut with it we can specify that extra fields that we didnt expect to be ignored
    model_config = ConfigDict(extra = "ignore")

class LogRow(TelemetryRow):
    service: str
    timestamp: datetime
    severity: str
    message: str
    #field a way to attach more rules to the field for example message: str = field(min_length = 1) the string show have a minimum of 1 length
    #we use default_factory = disct so that for each instance we get an u seperate dict
    attribute: dict[str, str] = Field(default_factory=dict)

class MetricsRow(TelemetryRow):
    service: str
    timestamp: datetime
    name: str
    value: float
    attributes: dict[str, str] = Field(default_factory=dict)

class TracesRow(TelemetryRow):
    trace_id: str
    span_id: str
    parent_span_id: str | None = None
    name: str
    service: str
    timestamp: datetime
    duration_ms: float
    status: str
    attributes: dict[str, str] = Field(default_factory=dict)

class AlertsContext(TelemetryRow):
    logs: list[LogRow] = Field(default_factory=list)
    Metrics: list[MetricsRow] = Field(default_factory=list)
    Traces: list[TracesRow] = Field(default_factory=list)

#for POST /internal/llm/forward
class ForwardRequest(TelemetryRow):
    alert_id: UUID
    service: str 
    triggered_at: datetime
    context: AlertsContext = Field(default_factory=AlertsContext)


#for  POST /internal/llm/chat

class ChatMessage(BaseModel):
    model_config= ConfigDict(extra = "forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length = 1)

class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[ChatMessage] = Field(min_length = 1)
