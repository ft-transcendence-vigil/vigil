package com.ft_transcendence.vigil.configuration;

import com.ft_transcendence.vigil.security.ApiKeyFile;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;

import java.io.IOException;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

@Getter
@Setter
public class VigilProperties {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private String jwtSecret;
    private String apiKey;
    private String apiKeyFile;
    private String ingestionKey;
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
        if (ingestionKey == null || ingestionKey.isBlank()) {
            ingestionKey = UUID.randomUUID().toString();
        }
        if (frontEndUrl == null || frontEndUrl.isBlank())
            frontEndUrl = "http://localhost:3000";
        if (apiKeyFile != null && !apiKeyFile.isBlank()) {
            try {
                ApiKeyFile.publish(Path.of(apiKeyFile), apiKey);
            } catch (IOException | InvalidPathException exception) {
                throw new IllegalStateException("Unable to publish the API administration credential file.", exception);
            }
        }
    }
}
