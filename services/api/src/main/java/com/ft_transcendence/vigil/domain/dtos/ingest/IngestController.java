package com.ft_transcendence.vigil.domain.dtos.ingest;

import com.ft_transcendence.vigil.configuration.InternalPortConfig;
import com.ft_transcendence.vigil.exceptions.InvalidRequestException;
import com.ft_transcendence.vigil.services.IngestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashSet;
import java.util.Set;

@RestController
@RequiredArgsConstructor
@Slf4j
public class IngestController {
    private final IngestService ingestService;

    @PostMapping("/internal/alerts/trigger-evaluation")
    public ResponseEntity<Void> triggerEvaluationController(
            HttpServletRequest request,
            @Valid @RequestBody NotificationTriggerDto notificationTriggerDto) {
        if (request.getLocalPort() != InternalPortConfig.INGEST_PORT) {
            return ResponseEntity.notFound().build();
        }

        Set<String> serviceNames = new HashSet<>();
        for (NotificationTriggerDto.ServiceTimestamp serviceTimestamp : notificationTriggerDto.getServices()) {
            if (!serviceNames.add(serviceTimestamp.service())) {
                throw new InvalidRequestException("service names must be unique");
            }
        }
        try {
            ingestService.triggerEvaluationService(notificationTriggerDto);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            log.error("Failed to process ingest notification {}", notificationTriggerDto.getNotificationId(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
