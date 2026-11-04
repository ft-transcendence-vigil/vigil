package com.ft_transcendence.vigil.ratelimiter;

import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.exceptions.TooManyRequestsException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class RateLimiter extends OncePerRequestFilter {
    private final RateLimiterRegistry rateLimiterRegistry;
    private final HandlerExceptionResolver exceptionResolver;

    public RateLimiter(
            RateLimiterRegistry rateLimiterRegistry,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver
    ) {
        this.rateLimiterRegistry = rateLimiterRegistry;
        this.exceptionResolver = exceptionResolver;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.equals("/internal/ingest")
                || path.startsWith("/internal/ingest/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String identity = "ip:" + request.getRemoteAddr();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!request.getRequestURI().equals("/api/auth/login")
                && auth != null && auth.isAuthenticated()
                && auth.getPrincipal() instanceof UserPrincipal principal) {
            identity = "user:" + principal.getUser().getId();
        }
        String key = identity + "|" + request.getMethod() + "|" + request.getRequestURI();

        try {
            if (request.getRequestURI().equals("/api/auth/login"))
                rateLimiterRegistry.addLimiter(key, 10, 60);
            else
                rateLimiterRegistry.addLimiter(key, 60, 60);
            rateLimiterRegistry.consum(key);
        } catch (TooManyRequestsException e) {
            exceptionResolver.resolveException(
                    request,
                    response,
                    null,
                    e
            );
            return;
        }

        filterChain.doFilter(request, response);
    }
}
