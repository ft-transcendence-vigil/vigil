package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

import java.util.UUID;
@Getter
@Setter
@RequiredArgsConstructor
public class AlertRulesPostDtoResponse {
    private UUID id;
    private String service;
    private SignalType signalType;
    private String metricName;
    private String aggregation;
    private Integer  windowSeconds;
    private Double threshold;
    private Severity severity;
    private Boolean enabled;
    @JsonProperty("is_default")
    private Boolean isDefault;
}
