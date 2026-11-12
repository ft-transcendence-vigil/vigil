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
    private final Map<String, Instant> lastSeen = new HashMap<>();
    private final Map<String, ScheduledFuture<?>> timers = new HashMap<>();

    public synchronized void seen(String service, Instant storedAt, Runnable onSilent) {
        Instant previous = lastSeen.get(service);
        if (previous != null && !storedAt.isAfter(previous))
            return;

        Instant deadline = storedAt.plusSeconds(vigilProperties.getSilenceTimeoutSeconds());
        long delay = Math.max(0, Duration.between(Instant.now(), deadline).toMillis());
        ScheduledFuture<?> timer = scheduler.schedule(
                () -> fireIfCurrent(service, storedAt, onSilent), delay, TimeUnit.MILLISECONDS);

        lastSeen.put(service, storedAt);
        ScheduledFuture<?> previousTimer = timers.put(service, timer);
        if (previousTimer != null)
            previousTimer.cancel(false);
    }

    private void fireIfCurrent(String service, Instant storedAt, Runnable onSilent) {
        synchronized (this) {
            if (!storedAt.equals(lastSeen.get(service)))
                return;
            timers.remove(service);
        }
        onSilent.run();
    }

    @PreDestroy
    public void stop() {
        scheduler.shutdownNow();
    }
}
