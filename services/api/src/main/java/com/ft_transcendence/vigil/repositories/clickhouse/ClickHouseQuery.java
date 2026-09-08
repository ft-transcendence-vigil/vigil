package com.ft_transcendence.vigil.repositories.clickhouse;

import com.ft_transcendence.vigil.exceptions.TelemetryRepositoryException;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

final class ClickHouseQuery {

    private final String select;
    private final List<String> conditions = new ArrayList<>();
    private final List<Object> params = new ArrayList<>();

    private String orderBy;
    private Integer limit;
    private Integer offset;

    private ClickHouseQuery(String select) {
        this.select = select;
    }

    static ClickHouseQuery from(String select) {
        return new ClickHouseQuery(select);
    }

    ClickHouseQuery eq(String column, String value) {
        if (value != null && !value.isBlank()) {
            conditions.add(column + " = ?");
            params.add(value);
        }

        return this;
    }

    ClickHouseQuery like(String column, String value) {
        if (value != null && !value.isBlank()) {
            conditions.add(column + " ILIKE ?");
            params.add("%" + value + "%");
        }

        return this;
    }

    ClickHouseQuery since(String period) {
        if (period != null && !period.isBlank())
            conditions.add("timestamp >= now() - INTERVAL " + interval(period));

        return this;
    }

    ClickHouseQuery before(Instant before) {
        if (before != null) {
            conditions.add("timestamp < ?");
            params.add(Timestamp.from(before));
        }

        return this;
    }

    ClickHouseQuery where(String condition) {
        conditions.add(condition);
        return this;
    }

    ClickHouseQuery orderBy(String orderBy) {
        this.orderBy = orderBy;
        return this;
    }

    ClickHouseQuery limit(int limit) {
        this.limit = limit;
        return this;
    }

    ClickHouseQuery offset(int offset) {
        this.offset = offset;
        return this;
    }

    <T> List<T> list(JdbcTemplate jdbcTemplate, RowMapper<T> mapper, String signal) {
        try {
            return jdbcTemplate.query(sql(), mapper, params());
        } catch (DataAccessException e) {
            throw failure(signal, e);
        }
    }

    <T> void stream(JdbcTemplate jdbcTemplate, RowMapper<T> mapper, Consumer<T> consumer, String signal) {
        try {
            jdbcTemplate.query(
                    sql(),
                    (RowCallbackHandler) result -> consumer.accept(mapper.mapRow(result, 0)),
                    params());
        } catch (DataAccessException e) {
            throw failure(signal, e);
        }
    }

    private String sql() {
        StringBuilder sql = new StringBuilder(select);

        if (!conditions.isEmpty())
            sql.append(" WHERE ").append(String.join(" AND ", conditions));

        if (orderBy != null)
            sql.append(" ORDER BY ").append(orderBy);

        if (limit != null)
            sql.append(" LIMIT ?");

        if (offset != null)
            sql.append(" OFFSET ?");

        return sql.toString();
    }

    private Object[] params() {
        List<Object> all = new ArrayList<>(params);

        if (limit != null)
            all.add(limit);

        if (offset != null)
            all.add(offset);

        return all.toArray();
    }

    private TelemetryRepositoryException failure(String signal, DataAccessException cause) {
        return new TelemetryRepositoryException("Failed to query " + signal + " from ClickHouse", cause);
    }

    static Map<String, String> attributes(ResultSet result) throws SQLException {
        Map<String, String> attributes = new LinkedHashMap<>();
        Object value = result.getObject("attributes");

        if (value instanceof Map<?, ?> map)
            map.forEach((key, entry) -> attributes.put(String.valueOf(key), String.valueOf(entry)));

        return attributes;
    }

    private static String interval(String period) {
        return switch (period) {
            case "1h" -> "1 HOUR";
            case "24h" -> "24 HOUR";
            case "7d" -> "7 DAY";
            case "30d" -> "30 DAY";
            default -> throw new IllegalArgumentException("period must be one of 1h, 24h, 7d, 30d");
        };
    }
}
