package com.ft_transcendence.vigil.domain.dtos.telemetry;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class TelemetryPage<T> {
    private List<T> data;

    @JsonProperty("hasMore")
    private boolean hasMore;

    public static <T> TelemetryPage<T> of(List<T> rows, int count) {
        boolean hasMore = rows.size() > count;
        return new TelemetryPage<>(hasMore ? rows.subList(0, count) : rows, hasMore);
    }
}
