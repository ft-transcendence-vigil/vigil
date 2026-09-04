package com.ft_transcendence.vigil.mappers;

import com.ft_transcendence.vigil.domain.dtos.auth.LoginDto;
import com.ft_transcendence.vigil.domain.entities.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
@Mapper(componentModel = "spring")
public interface LoginMapper {
    @Mapping(target = "password", source = "passwordHash")
    LoginDto map(User user);
}