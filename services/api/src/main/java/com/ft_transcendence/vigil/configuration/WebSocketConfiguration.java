package com.ft_transcendence.vigil.configuration;

import com.ft_transcendence.vigil.websocket.AlertSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@RequiredArgsConstructor
@EnableWebSocket
public class WebSocketConfiguration implements WebSocketConfigurer {
    private final AlertSocketHandler handler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // TODO TokenHandshakeInterceptor is not written yet, so this endpoint
        // is still unauthenticated
        registry.addHandler(handler, "/api/alerts/ws")
                .setAllowedOrigins("changethiswhenredafinishesthefrontend");
    }
}
