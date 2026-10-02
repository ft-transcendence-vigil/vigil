package com.ft_transcendence.vigil.domain.dtos.alerts;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
public class AlertNotoficationResponsePutDto {
    private UUID alertId;
    private boolean seen;
    private Instant seenAt;

}
