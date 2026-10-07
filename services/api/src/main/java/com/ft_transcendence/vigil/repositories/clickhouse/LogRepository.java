package com.ft_transcendence.vigil.repositories.clickhouse;

import com.ft_transcendence.vigil.domain.dtos.telemetry.Log;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.function.Consumer;

@Repository
public class LogRepository {

    private static final String SELECT = """
            SELECT service, timestamp, trace_id, severity, message, attributes
            FROM default.logs
            """;

    private final JdbcTemplate jdbcTemplate;

    public LogRepository(@Qualifier("clickHouseJdbcTemplate") JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Log> findLogs(
            String period,
            String service,
            String severity,
            String search,
            String sort,
            int count,
            Instant before,
            int offset) {

        ClickHouseQuery query = filtered(period, service, severity, search);

        if (sort == null || sort.isBlank() || sort.equals("timestamp"))
            query.before(before).orderBy("timestamp DESC").limit(count);
        else
            query.orderBy(sortColumn(sort) + " ASC").limit(count).offset(offset);

        return query.list(jdbcTemplate, this::mapLog, "logs");
    }

    public void streamAllLogs(
            String period,
            String service,
            String severity,
            String search,
            Consumer<Log> consumer) {

        filtered(period, service, severity, search)
                .orderBy("timestamp DESC")
                .stream(jdbcTemplate, this::mapLog, consumer, "logs");
    }

    private ClickHouseQuery filtered(String period, String service, String severity, String search) {
        return ClickHouseQuery.from(SELECT)
                .since(period)
                .eq("service", service)
                .eq("severity", severity)
                .like("message", search);
    }

    private Log mapLog(ResultSet result, int rowNum) throws SQLException {
        return new Log(
                result.getString("service"),
                result.getTimestamp("timestamp").toInstant(),
                result.getString("trace_id"),
                result.getString("severity"),
                result.getString("message"),
                ClickHouseQuery.attributes(result));
    }

    private String sortColumn(String sort) {
        return switch (sort) {
            case "timestamp" -> "timestamp";
            case "service" -> "service";
            case "severity" -> "severity";
            case "message" -> "message";
            case "trace_id" -> "trace_id";
            default -> throw new IllegalArgumentException("unknown sort field");
        };
    }
}
