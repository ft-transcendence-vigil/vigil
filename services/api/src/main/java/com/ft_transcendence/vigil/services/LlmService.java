package com.ft_transcendence.vigil.services;

import com.ft_transcendence.vigil.configuration.VigilProperties;
import com.ft_transcendence.vigil.domain.dtos.alerts.Type;
import com.ft_transcendence.vigil.domain.dtos.alerts.WebSocketLlmResponse;
import com.ft_transcendence.vigil.domain.dtos.llm.AlertAskRequestDto;
import com.ft_transcendence.vigil.domain.dtos.llm.LlmRequestDto;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertHistory;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertRules;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.exceptions.InvalidRequestException;
import com.ft_transcendence.vigil.exceptions.ResourcesNotFoundException;
import com.ft_transcendence.vigil.repositories.alertsrepository.AlertHistoryRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.LogRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.MetricsRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.TraceRepository;
import com.ft_transcendence.vigil.websocket.AlertSessionRegistry;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.FutureTask;

@RequiredArgsConstructor
@Service
@Slf4j
public class LlmService {
    private static final String UNAVAILABLE = "Analysis unavailable";
    private final LlmClient llmClient;
    private final VigilProperties vigilProperties;
    private final AlertHistoryRepository alertHistoryRepository;
    private final LogRepository logRepository;
    private final MetricsRepository metricsRepository;
    private final TraceRepository traceRepository;
    private final AlertSessionRegistry alertSessionRegistry;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public void analyze(AlertHistory alert, AlertRules rule)
    {
        LlmRequestDto llmRequestDto = createRequestDto(alert, rule, null);
        Runnable submit = () -> executor.execute(() -> analyzeAndBroadcast(llmRequestDto));
        if (TransactionSynchronizationManager.isActualTransactionActive()
                && TransactionSynchronizationManager.isSynchronizationActive())
        {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization()
            {
                @Override
                public void afterCommit()
                {
                    submit.run();
                }
            });
        }
        else
        {
            submit.run();
        }
    }

    private void analyzeAndBroadcast(LlmRequestDto llmRequestDto)
    {
        String analysis;
        try
        {
            addContext(llmRequestDto);
            analysis = llmClient.stream("/internal/llm/forward", llmRequestDto, null, token -> {});
        }
        catch (Exception ex)
        {
            if (ex instanceof InterruptedException)
                Thread.currentThread().interrupt();
            log.warn("LLM analysis failed for alert {}", llmRequestDto.getAlertId(), ex);
            analysis = UNAVAILABLE;
        }

        try
        {
            if (alertHistoryRepository.updateLlmAnalysis(llmRequestDto.getAlertId(), analysis) == 0)
                return;
            AlertHistory alertHistory = alertHistoryRepository.findById(llmRequestDto.getAlertId()).orElse(null);
            if (alertHistory == null)
                return;
            WebSocketLlmResponse response = WebSocketLlmResponse.builder()
                    .type(Type.llm)
                    .data(new WebSocketLlmResponse.Data(
                            alertHistory.getId(), alertHistory.getStatus().name(), analysis))
                    .build();
            alertSessionRegistry.podcastLlmAnalyze(response);
        }
        catch (RuntimeException ex)
        {
            log.error("Failed to save or broadcast LLM analysis for alert {}", llmRequestDto.getAlertId(), ex);
        }
    }

    @Transactional(readOnly = true)
    public SseEmitter askService(UUID id, AlertAskRequestDto dto)
    {
        UserPrincipal userPrincipal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        UUID userId = userPrincipal.getUser().getId();
        AlertHistory alert = alertHistoryRepository.findById(id)
                .orElseThrow(() -> new ResourcesNotFoundException("No alert history with id: " + id));
        LlmRequestDto llmRequestDto = createRequestDto(alert, null, dto.getQuestion().strip());
        SseEmitter emitter = new SseEmitter(0L);
        FutureTask<Void> task = new FutureTask<>(() ->
        {
            try
            {
                addContext(llmRequestDto);
                llmClient.stream("/internal/llm/ask", llmRequestDto, userId, token ->
                        send(emitter, "token", Map.of("token", token)));
                send(emitter, "done", Map.of());
                emitter.complete();
            }
            catch (Exception ex)
            {
                if (ex instanceof InterruptedException)
                    Thread.currentThread().interrupt();
                log.warn("LLM question failed for alert {}", id, ex);
                try
                {
                    send(emitter, "error", Map.of("message", UNAVAILABLE));
                    emitter.complete();
                }
                catch (RuntimeException disconnected)
                {
                    emitter.completeWithError(disconnected);
                }
            }
        }, null);
        emitter.onCompletion(() -> task.cancel(true));
        emitter.onTimeout(() ->
        {
            task.cancel(true);
            emitter.complete();
        });
        emitter.onError(ex -> task.cancel(true));
        executor.execute(task);
        return emitter;
    }

    private LlmRequestDto createRequestDto(AlertHistory alert, AlertRules rule, String question)
    {
        if (alert.getId() == null || alert.getService() == null || alert.getService().isBlank()
                || alert.getTriggeredAt() == null)
            throw new InvalidRequestException("Save the alert with its service and trigger time before requesting analysis");
        LlmRequestDto.Rule details;
        if (rule == null)
        {
            details = new LlmRequestDto.Rule(alert.getSignalType(), alert.getMetricName(), alert.getAggregation(),
                    alert.getThreshold(), alert.getWindowSeconds(), alert.getSeverity());
        }
        else
        {
            details = new LlmRequestDto.Rule(rule.getSignalType(), rule.getMetricName(), rule.getAggregation(),
                    rule.getThreshold(), rule.getWindowSeconds(), rule.getSeverity());
        }
        String previousAnalysis = question == null ? null : alert.getLlmAnalysis();
        if (previousAnalysis != null && previousAnalysis.length() > 5000)
            previousAnalysis = previousAnalysis.substring(0, 5000);
        return LlmRequestDto.builder()
                .alertId(alert.getId())
                .service(alert.getService())
                .triggeredAt(alert.getTriggeredAt())
                .rule(details)
                .question(question)
                .previousAnalysis(previousAnalysis)
                .build();
    }

    private void addContext(LlmRequestDto llmRequestDto)
    {
        long window = llmRequestDto.getRule().windowSeconds() == null
                ? vigilProperties.getSilenceTimeoutSeconds() : llmRequestDto.getRule().windowSeconds();
        if (window <= 0)
            throw new InvalidRequestException("Analysis window must be positive");
        Instant triggeredAt = llmRequestDto.getTriggeredAt();
        Instant from = triggeredAt.minusSeconds(window);
        String service = llmRequestDto.getService();
        LlmRequestDto.Context context = new LlmRequestDto.Context(
                logRepository.findInWindow(service, from, triggeredAt).stream()
                        .map(row -> new LlmRequestDto.LogRow(row.getService(), row.getTimestamp(),
                                row.getSeverity(), row.getMessage(), row.getAttributes())).toList(),
                metricsRepository.findInWindow(service, from, triggeredAt),
                traceRepository.findInWindow(service, from, triggeredAt));
        llmRequestDto.setContext(context);
    }

    private void send(SseEmitter emitter, String event, Map<String, ?> data)
    {
        try
        {
            emitter.send(SseEmitter.event().name(event).data(data));
        }
        catch (IOException ex)
        {
            throw new UncheckedIOException(ex);
        }
    }

    @PreDestroy
    public void close()
    {
        executor.shutdownNow();
    }
}
