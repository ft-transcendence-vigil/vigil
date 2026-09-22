package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AlertRulesPatchRequestDto {
    private String service;
    private String metricName;
    private String aggregation;
    private Integer windowSeconds;
    private Double threshold;
    private Severity severity;
    private Boolean enabled;
}