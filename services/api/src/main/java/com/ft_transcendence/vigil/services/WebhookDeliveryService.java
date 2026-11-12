package com.ft_transcendence.vigil.services;

import com.ft_transcendence.vigil.configuration.VigilProperties;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertHistory;
import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import com.ft_transcendence.vigil.domain.entities.Webhook.Webhook;
import com.ft_transcendence.vigil.repositories.webhook.WebhookRepository;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
public class WebhookDeliveryService {
    private final WebhookRepository webhookRepository;
    private final VigilProperties vigilProperties;
    private final WebhookUrlValidator webhookUrlValidator;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public WebhookDeliveryService(WebhookRepository webhookRepository, VigilProperties vigilProperties,
                                  WebhookUrlValidator webhookUrlValidator, ObjectMapper objectMapper) {
        this.webhookRepository = webhookRepository;
        this.vigilProperties = vigilProperties;
        this.webhookUrlValidator = webhookUrlValidator;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public void sendWebhooksService(AlertHistory alertHistory, String analysis) {
        List<Webhook> webhooks = webhookRepository.findAll();
        if (webhooks.isEmpty())
            return;

        UUID alertId = alertHistory.getId();
        String title = alertHistory.getSeverity() + " alert: " + alertHistory.getMetricName() + " on " + alertHistory.getService();
        String link = vigilProperties.getFrontendBaseUrl() + "/alerts?id=" + alertId;
        WebhookRequestDto webhookRequestDto = new WebhookRequestDto(alertId, title, analysis, "alerting", link,
                alertHistory.getService(), alertHistory.getMetricName(), alertHistory.getThreshold(), alertHistory.getSeverity(),
                alertHistory.getTriggeredAt().toString(), alertHistory.getSignalType(), alertHistory.getWindowSeconds(),
                alertHistory.getAggregation());
        String requestBody = objectMapper.writeValueAsString(webhookRequestDto);
        executor.execute(() -> {
            for (Webhook webhook : webhooks)
                sendWebhook(webhook, alertId, requestBody);
        });
    }

    private void sendWebhook(Webhook webhook, UUID alertId, String requestBody) {
        try {
            String url = webhook.getUrl();
            webhookUrlValidator.validate(url);
            ResponseEntity<Void> response = restClient.post()
                    .uri(URI.create(url))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .toBodilessEntity();
            if (!response.getStatusCode().is2xxSuccessful())
                log.error("Webhook {} failed for alert {} with HTTP status {}",
                        webhook.getId(), alertId, response.getStatusCode().value());
        } catch (RestClientResponseException e) {
            log.error("Webhook {} failed for alert {} with HTTP status {}",
                    webhook.getId(), alertId, e.getStatusCode().value());
        } catch (RuntimeException e) {
            log.error("Webhook {} failed for alert {} ({})", webhook.getId(), alertId, e.getClass().getSimpleName());
        }
    }

    @PreDestroy
    public void close() {
        executor.shutdownNow();
    }

    private record WebhookRequestDto(
            UUID alertUid,
            String title,
            String message,
            String state,
            String linkToUpstreamDetails,
            String service,
            String metricName,
            Double threshold,
            Severity severity,
            String triggeredAt,
            SignalType signalType,
            Integer windowSeconds,
            String aggregation) {
    }
}
