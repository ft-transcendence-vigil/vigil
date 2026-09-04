package com.ft_transcendence.vigil.domain.dtos.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
public class SessionDto {
    @NotNull(message="id is required")
    private UUID id;

    @NotBlank(message="user agent can't be empty")
    private String userAgent;

    @NotBlank(message="ip address can't be empty")
    private String ipAddress;

    @NotNull(message="last used at is required")
    private Instant lastUsedAt;

    private boolean current = false;
}
