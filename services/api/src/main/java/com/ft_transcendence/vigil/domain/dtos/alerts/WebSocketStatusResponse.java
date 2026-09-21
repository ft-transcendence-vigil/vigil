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
public class WebSocketStatusResponse {
    private Type type;
    private Data data;
    public record Data(
            UUID alertId,
            String userEmail,
            Status status,
            Instant ackedAt
    ) {}
}