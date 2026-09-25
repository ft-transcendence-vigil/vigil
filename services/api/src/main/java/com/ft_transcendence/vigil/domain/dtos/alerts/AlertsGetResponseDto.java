package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import com.ft_transcendence.vigil.domain.entities.Alerts.Status;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Builder
@Getter
@Setter
public class AlertsGetResponseDto {
    public record MyAck(Status status, Instant ackedAt) {}

    private UUID id;
    private UUID ruleId;
    private String service;
    private SignalType signalType;
    private String metricName;
    private String aggregation;
    private Integer windowSeconds;
    private Double threshold;
    private Severity severity;
    private Instant triggeredAt;
    private String llmAnalysis;
    private MyAck myAck;
}