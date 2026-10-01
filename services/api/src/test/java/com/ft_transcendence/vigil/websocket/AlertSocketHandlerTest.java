package com.ft_transcendence.vigil.websocket;

import com.ft_transcendence.vigil.domain.dtos.alerts.WebSocketAckRequest;
import com.ft_transcendence.vigil.domain.dtos.alerts.WebSocketErrorResponse;
import com.ft_transcendence.vigil.domain.entities.Alerts.Status;
import com.ft_transcendence.vigil.domain.entities.Role;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import com.ft_transcendence.vigil.repositories.UsersAuth.UserRepository;
import com.ft_transcendence.vigil.services.AlertsService;
import io.github.bucket4j.Bucket;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AlertSocketHandlerTest {
    private AlertSessionRegistry registry;
    private ObjectMapper mapper;
    private AlertsService alerts;
    private UserRepository users;
    private AlertSocketHandler handler;

    @BeforeEach
    void setUp() {
        registry = mock(AlertSessionRegistry.class);
        mapper = mock(ObjectMapper.class);
        alerts = mock(AlertsService.class);
        users = mock(UserRepository.class);
        handler = new AlertSocketHandler(registry, mapper, alerts, users);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void acceptedAcknowledgementRunsAsConnectingUserAndClearsSecurityContext() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID alertId = UUID.randomUUID();
        User user = User.builder().id(userId).email("user@example.com").role(Role.VIEWER).build();
        WebSocketSession session = session(userId);
        when(mapper.readValue(any(String.class), eq(WebSocketAckRequest.class)))
                .thenReturn(new WebSocketAckRequest("ack", alertId, Status.acknowledged));
        when(users.findById(userId)).thenReturn(Optional.of(user));
        doAnswer(invocation -> {
            assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo(user.getEmail());
            return null;
        }).when(alerts).alertAcksPutService(alertId, Status.acknowledged);

        handler.handleTextMessage(session, new TextMessage("ack"));

        verify(alerts).alertAcksPutService(alertId, Status.acknowledged);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void nonAcknowledgementMessageDoesNotMutateAlerts() throws Exception {
        WebSocketSession session = session(UUID.randomUUID());
        when(mapper.readValue(any(String.class), eq(WebSocketAckRequest.class)))
                .thenReturn(new WebSocketAckRequest("status", UUID.randomUUID(), Status.acknowledged));

        handler.handleTextMessage(session, new TextMessage("status"));

        verifyNoInteractions(alerts, users);
        verify(registry).podcastError(any(WebSocketErrorResponse.class), eq(session));
    }

    @Test
    void connectionLifecycleUpdatesRegistry() {
        WebSocketSession session = session(UUID.randomUUID());
        handler.afterConnectionEstablished(session);
        handler.afterConnectionClosed(session, CloseStatus.NORMAL);
        verify(registry).add(session);
        verify(registry).remove(session);
    }

    private WebSocketSession session(UUID userId) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getAttributes()).thenReturn(Map.of("userId", userId, "bucket", bucket()));
        return session;
    }

    private Bucket bucket() {
        return Bucket.builder()
                .addLimit(limit -> limit.capacity(10).refillIntervally(10, java.time.Duration.ofSeconds(60)))
                .build();
    }
}
