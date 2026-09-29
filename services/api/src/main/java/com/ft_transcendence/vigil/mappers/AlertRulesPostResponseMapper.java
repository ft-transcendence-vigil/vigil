package com.ft_transcendence.vigil.mappers;

import com.ft_transcendence.vigil.domain.dtos.alerts.AlertRulesPostDtoResponse;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertRules;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;


@Mapper(componentModel = "spring")
public interface AlertRulesPostResponseMapper extends StandardMapper<AlertRules, AlertRulesPostDtoResponse>{
    @Override
    @Mapping(target = "isDefault", source = "default")
    AlertRulesPostDtoResponse map(AlertRules from);
}
