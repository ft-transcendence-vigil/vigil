package com.ft_transcendence.vigil.domain.entities.Alerts;

import jakarta.persistence.Embeddable;
import lombok.EqualsAndHashCode;
import java.io.Serializable;
import java.util.UUID;

@EqualsAndHashCode
@Embeddable
public class AlertAcksId implements Serializable {
    private UUID userId;
    private UUID alertId;
}
