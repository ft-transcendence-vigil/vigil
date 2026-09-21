package com.ft_transcendence.vigil.websocket;

import com.ft_transcendence.vigil.domain.dtos.alerts.*;
import com.ft_transcendence.vigil.exceptions.*;
import com.ft_transcendence.vigil.services.AlertsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;

@Component
@Slf4j
@RequiredArgsConstructor
public class AlertSocketHandler extends TextWebSocketHandler {
    private final AlertSessionRegistry registry;
    private final ObjectMapper mapper;
    private final AlertsService alertsService;

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
            AlertAcksPutDtoResponse ackDto = alertsService.alertAcksPutService(request.alert_id(), request.status());
            WebSocketStatusResponse.Data data = new WebSocketStatusResponse.Data(ackDto.getAlertId(),session.getAttributes().get("userEmail").toString(),ackDto.getStatus(), ackDto.getAckedAt());
            registry.podcastStatus(WebSocketStatusResponse.builder().type(Type.status).data(data).build());
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


