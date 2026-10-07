package com.ft_transcendence.vigil.repositories.clickhouse;

import com.ft_transcendence.vigil.exceptions.TelemetryRepositoryException;
import com.ft_transcendence.vigil.domain.dtos.telemetry.AttributeResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.util.ArrayList;
import java.util.List;

@Repository
public class AttributesRepository {

    private static final String SELECT = """
            SELECT key, groupUniqArray(value) AS values
            FROM
            (
                SELECT arrayJoin(mapKeys(attributes)) AS key, attributes[key] AS value
                FROM default.logs
                WHERE timestamp >= now() - INTERVAL 7 DAY

                UNION ALL

                SELECT arrayJoin(mapKeys(attributes)) AS key, attributes[key] AS value
                FROM default.metrics
                WHERE timestamp >= now() - INTERVAL 7 DAY

                UNION ALL

                SELECT arrayJoin(mapKeys(attributes)) AS key, attributes[key] AS value
                FROM default.traces
                WHERE timestamp >= now() - INTERVAL 7 DAY
            )
            GROUP BY key
            ORDER BY key
            """;

    private final JdbcTemplate jdbcTemplate;

    public AttributesRepository(@Qualifier("clickHouseJdbcTemplate") JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<AttributeResponse> findAttributes() {
        try {
            return jdbcTemplate.query(SELECT, (result, rowNum) -> {
                Array sqlArray = result.getArray("values");
                List<String> values = new ArrayList<>();

                if (sqlArray != null)
                    for (Object value : (Object[]) sqlArray.getArray())
                        values.add(String.valueOf(value));

                return new AttributeResponse(result.getString("key"), values);
            });
        } catch (DataAccessException e) {
            throw new TelemetryRepositoryException("Failed to query attributes from ClickHouse", e);
        }
    }
}
