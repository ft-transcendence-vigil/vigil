package com.ft_transcendence.vigil.controllers;

import com.ft_transcendence.vigil.services.WebhooksService;
import com.ft_transcendence.vigil.domain.dtos.webhooks.WebhooksGetAndPostDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/webhooks")
@PreAuthorize("hasRole('admin')")
public class WebhooksController {
    private final WebhooksService webhooksService;

    @GetMapping("")
    ResponseEntity<List<WebhooksGetAndPostDto>> listWebhooks() {
        List<WebhooksGetAndPostDto> webhooks = webhooksService.listWebhooks();
        return ResponseEntity.status(HttpStatus.OK).body(webhooks);
    }

    @PostMapping("")
    ResponseEntity<WebhooksGetAndPostDto> createWebhook(@RequestBody @Valid WebhooksGetAndPostDto webhooksPostDto) {
        WebhooksGetAndPostDto webhook = webhooksService.createWebhook(webhooksPostDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(webhook);
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> deleteWebhook(@PathVariable UUID id) {
        webhooksService.deleteWebhook(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).body(null);
    }
}
