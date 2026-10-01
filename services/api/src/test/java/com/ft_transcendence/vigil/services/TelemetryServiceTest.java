package com.ft_transcendence.vigil.services;

import com.ft_transcendence.vigil.domain.dtos.telemetry.Log;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Metric;
import com.ft_transcendence.vigil.domain.dtos.telemetry.TelemetryPage;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Trace;
import com.ft_transcendence.vigil.exceptions.InvalidRequestException;
import com.ft_transcendence.vigil.repositories.clickhouse.AttributesRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.LogRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.MetricsRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.TraceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class TelemetryServiceTest {
    private LogRepository logs;
    private MetricsRepository metrics;
    private TraceRepository traces;
    private TelemetryService service;

    @BeforeEach
    void setUp() {
        logs = mock(LogRepository.class);
        metrics = mock(MetricsRepository.class);
        traces = mock(TraceRepository.class);
        service = new TelemetryService(logs, metrics, traces, mock(AttributesRepository.class));
    }

    @Test
    void logsUseDefaultPageSizeAndTrimLookaheadRow() {
        Log row = new Log("api", Instant.EPOCH, "trace", "error", "failed", Map.of());
        when(logs.findLogs(null, null, null, null, null, 51, null, 0))
                .thenReturn(java.util.Collections.nCopies(51, row));

        TelemetryPage<Log> page = service.getLogs(null, null, null, null, null, null, null, null);

        assertThat(page.getData()).hasSize(50);
        assertThat(page.isHasMore()).isTrue();
    }

    @Test
    void metricsPassParsedCursorAndLookaheadLimit() {
        Instant cursor = Instant.parse("2026-09-01T12:30:00Z");
        when(metrics.findMetrics("api", "24h", true, cursor, 3)).thenReturn(List.of());

        TelemetryPage<Metric> page = service.getMetrics("api", "24h", true, 2, cursor.toString());

        assertThat(page.getData()).isEmpty();
        assertThat(page.isHasMore()).isFalse();
        verify(metrics).findMetrics("api", "24h", true, cursor, 3);
    }

    @Test
    void customTraceSortUsesOffsetInsteadOfTimestampCursor() {
        service.getTraces("api", "7d", "duration_ms", 10, "2026-09-01T00:00:00Z", 5);

        verify(traces).findTrace("api", "7d", "duration_ms", null, 5, 11);
    }

    @Test
    void timestampTraceSortUsesCursorInsteadOfOffset() {
        Instant cursor = Instant.parse("2026-09-01T00:00:00Z");
        service.getTraces("api", null, "timestamp", 10, cursor.toString(), 5);

        verify(traces).findTrace("api", null, "timestamp", cursor, null, 11);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, 501})
    void rejectsInvalidPageSizesBeforeQuery(int count) {
        assertThatThrownBy(() -> service.getLogs(null, null, null, null, null, count, null, null))
                .isInstanceOf(InvalidRequestException.class);
        verifyNoInteractions(logs);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 501})
    void rejectsInvalidOffsetsBeforeQuery(int offset) {
        assertThatThrownBy(() -> service.getLogs(null, null, null, null, null, 10, null, offset))
                .isInstanceOf(InvalidRequestException.class);
        verifyNoInteractions(logs);
    }

    @Test
    void rejectsInvalidPeriodSortAndCursorBeforeQuery() {
        assertThatThrownBy(() -> service.getLogs("forever", null, null, null, null, 10, null, null))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> service.getLogs(null, null, null, null, "DROP TABLE logs", 10, null, null))
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> service.getLogs(null, null, null, null, null, 10, "yesterday", null))
                .isInstanceOf(InvalidRequestException.class);
        verifyNoInteractions(logs);
    }

    @Test
    void csvFormatAcceptsOnlyDocumentedValues() {
        assertThat(service.isCsv(null)).isFalse();
        assertThat(service.isCsv("json")).isFalse();
        assertThat(service.isCsv("csv")).isTrue();
        assertThatThrownBy(() -> service.isCsv("xml")).isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void csvExportStreamsAllRowsWithoutPagination() {
        Log row = new Log("api", Instant.EPOCH, "trace", "error", "failed", Map.of());
        doAnswer(invocation -> {
            java.util.function.Consumer<Log> consumer = invocation.getArgument(4);
            consumer.accept(row);
            return null;
        }).when(logs).streamAllLogs(eq("1h"), eq("api"), isNull(), isNull(), any());

        java.util.List<Log> exported = new java.util.ArrayList<>();
        service.exportLogsCsv("1h", "api", null, null).forEachRow(exported::add);

        assertThat(exported).containsExactly(row);
    }
}
