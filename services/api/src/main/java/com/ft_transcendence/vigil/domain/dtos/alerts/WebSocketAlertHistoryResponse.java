package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Status;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
public class WebSocketAlertHistoryResponse {
    Type type;
    private Data data;
    public record Data(
            UUID alertHistoryId,
            Status status,
            Instant ackedAt,
            String ackedBy,
            Instant resolvedAt,
            String resolvedBy)
    {}
}
