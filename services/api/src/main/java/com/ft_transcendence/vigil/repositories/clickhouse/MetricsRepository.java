package com.ft_transcendence.vigil.repositories.clickhouse;

import com.ft_transcendence.vigil.domain.dtos.telemetry.Metric;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.ft_transcendence.vigil.domain.dtos.telemetry.MetricPoint;
import com.ft_transcendence.vigil.domain.dtos.telemetry.MetricSeries;
import com.ft_transcendence.vigil.exceptions.TelemetryRepositoryException;
import org.springframework.dao.DataAccessException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.function.Consumer;

@Repository
public class MetricsRepository {

	private static final String SELECT = """
			SELECT service, timestamp, name, value, attributes
			FROM metrics
			""";

	private final JdbcTemplate jdbcTemplate;

	public MetricsRepository(@Qualifier("clickHouseJdbcTemplate") JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public List<Metric> findMetrics(
			String service,
			String period,
			Instant before,
			int limit) {

		return filtered(service, period)
				.before(before)
				.orderBy("timestamp DESC")
				.limit(limit)
				.list(jdbcTemplate, this::mapMetric, "metrics");
	}

	public void streamAllMetrics(
			String service,
			String period,
			Consumer<Metric> consumer) {

		filtered(service, period)
				.orderBy("timestamp DESC")
				.stream(jdbcTemplate, this::mapMetric, consumer, "metrics");
	}

	public List<Metric> findMetrics(String service, Instant from, Instant to) {
		return filtered(service, null)
				.between(from, to)
				.orderBy("timestamp ASC")
				.list(jdbcTemplate, this::mapMetric, "metrics");
	}

	private ClickHouseQuery filtered(String service, String period) {
		ClickHouseQuery query = ClickHouseQuery.from(SELECT)
				.eq("service", service)
				.since(period);

		return query;
	}

	private Metric mapMetric(ResultSet result, int rowNum) throws SQLException {
		return new Metric(
				result.getString("service"),
				result.getTimestamp("timestamp").toInstant(),
				result.getString("name"),
				result.getObject("value", Double.class),
				ClickHouseQuery.attributes(result));
	}

	public List<MetricSeries> findSeries(
		String period,
		String service,
		int intervalSeconds) {

		String interval = switch (period) {
			case "1h" -> "1 HOUR";
			case "24h" -> "24 HOUR";
			case "7d" -> "7 DAY";
			case "30d" -> "30 DAY";
			default -> throw new IllegalArgumentException("Invalid period");
		};

		StringBuilder filters = new StringBuilder(
				"timestamp >= now() - INTERVAL " + interval
				+ " AND metric_type != ''"
		);

		List<Object> params = new ArrayList<>();

		if (service != null && !service.isBlank()) {
			filters.append(" AND service = ?");
			params.add(service);
		}


		String sql = """
				SELECT service, name,
					any(unit) AS series_unit,
					any(point_kind) AS series_kind,
					bucket,
					multiIf(
						any(point_kind) = 'histogram',
						sum(inc_hsum) / nullIf(sum(inc_hcount), 0),
						any(point_kind) = 'counter',
						sum(inc_value) / %d,
						avg(value)
					) AS bucket_value
				FROM (
					SELECT service, name, unit, value,
						toStartOfInterval(
							timestamp, toIntervalSecond(%d)
						) AS bucket,
						multiIf(
							metric_type IN (
								'histogram', 'exponential_histogram'
							), 'histogram',
							metric_type = 'sum' AND is_monotonic,
							'counter',
							'gauge'
						) AS point_kind,
						if(
							aggregation_temporality = 'cumulative',
							if(rn = 1 OR value < prev_value,
								NULL, value - prev_value),
							value
						) AS inc_value,
						if(
							aggregation_temporality = 'cumulative',
							if(rn = 1 OR histogram_sum < prev_hsum,
								NULL, histogram_sum - prev_hsum),
							histogram_sum
						) AS inc_hsum,
						if(
							aggregation_temporality = 'cumulative',
							if(rn = 1 OR histogram_count < prev_hcount,
								NULL,
								toFloat64(histogram_count)
								- toFloat64(prev_hcount)),
							toFloat64(histogram_count)
						) AS inc_hcount
					FROM (
						SELECT *,
							row_number() OVER (
								PARTITION BY series_id
								ORDER BY timestamp
							) AS rn,
							lagInFrame(value) OVER w AS prev_value,
							lagInFrame(histogram_sum) OVER w AS prev_hsum,
							lagInFrame(histogram_count) OVER w AS prev_hcount
						FROM metrics
						WHERE %s
						WINDOW w AS (
							PARTITION BY series_id
							ORDER BY timestamp
							ROWS BETWEEN 1 PRECEDING AND CURRENT ROW
						)
					)
				)
				GROUP BY service, name, bucket
				ORDER BY name, service, bucket
				""".formatted(intervalSeconds, intervalSeconds, filters);

		record SeriesKey(String name, String service) {}

		Map<SeriesKey, List<MetricPoint>> points = new LinkedHashMap<>();
		Map<SeriesKey, MetricSeries> series = new LinkedHashMap<>();

		try {
			jdbcTemplate.query(sql, rs -> {
				String name = rs.getString("name");
				String serviceName = rs.getString("service");
				SeriesKey key = new SeriesKey(name, serviceName);

				points.computeIfAbsent(key, k -> new ArrayList<>());

				if (!series.containsKey(key)) {
					series.put(key, new MetricSeries(
							name,
							serviceName,
							rs.getString("series_unit"),
							rs.getString("series_kind"),
							points.get(key)
					));
				}

				points.get(key).add(new MetricPoint(
						rs.getTimestamp("bucket").toInstant(),
						rs.getObject("bucket_value", Double.class)
				));
			}, params.toArray());

		} catch (DataAccessException e) {
			throw new TelemetryRepositoryException(
					"Failed to query metric series from ClickHouse", e
			);
		}

		return new ArrayList<>(series.values());
	}
}
