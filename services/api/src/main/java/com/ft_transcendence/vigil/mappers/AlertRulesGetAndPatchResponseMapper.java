package com.ft_transcendence.vigil.mappers;

import com.ft_transcendence.vigil.domain.dtos.alerts.AlertRulesGetAndPatchResponseDto;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertRules;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AlertRulesGetAndPatchResponseMapper extends StandardMapper<AlertRules, AlertRulesGetAndPatchResponseDto>{

}
