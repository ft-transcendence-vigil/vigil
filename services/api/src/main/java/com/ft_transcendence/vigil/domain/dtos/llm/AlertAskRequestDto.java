package com.ft_transcendence.vigil.domain.dtos.llm;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AlertAskRequestDto {
    @NotBlank
    @Size(max = 500)
    private String question;
}
