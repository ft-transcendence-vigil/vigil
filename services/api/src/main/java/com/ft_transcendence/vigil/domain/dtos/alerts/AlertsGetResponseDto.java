package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import com.ft_transcendence.vigil.domain.entities.Alerts.Status;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;
@Builder
@Getter
@Setter
public class AlertsGetResponseDto {
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
    private Status status;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Instant ackedAt;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Instant resolvedAt;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String ackedBy;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String resolvedBy;
}