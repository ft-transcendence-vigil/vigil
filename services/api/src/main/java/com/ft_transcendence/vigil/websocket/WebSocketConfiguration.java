package com.ft_transcendence.vigil.websocket;

import com.ft_transcendence.vigil.websocket.AlertSocketHandler;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Configuration
@RequiredArgsConstructor
@EnableWebSocket
public class WebSocketConfiguration implements WebSocketConfigurer {
    private final AlertSocketHandler handler;
    private final MyHandShake MyHandShake;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {

        registry.addHandler(handler, "/api/alerts/ws")
                // we need to set up later the name of the website inside the env
                .setAllowedOrigins("changethiswhenredafinishesthefrontend")
                .addInterceptors(MyHandShake);
    }
}
