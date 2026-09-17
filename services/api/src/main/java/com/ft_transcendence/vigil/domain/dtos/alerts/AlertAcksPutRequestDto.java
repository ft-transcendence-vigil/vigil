package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.ft_transcendence.vigil.domain.entities.Alerts.Status;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AlertAcksPutRequestDto {
    Status status;
}
