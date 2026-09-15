package com.ft_transcendence.vigil.domain.dtos.users;

import com.ft_transcendence.vigil.domain.entities.Role;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class UsersGetAndPostResponseDto {
    private UUID id;
    private String email;
    private Role role;
}
