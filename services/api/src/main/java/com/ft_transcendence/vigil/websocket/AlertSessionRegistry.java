package com.ft_transcendence.vigil.websocket;

import com.ft_transcendence.vigil.domain.dtos.alerts.WebSocketAlertResponse;
import com.ft_transcendence.vigil.domain.dtos.alerts.WebSocketErrorResponse;
import com.ft_transcendence.vigil.domain.dtos.alerts.WebSocketLlmResponse;
import com.ft_transcendence.vigil.domain.dtos.alerts.WebSocketStatusResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.SessionLimitExceededException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
@RequiredArgsConstructor
public class AlertSessionRegistry {
    private final ObjectMapper mapper;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    public void add(WebSocketSession session) {
        WebSocketSession safeSession =
                new ConcurrentWebSocketSessionDecorator(
                        session,
                        10_000,
                        512 * 1024
                );

        sessions.put(session.getId(), safeSession);
    }

    public void remove(WebSocketSession session) {

        sessions.remove(session.getId());
    }

    public void podcastAlert(WebSocketAlertResponse webSocketAlertResponse)
    {

        podcastTo(webSocketAlertResponse);
    }
    public void podcastLlmAnalyze(WebSocketLlmResponse llmMessage)
    {

        podcastTo(llmMessage);
    }
    public void podcastStatus(WebSocketStatusResponse socketStatusResponse)
    {

        podcastTo(socketStatusResponse);
    }

    public void podcastError(WebSocketErrorResponse webSocketErrorResponse, WebSocketSession session)
    {
        if (!session.isOpen()) {
            remove(session);
            return;
        }
        WebSocketSession safeSession = sessions.get(session.getId());
        if (safeSession == null || !safeSession.isOpen()) {
            remove(session);
            return;
        }
        String message;
        try
        {
            message = mapper.writeValueAsString(webSocketErrorResponse);
        }
        catch (JacksonException e)
        {
            log.error("failed to map the web socket message response", e);
            return;
        }
        try
        {
            safeSession.sendMessage(new TextMessage(message));
        }
        catch (SessionLimitExceededException | IOException e) {
            log.error(
                    "failed to send the message to the user_id : {}",
                    session.getAttributes().get("userId"),
                    e
            );

            remove(session);
        }
    }


    private void podcastTo(Object DtoMsg)
    {
        String message;
        try
        {
            message = mapper.writeValueAsString(DtoMsg);
        }
        catch (JacksonException e)
        {
            log.error("failed to map the web socket message response", e);
            return;
        }
        sessions.values().forEach(
                (s)->
                {
                    if (!s.isOpen()) {
                        remove(s);
                        return;
                    }
                    try
                    {
                        s.sendMessage(new TextMessage(message));
                    }
                    catch (SessionLimitExceededException | IOException e) {
                        log.error(
                                "failed to send the message to the user_id : {}",
                                s.getAttributes().get("userId"),
                                e
                        );

                        remove(s);
                    }
                }
        );
    }
    public Set<WebSocketSession> getSessions() {
        return Set.copyOf(sessions.values());
    }
}
