package com.ft_transcendence.vigil.domain.dtos.llm;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Metric;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Trace;
import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Builder
public class LlmRequestDto {
    @JsonProperty("alert_id")
    private UUID alertId;
    private String service;
    @JsonProperty("triggered_at")
    private Instant triggeredAt;
    private Rule rule;
    private Context context;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String question;
    @JsonProperty("previous_analysis")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String previousAnalysis;

    public record Rule(
            @JsonProperty("signal_type") SignalType signalType,
            @JsonProperty("metric_name") String metricName,
            String aggregation,
            Double threshold,
            @JsonProperty("window_seconds") Integer windowSeconds,
            Severity severity) {
    }

    public record Context(List<LogRow> logs, List<Metric> metrics, List<Trace> traces) {
    }

    public record LogRow(String service, Instant timestamp, String severity,
                         String message, Map<String, String> attributes) {
    }
}
