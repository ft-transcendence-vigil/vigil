package com.ft_transcendence.vigil.domain.dtos.telemetry;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.Map;

@JsonPropertyOrder({"trace_id", "span_id", "parent_span_id", "name", "service", "timestamp", "duration_ms", "status", "attributes"})
@Getter
@AllArgsConstructor
public class Trace {
    private String traceId;
    private String spanId;
    private String parentSpanId;
    private String name;
    private String service;
    private Instant timestamp;
    private long durationMs;
    private String status;
    private Map<String, String> attributes;
}
