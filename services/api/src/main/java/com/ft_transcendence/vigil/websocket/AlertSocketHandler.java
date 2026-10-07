package com.ft_transcendence.vigil.websocket;

import com.ft_transcendence.vigil.domain.dtos.alerts.*;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import com.ft_transcendence.vigil.exceptions.*;
import com.ft_transcendence.vigil.repositories.UsersAuth.UserRepository;
import com.ft_transcendence.vigil.services.AlertsService;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
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

import java.time.Duration;
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
            WebSocketRequest request;
            Bucket bucket = (Bucket)session.getAttributes().get("bucket");
            ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
            if(!probe.isConsumed())
            {
                long retryAfterSeconds = Duration.ofNanos(probe.getNanosToWaitForRefill()).toSeconds();
                sendError(session, "rate limited. Try again in " + retryAfterSeconds + " seconds.");
                return;
            }
            try {
                request = mapper.readValue(message.getPayload(), WebSocketRequest.class);
            } catch (JacksonException e) {
                sendError(session, "invalid ack or notification");
                return;
            }
            if (request == null) {
                sendError(session, "invalid ack or notification");
                return;
            }
            if ("ack".equals(request.getType()) || "notif".equals(request.getType())) {
                if (request.getAlert_id() == null) {
                    sendError(session, "alert_id is required");
                    return;
                }
                if ("ack".equals(request.getType()) && request.getStatus() == null) {
                    sendError(session, "status is required");
                    return;
                }
                if ("notif".equals(request.getType()) && request.getSeen() == null) {
                    sendError(session, "seen is required");
                    return;
                }
                try{
                    UUID userId = (UUID) session.getAttributes().get("userId");
                    User user = userRepository.findById(userId).orElseThrow();
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(new UserPrincipal(user), null, new UserPrincipal(user).getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    if ("ack".equals(request.getType()))
                        alertsService.alertHistoryPatchService(request.getAlert_id(),request.getStatus());
                    if ("notif".equals(request.getType()))
                        alertsService.alertNotificationPutService(request.getAlert_id(), request.getSeen());
                }
                catch (ResourcesNotFoundException | InvalidRequestException e) {
                    sendError(session, "invalid ack");
                }
                finally {
                    SecurityContextHolder.clearContext();
                }
            }
            else
            {
                sendError(session, "type must be ack");
                return;
            }
        }
        catch (Exception e) {
            sendError(session, "socket error");
        }
    }


    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status)
    {
        registry.remove(session);
    }
}


