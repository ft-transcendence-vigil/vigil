package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import lombok.Builder;
import lombok.Getter;;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;


@Getter
@Setter
@Builder
public class WebSocketAlertResponse {
    private Type type;
    private Data data;
    public record Data( UUID id, UUID ruleId, String service, SignalType signalType, String metricName, String aggregation, Integer windowSeconds, Double threshold, Severity severity, Instant triggeredAt, String llmAnalysis) {}


}

