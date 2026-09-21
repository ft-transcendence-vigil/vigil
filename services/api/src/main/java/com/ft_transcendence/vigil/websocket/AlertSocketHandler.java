package com.ft_transcendence.vigil.websocket;

import com.ft_transcendence.vigil.domain.dtos.alerts.*;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import com.ft_transcendence.vigil.exceptions.*;
import com.ft_transcendence.vigil.repositories.UsersAuth.UserRepository;
import com.ft_transcendence.vigil.services.AlertsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class AlertSocketHandler extends TextWebSocketHandler {
    private final AlertSessionRegistry registry;
    private final ObjectMapper mapper;
    private final AlertsService alertsService;
    final private UserRepository userRepository;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {

        registry.add(session);
    }


    private void sendError(WebSocketSession session,String message)
    {
        registry.podcastError(WebSocketErrorResponse.builder().type(Type.error).message(message).build(), session);
    }
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            WebSocketAckRequest request;
            try {
                request = mapper.readValue(message.getPayload(), WebSocketAckRequest.class);
            } catch (JacksonException e) {
                sendError(session, "invalid ack");
                return;
            }
            if (!"ack".equals(request.type())) {
                sendError(session, "type must be ack");
                return;
            }
            try{


            UUID userId = (UUID) session.getAttributes().get("userId");
            User user = userRepository.findById(userId).orElseThrow();

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    new UserPrincipal(user), null, new UserPrincipal(user).getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(auth);

            alertsService.alertAcksPutService(request.alert_id(), request.status());
            }
            finally {
                SecurityContextHolder.clearContext();
            }
        }
        catch (ResourcesNotFoundException | InvalidRequestException e) {
            sendError(session, "invalid ack");
        }
        catch (Exception e) {
            log.error("unexpected websocket ack error", e);
            sendError(session, "server error");
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status)
    {
        registry.remove(session);
    }
}


