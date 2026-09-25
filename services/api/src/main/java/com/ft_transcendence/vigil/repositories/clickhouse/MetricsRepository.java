package com.ft_transcendence.vigil.repositories.clickhouse;

import com.ft_transcendence.vigil.domain.dtos.telemetry.Metric;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.function.Consumer;

@Repository
public class MetricsRepository {

    private static final String SELECT = """
            SELECT service, timestamp, name, value, attributes
            FROM default.metrics
            """;

    private final JdbcTemplate jdbcTemplate;

    public MetricsRepository(@Qualifier("clickHouseJdbcTemplate") JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Metric> findMetrics(
            String service,
            String period,
            Boolean internalOnly,
            Instant before,
            int limit) {

        return filtered(service, period, internalOnly)
                .before(before)
                .orderBy("timestamp DESC")
                .limit(limit)
                .list(jdbcTemplate, this::mapMetric, "metrics");
    }

    public void streamAllMetrics(
            String service,
            String period,
            Boolean internalOnly,
            Consumer<Metric> consumer) {

        filtered(service, period, internalOnly)
                .orderBy("timestamp DESC")
                .stream(jdbcTemplate, this::mapMetric, consumer, "metrics");
    }

    private ClickHouseQuery filtered(String service, String period, Boolean internalOnly) {
        ClickHouseQuery query = ClickHouseQuery.from(SELECT)
                .eq("service", service)
                .since(period);

        if (internalOnly != null)
            query.where(internalOnly
                    ? "attributes['internal'] = 'true'"
                    : "(attributes['internal'] = 'false' OR NOT mapContains(attributes, 'internal'))");

        return query;
    }

    private Metric mapMetric(ResultSet result, int rowNum) throws SQLException {
        return new Metric(
                result.getString("service"),
                result.getTimestamp("timestamp").toInstant(),
                result.getString("name"),
                result.getDouble("value"),
                ClickHouseQuery.attributes(result));
    }
}
