package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Status;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
public class AlertAcksPutDtoResponse {
    private UUID alertId;
    private String userEmail;
    private Status status;
    private Instant ackedAt;
}