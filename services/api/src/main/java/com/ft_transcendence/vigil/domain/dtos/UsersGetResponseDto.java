package com.ft_transcendence.vigil.domain.dtos;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class UsersGetResponseDto {
    private UUID id;
    private String email;
    private String role;

}
