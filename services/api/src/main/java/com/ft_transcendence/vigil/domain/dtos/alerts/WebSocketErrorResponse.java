package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WebSocketErrorResponse {
    private Type type;
    private String message;
    private Long retryAfterSeconds;
}