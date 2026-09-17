package com.ft_transcendence.vigil.mappers;

import com.ft_transcendence.vigil.domain.dtos.auth.SessionDto;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.Session;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SessionMapper {
    @Mapping(target = "current", ignore = true)
    SessionDto map(Session session);
}
