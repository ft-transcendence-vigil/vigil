package com.ft_transcendence.vigil.domain.dtos.telemetry;

import java.util.List;

public record MetricSeriesResponse(
		int intervalSeconds,
		List<MetricSeries> series
) {}