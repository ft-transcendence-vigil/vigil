package com.ft_transcendence.vigil.domain.dtos.alerts;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class PaginationResponse<T> {
    private List<T> data;

    @JsonProperty("hasMore")
    private Boolean hasMore;
}
