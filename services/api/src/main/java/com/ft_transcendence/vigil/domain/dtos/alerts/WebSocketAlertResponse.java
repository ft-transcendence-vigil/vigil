package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import com.ft_transcendence.vigil.domain.entities.Alerts.Status;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;


@Getter
@Setter
@Builder
public class WebSocketAlertResponse {
    private Type type;
    private Data data;
    public record Data(
            UUID alertHistoryId,
            UUID ruleId,
            AlertRulesGetAndPatchResponseDto rule,
            String service,
            SignalType signalType,
            String metricName,
            String aggregation,
            Integer windowSeconds,
            Double threshold,
            Severity severity,
            Instant triggeredAt,
            String llmAnalysis,
            Status status,
            UUID ownerId,
            Instant ackedAt,
            String ackedBy,
            Instant resolvedAt,
            String resolvedBy,
            Long version) {
    }
}

