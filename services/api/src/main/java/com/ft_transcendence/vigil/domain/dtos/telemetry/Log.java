package com.ft_transcendence.vigil.domain.dtos.telemetry;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.Map;

@JsonPropertyOrder({"service", "timestamp", "severity", "message", "attributes"})
@Getter
@AllArgsConstructor
public class Log {
    private String service;
    private Instant timestamp;
    private String severity;
    private String message;
    private Map<String, String> attributes;
}
