package com.ft_transcendence.vigil.domain.dtos.llm;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class AlertAskRequestDto {
    @NotBlank
    @Size(max = 500)
    private String question;

    @Valid
    @Size(max = 20)
    private List<@NotNull HistoryItem> history = new ArrayList<>();

    public record HistoryItem(
            @NotBlank @Size(max = 500)
            String question,
            @Size(max = 4000)
            String answer)
    {
    }
}
