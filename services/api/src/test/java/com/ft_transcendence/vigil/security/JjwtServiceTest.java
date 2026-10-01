package com.ft_transcendence.vigil.security;

import com.ft_transcendence.vigil.configuration.VigilProperties;
import com.ft_transcendence.vigil.domain.entities.Role;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JjwtServiceTest {
    private JjwtService service;

    @BeforeEach
    void setUp() {
        VigilProperties properties = new VigilProperties();
        properties.setJwtSecret("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        properties.setAccessTokenExpiration(3600000L);
        properties.setRefreshTokenExpiration(2592000000L);
        service = new JjwtService(properties);
    }

    @Test
    void issuedAccessTokenIsValidOnlyForItsSubject() {
        UserPrincipal owner = principal("owner@example.com");
        String token = service.generateToken(owner);

        assertThat(service.getUserName(token)).isEqualTo("owner@example.com");
        assertThat(service.isTokenValid(token, owner)).isTrue();
        assertThat(service.isTokenValid(token, principal("other@example.com"))).isFalse();
    }

    @Test
    void modifiedAccessTokenIsRejected() {
        UserPrincipal owner = principal("owner@example.com");
        String token = service.generateToken(owner);
        int signatureStart = token.lastIndexOf('.') + 1;
        String modified = token.substring(0, signatureStart)
                + (token.charAt(signatureStart) == 'a' ? "b" : "a")
                + token.substring(signatureStart + 1);

        assertThat(service.isTokenValid(modified, owner)).isFalse();
    }

    @Test
    void refreshTokensAreRandomAndHashingIsRepeatable() {
        String first = service.generateRefreshToken();
        String second = service.generateRefreshToken();

        assertThat(first).isNotEqualTo(second);
        assertThat(service.hashRefreshToken(first)).isEqualTo(service.hashRefreshToken(first));
        assertThat(service.hashRefreshToken(first)).isNotEqualTo(service.hashRefreshToken(second));
        assertThat(service.hashRefreshToken(first)).isNotEqualTo(first);
    }

    @Test
    void reportsConfiguredRefreshLifetime() {
        assertThat(service.getRefreshTokenExpiration()).isEqualTo(2592000000L);
    }

    private UserPrincipal principal(String email) {
        return new UserPrincipal(User.builder().id(UUID.randomUUID()).email(email).role(Role.VIEWER).build());
    }
}
