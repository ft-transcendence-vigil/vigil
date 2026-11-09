package com.ft_transcendence.vigil.ratelimiter;

import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import com.ft_transcendence.vigil.exceptions.TooManyRequestsException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RateLimiterTest {
    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void registryUsesSharedCapacityAndKeepsIndependentIpBudgets() {
        RateLimiterRegistry registry = new RateLimiterRegistry();
        for (int i = 0; i < ApiRateLimitPolicy.CAPACITY; i++) {
            registry.addLimiter("first");
            registry.consum("first");
        }
        assertThrows(TooManyRequestsException.class, () -> registry.consum("first"));
        registry.addLimiter("second");
        assertDoesNotThrow(() -> registry.consum("second"));
    }

    @Test
    void apiKeyGetAndDeletesShareTheSameIpBudget() throws Exception {
        authenticate(UUID.randomUUID());
        HandlerExceptionResolver resolver = mock(HandlerExceptionResolver.class);
        RateLimiter filter = new RateLimiter(new RateLimiterRegistry(), resolver);
        AtomicInteger accepted = new AtomicInteger();
        for (int i = 0; i <= ApiRateLimitPolicy.CAPACITY; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest(
                    i == 0 ? "GET" : "DELETE", i == 0 ? "/api/users" : "/api/users/test");
            request.setRemoteAddr("127.0.0.1");
            request.addHeader("Authorization", "ApiKey test-key");
            filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> accepted.incrementAndGet());
        }
        assertEquals(ApiRateLimitPolicy.CAPACITY, accepted.longValue());
        verify(resolver).resolveException(any(), any(), isNull(), isA(TooManyRequestsException.class));

        MockHttpServletRequest otherIp = new MockHttpServletRequest("GET", "/api/users");
        otherIp.setRemoteAddr("127.0.0.2");
        otherIp.addHeader("Authorization", "ApiKey test-key");
        filter.doFilter(otherIp, new MockHttpServletResponse(), (req, res) -> accepted.incrementAndGet());
        assertEquals(ApiRateLimitPolicy.CAPACITY + 1, accepted.longValue());
    }

    @Test
    void internalIngestRoutesDoNotConsumeHttpBudget() throws Exception {
        RateLimiterRegistry registry = mock(RateLimiterRegistry.class);
        RateLimiter filter = new RateLimiter(registry, mock(HandlerExceptionResolver.class));
        AtomicInteger accepted = new AtomicInteger();
        for (String path : new String[]{"/internal/ingest", "/internal/ingest/batch"}) {
            filter.doFilter(new MockHttpServletRequest("POST", path), new MockHttpServletResponse(),
                    (req, res) -> accepted.incrementAndGet());
        }
        assertEquals(2, accepted.get());
        verifyNoInteractions(registry);
    }

    @Test
    void usersHaveIndependentSixtyRequestBudgetsEvenWhenSharingAnIp() throws Exception {
        HandlerExceptionResolver resolver = mock(HandlerExceptionResolver.class);
        RateLimiter filter = new RateLimiter(new RateLimiterRegistry(), resolver);
        AtomicInteger accepted = new AtomicInteger();
        authenticate(UUID.randomUUID());

        for (int i = 0; i <= 60; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/alerts");
            // Changing IPs must not reset an authenticated user's budget.
            request.setRemoteAddr(i % 2 == 0 ? "127.0.0.1" : "127.0.0.2");
            filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> accepted.incrementAndGet());
        }
        assertEquals(60, accepted.get());
        verify(resolver).resolveException(any(), any(), isNull(), isA(TooManyRequestsException.class));

        authenticate(UUID.randomUUID());
        MockHttpServletRequest otherUser = new MockHttpServletRequest("GET", "/api/alerts");
        otherUser.setRemoteAddr("127.0.0.1");
        filter.doFilter(otherUser, new MockHttpServletResponse(), (req, res) -> accepted.incrementAndGet());
        assertEquals(61, accepted.get());
    }

    @Test
    void userBudgetsRemainSeparateForEachMethodAndEndpoint() throws Exception {
        HandlerExceptionResolver resolver = mock(HandlerExceptionResolver.class);
        RateLimiter filter = new RateLimiter(new RateLimiterRegistry(), resolver);
        AtomicInteger accepted = new AtomicInteger();
        authenticate(UUID.randomUUID());
        for (int i = 0; i < 60; i++) {
            filter.doFilter(new MockHttpServletRequest("GET", "/api/alerts"), new MockHttpServletResponse(),
                    (req, res) -> accepted.incrementAndGet());
        }
        filter.doFilter(new MockHttpServletRequest("POST", "/api/alerts"), new MockHttpServletResponse(),
                (req, res) -> accepted.incrementAndGet());
        filter.doFilter(new MockHttpServletRequest("GET", "/api/users"), new MockHttpServletResponse(),
                (req, res) -> accepted.incrementAndGet());
        assertEquals(62, accepted.get());
        verifyNoInteractions(resolver);
    }

    @Test
    void loginKeepsItsTenRequestIpBudgetRegardlessOfAuthenticatedUser() throws Exception {
        HandlerExceptionResolver resolver = mock(HandlerExceptionResolver.class);
        RateLimiter filter = new RateLimiter(new RateLimiterRegistry(), resolver);
        AtomicInteger accepted = new AtomicInteger();
        for (int i = 0; i <= 10; i++) {
            authenticate(UUID.randomUUID());
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr("127.0.0.1");
            filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> accepted.incrementAndGet());
        }
        assertEquals(10, accepted.get());
        verify(resolver).resolveException(any(), any(), isNull(), isA(TooManyRequestsException.class));

        MockHttpServletRequest otherIp = new MockHttpServletRequest("POST", "/api/auth/login");
        otherIp.setRemoteAddr("127.0.0.2");
        filter.doFilter(otherIp, new MockHttpServletResponse(), (req, res) -> accepted.incrementAndGet());
        assertEquals(11, accepted.get());
    }

    @Test
    void llmForwardRequestsAreNoLongerExemptFromRateLimiting() throws Exception {
        HandlerExceptionResolver resolver = mock(HandlerExceptionResolver.class);
        RateLimiter filter = new RateLimiter(new RateLimiterRegistry(), resolver);
        AtomicInteger accepted = new AtomicInteger();
        for (int i = 0; i <= 60; i++) {
            filter.doFilter(new MockHttpServletRequest("POST", "/internal/llm/forward"),
                    new MockHttpServletResponse(), (req, res) -> accepted.incrementAndGet());
        }
        assertEquals(60, accepted.get());
        verify(resolver).resolveException(any(), any(), isNull(), isA(TooManyRequestsException.class));
    }

    private void authenticate(UUID userId) {
        UserPrincipal principal = new UserPrincipal(User.builder().id(userId).build());
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of()));
    }
}
