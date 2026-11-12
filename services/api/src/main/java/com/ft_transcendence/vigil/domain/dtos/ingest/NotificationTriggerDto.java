package com.ft_transcendence.vigil.domain.dtos.ingest;

import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class NotificationTriggerDto {
    @NotNull
    private UUID notificationId;

    @NotNull
    private SignalType signalType;

    @NotNull
    private Instant storedAt;

    @NotEmpty
    private List<@Valid @NotNull ServiceTimestamp> services;

    public record ServiceTimestamp(@NotBlank String service, @NotNull Instant latestTimestamp) {
    }
}
