package com.ft_transcendence.vigil.mappers;

import com.ft_transcendence.vigil.domain.dtos.alerts.AlertRulesPostDtoResponse;
import com.ft_transcendence.vigil.domain.dtos.alerts.AlertRulesPostRequestDto;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertRules;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AlertRulesPostResponseMapper extends StandardMapper<AlertRules, AlertRulesPostDtoResponse>{
}
