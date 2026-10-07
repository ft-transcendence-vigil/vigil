package com.ft_transcendence.vigil.repositories.clickhouse;

import com.ft_transcendence.vigil.domain.dtos.telemetry.Trace;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.function.Consumer;

@Repository
public class TraceRepository {

    private static final String SELECT = """
            SELECT trace_id, span_id, parent_span_id, name, service,
                   timestamp, duration_ms, status, attributes
            FROM default.traces
            """;

    private final JdbcTemplate jdbcTemplate;

    public TraceRepository(@Qualifier("clickHouseJdbcTemplate") JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Trace> findTrace(
            String service,
            String period,
            String sort,
            Instant before,
            Integer offset,
            int count) {

        ClickHouseQuery query = filtered(service, period).orderBy(orderBy(sort)).limit(count);

        if (sort == null || sort.equals("timestamp"))
            query.before(before);
        else
            query.offset(offset == null ? 0 : offset);

        return query.list(jdbcTemplate, this::mapTrace, "traces");
    }

    public void streamAllTraces(String service, String period, Consumer<Trace> consumer) {
        filtered(service, period)
                .orderBy("timestamp DESC")
                .stream(jdbcTemplate, this::mapTrace, consumer, "traces");
    }

    private ClickHouseQuery filtered(String service, String period) {
        return ClickHouseQuery.from(SELECT)
                .eq("service", service)
                .since(period);
    }

    private Trace mapTrace(ResultSet result, int rowNum) throws SQLException {
        return new Trace(
                result.getString("trace_id"),
                result.getString("span_id"),
                result.getString("parent_span_id"),
                result.getString("name"),
                result.getString("service"),
                result.getTimestamp("timestamp").toInstant(),
                result.getLong("duration_ms"),
                result.getString("status"),
                ClickHouseQuery.attributes(result));
    }

    private String orderBy(String sort) {
        if (sort == null || sort.equals("timestamp"))
            return "timestamp DESC";

        return switch (sort) {
            case "trace_id" -> "trace_id ASC";
            case "span_id" -> "span_id ASC";
            case "parent_span_id" -> "parent_span_id ASC";
            case "name" -> "name ASC";
            case "service" -> "service ASC";
            case "duration_ms" -> "duration_ms ASC";
            case "status" -> "status ASC";
            default -> throw new IllegalArgumentException("Unknown sort field: " + sort);
        };
    }
}
