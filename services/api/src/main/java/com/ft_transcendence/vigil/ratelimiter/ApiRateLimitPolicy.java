package com.ft_transcendence.vigil.ratelimiter;

import java.time.Duration;

/** Shared per-IP HTTP request budget, including API-key requests. */
public final class ApiRateLimitPolicy {
    public static final long CAPACITY = 10;
    public static final Duration REFILL_PERIOD = Duration.ofSeconds(60);

    private ApiRateLimitPolicy() {}
}
