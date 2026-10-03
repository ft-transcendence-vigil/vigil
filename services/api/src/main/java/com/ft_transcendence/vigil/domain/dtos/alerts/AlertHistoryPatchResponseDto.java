package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.AlertRules;
import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import com.ft_transcendence.vigil.domain.entities.Alerts.Status;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;
@Getter
@Setter
@Builder
public class AlertHistoryPatchResponseDto {
    private UUID id;
    private AlertRules rule;
    private String service;
    private Instant triggeredAt;
    private String metricName;
    private SignalType signalType;
    private Integer windowSeconds;
    private String aggregation;
    private Double threshold;
    private Severity severity;
    private String llmAnalysis;
    private Status status;
    private Instant ackedAt;
    private Instant resolvedAt;

    private String ackedBy;
    private String resolvedBy;
}
