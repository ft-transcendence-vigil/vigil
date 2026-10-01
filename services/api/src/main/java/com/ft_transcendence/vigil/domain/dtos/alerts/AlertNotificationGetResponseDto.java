package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertNotificationGetResponseDto {
    private boolean hasMore;
    private List<Notification> notifications;
    public record Notification(
            UUID alertHistoryId,
            String service,
            Instant triggeredAt,
            String metricName,
            SignalType signalType,
            Severity severity,
            boolean seen,
            Instant seenAt
    ) {}
}