package com.ft_transcendence.vigil.domain.dtos.alerts;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;
@Getter
@Setter
@Builder
public class WebSocketLlmResponse {
    private Type type;
    private Data data;
    public record Data(         UUID id,
                                String status,
                                String llmAnalysis){

    };
}
