package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class AlertRulesGetAndPatchResponseDto {
    private UUID id;
    private String service;
    private SignalType signalType;
    private String metricName;
    private String aggregation;
    private Integer windowSeconds;
    private Double threshold;
    private Severity severity;
    private boolean enabled;

    @JsonProperty("is_default")
    private boolean isDefault;
}
