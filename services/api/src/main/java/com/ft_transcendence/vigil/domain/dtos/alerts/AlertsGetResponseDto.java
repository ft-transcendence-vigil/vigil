package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import com.ft_transcendence.vigil.domain.entities.Alerts.Status;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
@Builder
@Getter
@Setter
public class AlertsGetResponseDto {
    private UUID id;
    private UUID ruleId;
    @JsonIgnoreProperties("default")
    private AlertRulesGetAndPatchResponseDto rule;
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
    private UUID ownerId;
    private Instant ackedAt;
    private String ackedBy;
    private Instant resolvedAt;
    private String resolvedBy;
    private Long version;

    public record Page(List<AlertsGetResponseDto> data, boolean hasMore) {
    }
}
