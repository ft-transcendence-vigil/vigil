package com.ft_transcendence.vigil.domain.dtos.ingest;

import com.ft_transcendence.vigil.exceptions.InvalidRequestException;
import com.ft_transcendence.vigil.ingest.InternalPortConfig;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class IngestController {
    @PostMapping("/internal/alerts/trigger-evaluation")
    public ResponseEntity<Void> trigger(
            HttpServletRequest request,
            @Valid @RequestBody NotificationTriggerDto notification) {
        if (request.getLocalPort() != InternalPortConfig.PORT) {
            return ResponseEntity.notFound().build();
        }

        List<NotificationTriggerDto.ServiceEntry> services = notification.getServices();
        long distinct = services.stream().map(NotificationTriggerDto.ServiceEntry::service).distinct().count();
        if (distinct != services.size()) {
            throw new InvalidRequestException("service names must be unique");
        }
        // ill add the handler logic later
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }
}
