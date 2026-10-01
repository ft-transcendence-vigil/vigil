package com.ft_transcendence.vigil.websocket;

import com.ft_transcendence.vigil.domain.entities.Role;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import com.ft_transcendence.vigil.repositories.UsersAuth.UserRepository;
import com.ft_transcendence.vigil.security.JjwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MyHandShakeTest {
    private JjwtService jwt;
    private UserRepository users;
    private ServerHttpResponse response;
    private MyHandShake handshake;

    @BeforeEach
    void setUp() {
        jwt = mock(JjwtService.class);
        users = mock(UserRepository.class);
        response = mock(ServerHttpResponse.class);
        handshake = new MyHandShake(jwt, users);
    }

    @Test
    void validUserTokenProvidesIdentityForAcknowledgements() {
        User user = User.builder().id(UUID.randomUUID()).email("user@example.com").role(Role.VIEWER).build();
        when(jwt.getUserName("signed-token")).thenReturn(user.getEmail());
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(jwt.isTokenValid(eq("signed-token"), any(UserPrincipal.class))).thenReturn(true);
        Map<String, Object> attributes = new HashMap<>();

        boolean accepted = handshake.beforeHandshake(request("signed-token"), response,
                mock(WebSocketHandler.class), attributes);

        assertThat(accepted).isTrue();
        assertThat(attributes.get("userId")).isEqualTo(user.getId());
        assertThat(attributes.get("userEmail")).isEqualTo(user.getEmail());
        assertThat(attributes.get("userRole")).isEqualTo("viewer");
    }

    @Test
    void apiKeyIsRejectedBecauseHandshakeRequiresJwt() {
        Map<String, Object> attributes = new HashMap<>();
        assertThat(handshake.beforeHandshake(request("internal-key"), response,
                mock(WebSocketHandler.class), attributes)).isFalse();
        verify(response).setStatusCode(HttpStatus.UNAUTHORIZED);
        assertThat(attributes).isEmpty();
        verify(jwt).getUserName("internal-key");
        verify(users).findByEmail(null);
    }

    @Test
    void missingTokenIsRejected() {
        Map<String, Object> attributes = new HashMap<>();
        assertThat(handshake.beforeHandshake(request(null), response,
                mock(WebSocketHandler.class), attributes)).isFalse();
        verify(response).setStatusCode(HttpStatus.UNAUTHORIZED);
        assertThat(attributes).isEmpty();
    }

    @Test
    void unknownUserIsRejected() {
        when(jwt.getUserName("signed-token")).thenReturn("missing@example.com");
        when(users.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        assertThat(handshake.beforeHandshake(request("signed-token"), response,
                mock(WebSocketHandler.class), new HashMap<>())).isFalse();
        verify(response).setStatusCode(HttpStatus.UNAUTHORIZED);
    }

    private ServerHttpRequest request(String token) {
        ServerHttpRequest request = mock(ServerHttpRequest.class);
        when(request.getURI()).thenReturn(URI.create("http://localhost/api/alerts/ws"
                + (token == null ? "" : "?token=" + token)));
        return request;
    }
}
