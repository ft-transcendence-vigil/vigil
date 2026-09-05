package com.ft_transcendence.vigil.mappers;

import com.ft_transcendence.vigil.domain.dtos.webhooks.WebhooksGetAndPostDto;
import com.ft_transcendence.vigil.domain.entities.Webhook;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface WebhooksMapper extends StandardMapper<Webhook, WebhooksGetAndPostDto> {
}
