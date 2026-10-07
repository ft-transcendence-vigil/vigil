package com.ft_transcendence.vigil.domain.dtos.telemetry;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class AttributeResponse {
    private String key;
    private List<String> values;
}
