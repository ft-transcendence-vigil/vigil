package com.ft_transcendence.vigil.domain.dtos.webhooks;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class WebhooksGetAndPostDto {
    private UUID id;
    @NotBlank(message = "url can't be empty")
    @URL(protocol = "https", message = "url must be a well-formed https:// URL")
    private String url;
}
