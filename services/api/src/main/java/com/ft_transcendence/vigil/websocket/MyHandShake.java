package com.ft_transcendence.vigil.websocket;

import com.ft_transcendence.vigil.configuration.VigilProperties;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import com.ft_transcendence.vigil.repositories.UsersAuth.UserRepository;
import com.ft_transcendence.vigil.security.JjwtService;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;
import java.util.Map;
@RequiredArgsConstructor
@Component
public class MyHandShake implements HandshakeInterceptor {
    private final JjwtService jjwtService;
    private final UserRepository userRepository;
    private final VigilProperties vigilProperties;
    private static final String apiKeyUsername = "Api-Key";

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        try {
            String token = UriComponentsBuilder.fromUri(request.getURI())
                    .build().getQueryParams().getFirst("token");
            if (token == null)
                return invalidToken(response);
            if (token.equals(vigilProperties.getApiKey())) {
                attributes.put("userId", "api-key");
                attributes.put("userEmail", apiKeyUsername);
                attributes.put("userRole", "admin");
                return true;
            }
            String email = null;
            User user = null;
            UserPrincipal principal = null;
            email = jjwtService.getUserName(token);
            user = userRepository.findByEmail(email).orElse(null);
                if (user == null)
                    return invalidToken(response);
                principal = new UserPrincipal(user);
                if (!jjwtService.isTokenValid(token, principal))
                    return invalidToken(response);

            attributes.put("userId", user.getId().toString());
            attributes.put("userEmail",user.getEmail());
            attributes.put("userRole", principal.getAuthorities().stream()
                    .findFirst()
                    .map(GrantedAuthority::getAuthority)
                    .map(s->s.substring(5))
                    .orElse(null));
            return true;
        } catch (Exception e) {
            return invalidToken(response);
        }
    }

    private boolean invalidToken(ServerHttpResponse response) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        return false;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, @Nullable Exception exception) {

    }
}
