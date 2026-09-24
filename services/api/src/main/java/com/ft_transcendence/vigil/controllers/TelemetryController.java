package com.ft_transcendence.vigil.controllers;

import com.ft_transcendence.vigil.domain.dtos.telemetry.Log;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Metric;
import com.ft_transcendence.vigil.domain.dtos.telemetry.Trace;
import com.ft_transcendence.vigil.domain.dtos.telemetry.AttributeResponse;
import com.ft_transcendence.vigil.serversentevents.LogSseRegistry;
import com.ft_transcendence.vigil.serversentevents.TraceSseRegistry;
import com.ft_transcendence.vigil.services.TelemetryService;
import jakarta.annotation.Nullable;
import jakarta.validation.constraints.Null;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.yaml.snakeyaml.emitter.Emitter;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/telemetry")
@PreAuthorize("hasAnyRole('admin', 'viewer')")
public class TelemetryController {

    private final TelemetryService telemetryService;
    private final LogSseRegistry logSseRegistry;

    private final TraceSseRegistry traceSseRegistry;


    @GetMapping("/logs")
    ResponseEntity<?> getLogs(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String service,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer count,
            @RequestParam(required = false) String before,
            @RequestParam(required = false) Integer offset,
            @RequestParam(required = false) String format) {

        if (telemetryService.isCsv(format))
            return CsvResponse.of(
                    telemetryService.exportLogsCsv(period, service, severity, search), Log.class);

        return ResponseEntity.status(HttpStatus.OK).body(
                telemetryService.getLogs(period, service, severity, search, sort, count, before, offset));
    }

    @GetMapping("/metrics")
    ResponseEntity<?> getMetrics(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String service,
            @RequestParam(required = false) Integer count,
            @RequestParam(required = false) String before,
            @RequestParam(name = "vigil.internal", required = false) Boolean internalOnly,
            @RequestParam(required = false) String format) {

        if (telemetryService.isCsv(format))
            return CsvResponse.of(
                    telemetryService.exportMetricsCsv(service, period, internalOnly), Metric.class);

        return ResponseEntity.status(HttpStatus.OK).body(
                telemetryService.getMetrics(service, period, internalOnly, count, before));
    }

    @GetMapping("/traces")
    ResponseEntity<?> getTraces(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String service,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer count,
            @RequestParam(required = false) String before,
            @RequestParam(required = false) Integer offset,
            @RequestParam(required = false) String format) {

        if (telemetryService.isCsv(format))
            return CsvResponse.of(
                    telemetryService.exportTracesCsv(service, period), Trace.class);

        return ResponseEntity.status(HttpStatus.OK).body(
                telemetryService.getTraces(service, period, sort, count, before, offset));
    }

    @GetMapping("/attributes")
    ResponseEntity<List<AttributeResponse>> getAttributes() {
        return ResponseEntity.status(HttpStatus.OK).body(telemetryService.getAttributes());
    }
    @GetMapping("/logs/live")
    SseEmitter loveLogsHandler(@RequestParam(required = false) String service, @RequestParam(required = false) String severity)
    {
        SseEmitter emitter = logSseRegistry.addSseEmitter(severity, service);
        return emitter;
    }
    @GetMapping("/logs/trace")
    SseEmitter traceLogsHandler(@RequestParam(required = false) String service)
    {
        SseEmitter emitter = traceSseRegistry.addSseEmitter(service);
        return emitter;
    }
}
