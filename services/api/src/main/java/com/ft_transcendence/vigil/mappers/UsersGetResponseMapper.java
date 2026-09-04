package com.ft_transcendence.vigil.mappers;

import com.ft_transcendence.vigil.domain.dtos.UsersGetAndPostResponseDto;
import com.ft_transcendence.vigil.domain.entities.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UsersGetResponseMapper extends StandardMapper<User, UsersGetAndPostResponseDto>{
}
