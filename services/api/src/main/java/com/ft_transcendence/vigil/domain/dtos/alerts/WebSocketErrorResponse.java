package com.ft_transcendence.vigil.domain.dtos.alerts;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class WebSocketErrorResponse {
    private Type type;
    private String message;
}
