package com.ft_transcendence.vigil.services;

import com.ft_transcendence.vigil.exceptions.InvalidRequestException;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Log;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Metric;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Trace;
import com.ft_transcendence.vigil.repositories.clickhouse.AttributesRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.LogRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.MetricsRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.TraceRepository;
import com.ft_transcendence.vigil.domain.dtos.telemetry.AttributeResponse;
import com.ft_transcendence.vigil.domain.dtos.telemetry.TelemetryPage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TelemetryService {

    private static final Set<String> PERIODS = Set.of("1h", "24h", "7d", "30d");

    private static final Set<String> LOG_SORT_FIELDS =
            Set.of("timestamp", "service", "severity", "message", "trace_id");

    private static final Set<String> TRACE_SORT_FIELDS = Set.of(
            "timestamp", "trace_id", "span_id", "parent_span_id",
            "name", "service", "duration_ms", "status");

    private static final int DEFAULT_COUNT = 50;
    private static final int MAX_COUNT = 500;

    private final LogRepository logRepository;
    private final MetricsRepository metricsRepository;
    private final TraceRepository traceRepository;
    private final AttributesRepository attributesRepository;

    public TelemetryPage<Log> getLogs(
            String period,
            String service,
            String severity,
            String search,
            String sort,
            Integer count,
            String before,
            Integer offset) {

        period(period);
        sort(sort, LOG_SORT_FIELDS);

        int actualCount = count(count);

        List<Log> logs = logRepository.findLogs(
                period,
                service,
                severity,
                search,
                sort,
                actualCount + 1,
                before(before),
                offset(offset));

        return TelemetryPage.of(logs, actualCount);
    }

    public TelemetryExport<Log> exportLogsCsv(String period, String service, String severity, String search) {
        period(period);

        return consumer -> logRepository.streamAllLogs(period, service, severity, search, consumer);
    }

    public TelemetryPage<Metric> getMetrics(
            String service,
            String period,
            Boolean internalOnly,
            Integer count,
            String before) {

        period(period);

        int actualCount = count(count);

        List<Metric> metrics = metricsRepository.findMetrics(
                service,
                period,
                internalOnly,
                before(before),
                actualCount + 1);

        return TelemetryPage.of(metrics, actualCount);
    }

    public TelemetryExport<Metric> exportMetricsCsv(String service, String period, Boolean internalOnly) {
        period(period);

        return consumer -> metricsRepository.streamAllMetrics(service, period, internalOnly, consumer);
    }

    public TelemetryPage<Trace> getTraces(
            String service,
            String period,
            String sort,
            Integer count,
            String before,
            Integer offset) {

        period(period);
        sort(sort, TRACE_SORT_FIELDS);

        int actualCount = count(count);
        boolean defaultSort = sort == null || sort.equals("timestamp");

        List<Trace> traces = traceRepository.findTrace(
                service,
                period,
                sort,
                defaultSort ? before(before) : null,
                defaultSort ? null : offset(offset),
                actualCount + 1);

        return TelemetryPage.of(traces, actualCount);
    }

    public TelemetryExport<Trace> exportTracesCsv(String service, String period) {
        period(period);

        return consumer -> traceRepository.streamAllTraces(service, period, consumer);
    }

    public List<AttributeResponse> getAttributes() {
        return attributesRepository.findAttributes();
    }

    public boolean isCsv(String format) {
        if (format == null || format.equals("json"))
            return false;

        if (format.equals("csv"))
            return true;

        throw new InvalidRequestException("format must be json or csv");
    }

    private int count(Integer count) {
        if (count == null)
            return DEFAULT_COUNT;

        if (count < 1 || count > MAX_COUNT)
            throw new InvalidRequestException("count must be between 1 and " + MAX_COUNT);

        return count;
    }

    private int offset(Integer offset) {
        if (offset == null)
            return 0;

        if (offset < 0 || offset > MAX_COUNT)
            throw new InvalidRequestException("offset must be between 0 and " + MAX_COUNT);

        return offset;
    }

    private void period(String period) {
        if (period != null && !PERIODS.contains(period))
            throw new InvalidRequestException("period must be one of 1h, 24h, 7d, 30d");
    }

    private Instant before(String before) {
        if (before == null)
            return null;

        try {
            return Instant.parse(before);
        } catch (DateTimeParseException e) {
            throw new InvalidRequestException("before must be a valid ISO8601 timestamp");
        }
    }

    private void sort(String sort, Set<String> allowed) {
        if (sort != null && !allowed.contains(sort))
            throw new InvalidRequestException("unknown sort field: " + sort);
    }
}
