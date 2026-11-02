package com.ft_transcendence.vigil.websocket;

import com.ft_transcendence.vigil.configuration.VigilProperties;
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
    private final MyHandShake MyHandShake;
    private final VigilProperties vigilProperties;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {

        registry.addHandler(handler, "/api/alerts/ws")
                .setAllowedOrigins(vigilProperties.getFrontEndUrl())
                .addInterceptors(MyHandShake);
    }
}
