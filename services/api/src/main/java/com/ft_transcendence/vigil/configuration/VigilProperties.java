package com.ft_transcendence.vigil.configuration;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

@Getter
@Setter
public class VigilProperties {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private String jwtSecret;
    private String apiKey;
    private long accessTokenExpiration;
    private long refreshTokenExpiration;
    private String frontEndUrl;

    @PostConstruct
    void init() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            byte[] bytes = new byte[64];
            SECURE_RANDOM.nextBytes(bytes);
            jwtSecret = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        }
        if (apiKey == null || apiKey.isBlank()) {
            apiKey = UUID.randomUUID().toString();
        }
        if (frontEndUrl == null || frontEndUrl.isBlank())
            frontEndUrl = "http://localhost:3000";
    }
}
