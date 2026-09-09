package com.ft_transcendence.vigil.repositories;

import com.ft_transcendence.vigil.domain.entities.Webhook.Webhook;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WebhookRepository extends JpaRepository<Webhook, UUID> {
    Optional<Webhook> findByUrl(String url);
}
