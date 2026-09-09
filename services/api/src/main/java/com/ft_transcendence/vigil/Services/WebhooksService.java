package com.ft_transcendence.vigil.Services;

import com.ft_transcendence.vigil.domain.dtos.webhooks.WebhooksGetAndPostDto;
import com.ft_transcendence.vigil.domain.entities.Webhook.Webhook;
import com.ft_transcendence.vigil.exceptions.DuplicatedResourcesException;
import com.ft_transcendence.vigil.exceptions.ResourcesNotFoundException;
import com.ft_transcendence.vigil.mappers.WebhooksMapper;
import com.ft_transcendence.vigil.repositories.WebhookRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@Service
public class WebhooksService {
    private final WebhookRepository webhookRepository;
    private final WebhooksMapper webhooksMapper;

    public List<WebhooksGetAndPostDto> listWebhooks() {
        return webhookRepository.findAll().stream().map(webhooksMapper::map).toList();
    }

    @Transactional
    public WebhooksGetAndPostDto createWebhook(WebhooksGetAndPostDto webhooksPostDto) {
        if (webhookRepository.findByUrl(webhooksPostDto.getUrl()).isPresent())
            throw new DuplicatedResourcesException("webhook url already registered");

        Webhook webhook = Webhook.builder()
                  .url(webhooksPostDto.getUrl())
                .build();
        webhookRepository.save(webhook);
        return webhooksMapper.map(webhook);
    }

    @Transactional
    public void deleteWebhook(UUID id) {
        Webhook webhook = webhookRepository.findById(id).orElseThrow(() -> new ResourcesNotFoundException("webhook not found"));
        webhookRepository.delete(webhook);
    }
}
