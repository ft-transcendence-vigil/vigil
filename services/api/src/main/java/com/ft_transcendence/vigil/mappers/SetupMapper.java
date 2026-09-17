package com.ft_transcendence.vigil.mappers;

import com.ft_transcendence.vigil.domain.dtos.auth.SetupDto;
import com.ft_transcendence.vigil.domain.entities.User;
import org.mapstruct.InheritInverseConfiguration;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
@Mapper(componentModel = "spring")
public interface SetupMapper {

        @Mapping(target = "passwordHash", source = "password")
        User map(SetupDto setupDto);

}
