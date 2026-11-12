package com.ft_transcendence.vigil.ingest;

import com.ft_transcendence.vigil.configuration.VigilProperties;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertHistory;
import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import com.ft_transcendence.vigil.domain.entities.Webhook.Webhook;
import com.ft_transcendence.vigil.repositories.webhook.WebhookRepository;
import com.ft_transcendence.vigil.services.WebhookUrlValidator;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Component
public class WebhookSender {
    private final WebhookRepository webhookRepository;
    private final VigilProperties vigilProperties;
    private final WebhookUrlValidator webhookUrlValidator;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public WebhookSender(WebhookRepository webhookRepository, VigilProperties vigilProperties,
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

    public void send(AlertHistory alert, String analysis) {
        List<Webhook> webhooks = webhookRepository.findAll();
        if (webhooks.isEmpty())
            return;

        UUID alertId = alert.getId();
        String title = alert.getSeverity() + " alert: " + alert.getMetricName() + " on " + alert.getService();
        String link = vigilProperties.getFrontendBaseUrl() + "/alerts?id=" + alertId;
        WebhookPayload payload = new WebhookPayload(alertId, title, analysis, "alerting", link,
                alert.getService(), alert.getMetricName(), alert.getThreshold(), alert.getSeverity(),
                alert.getTriggeredAt().toString(), alert.getSignalType(), alert.getWindowSeconds(),
                alert.getAggregation());
        String body = objectMapper.writeValueAsString(payload);
        executor.execute(() -> {
            for (Webhook webhook : webhooks)
                sendWebhook(webhook, alertId, body);
        });
    }

    private void sendWebhook(Webhook webhook, UUID alertId, String body) {
        try {
            String url = webhook.getUrl();
            webhookUrlValidator.validate(url);
            ResponseEntity<Void> response = restClient.post()
                    .uri(URI.create(url))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            if (!response.getStatusCode().is2xxSuccessful())
                log.warn("Webhook {} failed for alert {} with status {}", webhook.getId(), alertId, response.getStatusCode());
        } catch (RuntimeException e) {
            log.warn("Webhook {} failed for alert {} ({})", webhook.getId(), alertId, e.getClass().getSimpleName());
        }
    }

    @PreDestroy
    public void close() {
        executor.shutdownNow();
    }

    private record WebhookPayload(
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
