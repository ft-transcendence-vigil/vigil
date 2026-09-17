package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;


import java.util.UUID;

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
        private boolean isDefault;
    }