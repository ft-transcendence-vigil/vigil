package com.ft_transcendence.vigil.repositories.clickhouse;

import com.ft_transcendence.vigil.exceptions.TelemetryRepositoryException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ClickHouseQueryTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final RowMapper<String> mapper = (row, index) -> row.getString(1);

    @Test
    void bindsUserFiltersAndPaginationInsteadOfInterpolatingThem() {
        String malicious = "' OR 1=1 --";
        Instant cursor = Instant.parse("2026-09-01T00:00:00Z");

        ClickHouseQuery.from("SELECT * FROM logs")
                .eq("service", malicious)
                .like("message", "failure")
                .since("24h")
                .before(cursor)
                .orderBy("timestamp DESC")
                .limit(11)
                .offset(5)
                .list(jdbc, mapper, "logs");

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> params = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), params.capture());
        assertThat(sql.getValue())
                .contains("service = ?", "message ILIKE ?", "INTERVAL 24 HOUR", "timestamp < ?", "ORDER BY timestamp DESC LIMIT ? OFFSET ?")
                .doesNotContain(malicious);
        assertThat(params.getValue()).containsExactly(malicious, "%failure%", Timestamp.from(cursor), 11, 5);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "2h", "1d", "forever"})
    void rejectsUnsupportedPeriods(String period) {
        if (period.isBlank()) {
            ClickHouseQuery.from("SELECT 1").since(period).list(jdbc, mapper, "logs");
            verify(jdbc).query(eq("SELECT 1"), any(RowMapper.class), any(Object[].class));
        } else {
            assertThatThrownBy(() -> ClickHouseQuery.from("SELECT 1").since(period))
                    .isInstanceOf(IllegalArgumentException.class);
            verifyNoInteractions(jdbc);
        }
    }

    @Test
    void wrapsDatabaseFailuresWithSignalContext() {
        DataAccessResourceFailureException failure = new DataAccessResourceFailureException("offline");
        when(jdbc.query(any(String.class), any(RowMapper.class), any(Object[].class))).thenThrow(failure);

        assertThatThrownBy(() -> ClickHouseQuery.from("SELECT 1").list(jdbc, mapper, "metrics"))
                .isInstanceOf(TelemetryRepositoryException.class)
                .hasMessageContaining("metrics")
                .hasCause(failure);
    }

    @Test
    void mapsClickHouseAttributesAndHandlesMissingValues() throws Exception {
        ResultSet result = mock(ResultSet.class);
        when(result.getObject("attributes")).thenReturn(Map.of("host", "api-1", "attempt", 3));
        assertThat(ClickHouseQuery.attributes(result)).containsEntry("host", "api-1").containsEntry("attempt", "3");

        when(result.getObject("attributes")).thenReturn(null);
        assertThat(ClickHouseQuery.attributes(result)).isEmpty();
    }
}
