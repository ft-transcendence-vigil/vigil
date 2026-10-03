package com.ft_transcendence.vigil.controllers;

import com.ft_transcendence.vigil.configuration.VigilProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/config")
public class ConfigController {
    private final VigilProperties properties;

    public record ConfigKeysResponse(String apiKey, String ingestionKey) {}

    @GetMapping("/keys")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<ConfigKeysResponse> keys() {
        return ResponseEntity.ok()
                .body(new ConfigKeysResponse(properties.getApiKey(), properties.getIngestionKey()));
    }
}
