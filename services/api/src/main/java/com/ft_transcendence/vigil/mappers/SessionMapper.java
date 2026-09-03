package com.ft_transcendence.vigil.mappers;

import com.ft_transcendence.vigil.domain.dtos.SessionDto;
import com.ft_transcendence.vigil.domain.entities.Session;
import org.mapstruct.InheritInverseConfiguration;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SessionMapper extends StandardMapper<Session, SessionDto> {
    @Mapping(target = "current", ignore = true)
    SessionDto map(Session session);
    @InheritInverseConfiguration
    Session map(SessionDto sessionDto);
}
