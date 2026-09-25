package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Status;

import java.util.UUID;

public record WebSocketAckRequest(
        String type,
        UUID alert_id,
        Status status
) {
}