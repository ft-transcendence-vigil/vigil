package com.ft_transcendence.vigil.domain.dtos.llm;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Log;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Metric;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Trace;
import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
public class LlmRequestDto {
    private UUID alertId;
    private String service;
    private Instant triggeredAt;
    private Rule rule;
    private Context context;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String question;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String previousAnalysis;

    public record Rule(
            SignalType signalType,
            String metricName,
            String aggregation,
            Double threshold,
            Integer windowSeconds,
            Severity severity) {
    }

    public record Context(List<Log> logs, List<Metric> metrics, List<Trace> traces) {
    }
}
