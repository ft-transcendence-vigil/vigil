package com.ft_transcendence.vigil.domain.dtos.telemetry;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.Map;

@JsonPropertyOrder({"service", "timestamp", "name", "value", "attributes"})
@Getter
@AllArgsConstructor
public class Metric {
    private String service;
    private Instant timestamp;
    private String name;
    private double value;
    private Map<String, String> attributes;
}
