package com.ft_transcendence.vigil.configuration;

import com.ft_transcendence.vigil.security.ApiKeyFile;
import jakarta.annotation.PostConstruct;
import lombok.AccessLevel;
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
    @Setter(AccessLevel.NONE)
    private String apiKey;
    private String apiKeyFile = "/var/lib/vigil/admin/api-key";
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
        try {
            if (apiKeyFile == null || apiKeyFile.isBlank()) {
                throw new IOException("An API key file path is required.");
            }
            apiKey = ApiKeyFile.loadOrCreate(Path.of(apiKeyFile));
        } catch (IOException | InvalidPathException exception) {
            throw new IllegalStateException("Unable to load or initialize the API credential file.", exception);
        }
        if (ingestionKey == null || ingestionKey.isBlank()) {
            ingestionKey = UUID.randomUUID().toString();
        }
        if (frontEndUrl == null || frontEndUrl.isBlank())
            frontEndUrl = "http://localhost:3000";

    }
}
