package com.ft_transcendence.vigil.ingest;

import com.ft_transcendence.vigil.configuration.VigilProperties;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class SilenceWatchdog {
    private final VigilProperties vigilProperties;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final Map<String, Instant> lastStoredAtByService = new HashMap<>();
    private final Map<String, ScheduledFuture<?>> silenceTimers = new HashMap<>();

    public synchronized void updateSilenceTimer(String service, Instant storedAt, Runnable onServiceSilent) {
        Instant lastStoredAt = lastStoredAtByService.get(service);
        if (lastStoredAt != null && !storedAt.isAfter(lastStoredAt))
            return;

        Instant silenceDeadline = storedAt.plusSeconds(vigilProperties.getSilenceTimeoutSeconds());
        long delayMillis = Math.max(0, Duration.between(Instant.now(), silenceDeadline).toMillis());
        ScheduledFuture<?> silenceTimer = scheduler.schedule(
                () -> checkServiceSilence(service, storedAt, onServiceSilent), delayMillis, TimeUnit.MILLISECONDS);

        lastStoredAtByService.put(service, storedAt);
        ScheduledFuture<?> previousTimer = silenceTimers.put(service, silenceTimer);
        if (previousTimer != null)
            previousTimer.cancel(false);
    }

    private void checkServiceSilence(String service, Instant storedAt, Runnable onServiceSilent) {
        synchronized (this) {
            if (!storedAt.equals(lastStoredAtByService.get(service)))
                return;
            silenceTimers.remove(service);
        }
        onServiceSilent.run();
    }

    @PreDestroy
    public void stop() {
        scheduler.shutdownNow();
    }
}
