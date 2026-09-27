package com.ft_transcendence.vigil.ratelimiter;

import com.ft_transcendence.vigil.exceptions.TooManyRequestsException;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimiterRegistry {
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    void addLimiter(String key, long capacity, long interval) {
        buckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(l -> l.capacity(capacity).refillIntervally(capacity, Duration.ofSeconds(interval)))
                .build());
    }

    void consum(String key) {
        if (!buckets.get(key).tryConsume(1)) {
            throw new TooManyRequestsException("rate limited");
        }
    }
}
