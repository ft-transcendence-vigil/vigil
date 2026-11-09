package com.ft_transcendence.vigil.ratelimiter;

import java.time.Duration;

/** Shared per-IP administration request budget and login request limit. */
public final class ApiRateLimitPolicy {
    public static final long CAPACITY = 10;
    public static final Duration REFILL_PERIOD = Duration.ofSeconds(60);

    private ApiRateLimitPolicy() {}
}
