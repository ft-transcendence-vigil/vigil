package com.ft_transcendence.vigil.domain.dtos.alerts;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
@Getter
@Setter
@AllArgsConstructor
public class PaginationResponse<T>{
    private List<T> result;
    private Boolean hasMore;
}
