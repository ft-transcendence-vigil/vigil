package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@RequiredArgsConstructor
public class AlertRulesPostRequestDto {
    @NotNull
    private SignalType signalType;

    @NotBlank
    private String metricName;

    private String aggregation;

    @NotNull
    @Min(10)
    private Integer windowSeconds;

    @NotNull
    private Double threshold;

    @NotBlank
    private String service;

    @NotNull
    private Severity severity;

    @NotNull
    private Boolean enabled;

}
