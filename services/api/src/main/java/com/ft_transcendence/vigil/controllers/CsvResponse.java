package com.ft_transcendence.vigil.controllers;

import com.ft_transcendence.vigil.services.TelemetryExport;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.ser.std.ToStringSerializer;
import tools.jackson.dataformat.csv.CsvMapper;
import tools.jackson.dataformat.csv.CsvSchema;

import java.util.Map;

final class CsvResponse {

    private static final CsvMapper MAPPER = CsvMapper.builder()
            .addModule(new SimpleModule().addSerializer(Map.class, ToStringSerializer.instance))
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .build();

    private CsvResponse() {
    }

    static <T> ResponseEntity<StreamingResponseBody> of(TelemetryExport<T> export, Class<T> type) {
        CsvSchema schema = MAPPER.schemaFor(type).withHeader();

        StreamingResponseBody body = output -> {
            try (var rows = MAPPER.writer(schema).writeValues(output)) {
                export.forEachRow(rows::write);
            }
        };

        return ResponseEntity.status(HttpStatus.OK)
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(body);
    }
}
