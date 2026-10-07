package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
public class WebSocketNotificationResponse {

    private Type type;
    private Data data;

    public record Data(
            UUID alertHistoryId,
            String service,
            Instant triggeredAt,
            String metricName,
            SignalType signalType,
            Severity severity,
            boolean seen,
            Instant seenAt
    ) {
    }
}