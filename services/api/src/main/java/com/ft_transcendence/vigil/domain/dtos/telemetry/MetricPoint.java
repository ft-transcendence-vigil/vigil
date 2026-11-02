package com.ft_transcendence.vigil.domain.dtos.telemetry;

import java.time.Instant;

public record MetricPoint(Instant bucket, Double value) {}