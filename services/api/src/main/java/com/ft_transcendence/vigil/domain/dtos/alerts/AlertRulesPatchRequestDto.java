package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AlertRulesPatchRequestDto {
    @Pattern(regexp = ".+", message = "service can't be empty")
    private String service;
    private String metricName;
    private String aggregation;
    @Min(10)
    private Integer windowSeconds;
    private Double threshold;
    private Severity severity;
    private Boolean enabled;
}
