package com.ft_transcendence.vigil.domain.dtos.telemetry;

import java.util.List;

public record MetricSeries(
		String name,
		String service,
		String unit,
		String kind,
		List<MetricPoint> points
) {}