package com.ft_transcendence.vigil.ratelimiter;

import com.ft_transcendence.vigil.exceptions.TooManyRequestsException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RateLimiterTest {
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
    }

    @Test
    void internalIngestAndLlmRoutesDoNotConsumeHttpBudget() throws Exception {
        RateLimiterRegistry registry = mock(RateLimiterRegistry.class);
        RateLimiter filter = new RateLimiter(registry, mock(HandlerExceptionResolver.class));
        AtomicInteger accepted = new AtomicInteger();
        for (String path : new String[]{"/internal/ingest", "/internal/ingest/batch",
                "/internal/llm/forward", "/internal/llm/forward/model"}) {
            filter.doFilter(new MockHttpServletRequest("POST", path), new MockHttpServletResponse(),
                    (req, res) -> accepted.incrementAndGet());
        }
        assertEquals(4, accepted.get());
        verifyNoInteractions(registry);
    }
}
