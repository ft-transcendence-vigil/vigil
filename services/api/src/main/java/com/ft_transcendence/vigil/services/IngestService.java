package com.ft_transcendence.vigil.services;

import com.ft_transcendence.vigil.domain.dtos.alerts.Type;
import com.ft_transcendence.vigil.domain.dtos.alerts.WebSocketAlertResponse;
import com.ft_transcendence.vigil.domain.dtos.alerts.WebSocketNotificationResponse;
import com.ft_transcendence.vigil.domain.dtos.ingest.NotificationTriggerDto;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertHistory;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertNotification;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertRules;
import com.ft_transcendence.vigil.domain.entities.Alerts.Severity;
import com.ft_transcendence.vigil.domain.entities.Alerts.Status;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import com.ft_transcendence.vigil.ingest.SilenceWatchdog;
import com.ft_transcendence.vigil.mappers.AlertRulesGetAndPatchResponseMapper;
import com.ft_transcendence.vigil.repositories.alertsrepository.AlertHistoryRepository;
import com.ft_transcendence.vigil.repositories.alertsrepository.AlertRuleRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.AlertRuleEvaluationRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.LogRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.MetricsRepository;
import com.ft_transcendence.vigil.repositories.clickhouse.TraceRepository;
import com.ft_transcendence.vigil.serversentevents.LogSseRegistry;
import com.ft_transcendence.vigil.serversentevents.MetricSseRegistry;
import com.ft_transcendence.vigil.serversentevents.TraceSseRegistry;
import com.ft_transcendence.vigil.services.AlertsService.AlertSaveResult;
import com.ft_transcendence.vigil.websocket.AlertSessionRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class IngestService {
    private static final List<Status> OPEN_ALERT_STATUSES = List.of(Status.sent, Status.acknowledged);

    private final LogRepository logRepository;
    private final TraceRepository traceRepository;
    private final MetricsRepository metricsRepository;
    private final LogSseRegistry logSseRegistry;
    private final TraceSseRegistry traceSseRegistry;
    private final MetricSseRegistry metricSseRegistry;
    private final SilenceWatchdog silenceWatchdog;
    private final AlertRuleRepository alertRuleRepository;
    private final AlertRuleEvaluationRepository alertRuleEvaluationRepository;
    private final AlertHistoryRepository alertHistoryRepository;
    private final AlertsService alertsService;
    private final AlertRulesGetAndPatchResponseMapper alertRulesGetAndPatchResponseMapper;
    private final AlertSessionRegistry alertSessionRegistry;
    private final LlmService llmService;

    public void triggerEvaluationService(NotificationTriggerDto notificationTriggerDto) {
        broadcastTelemetry(notificationTriggerDto);
        for (NotificationTriggerDto.ServiceTimestamp serviceTimestamp : notificationTriggerDto.getServices()) {
            String service = serviceTimestamp.service();
            silenceWatchdog.updateSilenceTimer(service, notificationTriggerDto.getStoredAt(), () -> createSilenceAlert(service));
        }
        List<AlertSaveResult> savedAlerts = evaluateAlertRules(notificationTriggerDto);
        for (AlertSaveResult savedAlert : savedAlerts) {
            notifyAndAnalyzeAlert(savedAlert);
        }
    }

    private void broadcastTelemetry(NotificationTriggerDto notificationTriggerDto) {
        String notificationId = notificationTriggerDto.getNotificationId().toString();
        try {
            switch (notificationTriggerDto.getSignalType()) {
                case logs -> logRepository.findByNotificationId(notificationId).forEach(logSseRegistry::broadCastLog);
                case traces -> traceRepository.findByNotificationId(notificationId).forEach(traceSseRegistry::broadCastTrace);
                case metrics -> metricsRepository.findByNotificationId(notificationId).forEach(metricSseRegistry::broadCastMetric);
            }
        } catch (RuntimeException e) {
            log.error("Failed to stream telemetry for notification {}", notificationId, e);
        }
    }

    private synchronized List<AlertSaveResult> evaluateAlertRules(NotificationTriggerDto notificationTriggerDto) {
        List<AlertHistory> alertHistories = new ArrayList<>();
        for (NotificationTriggerDto.ServiceTimestamp serviceTimestamp : notificationTriggerDto.getServices()) {
            Instant latestTimestamp = serviceTimestamp.latestTimestamp();
            List<AlertRules> alertRules = alertRuleRepository.findByServiceAndSignalTypeAndEnabledTrue(
                    serviceTimestamp.service(), notificationTriggerDto.getSignalType());
            for (AlertRules alertRule : alertRules) {
                Double ruleValue = alertRuleEvaluationRepository.findAlertRuleValue(alertRule, latestTimestamp);
                boolean thresholdReached = ruleValue != null && ruleValue >= alertRule.getThreshold();
                if (!thresholdReached || alertHistoryRepository.existsByRule_IdAndStatusIn(alertRule.getId(), OPEN_ALERT_STATUSES))
                    continue;
                alertHistories.add(createAlertHistory(alertRule, latestTimestamp));
            }
        }
        if (alertHistories.isEmpty()) {
            return List.of();
        }
        return alertsService.saveAlertsService(alertHistories);
    }

    private void createSilenceAlert(String service) {
        AlertHistory alertHistory = new AlertHistory();
        alertHistory.setService(service);
        alertHistory.setTriggeredAt(Instant.now());
        alertHistory.setMetricName("service_silent");
        alertHistory.setSeverity(Severity.critical);
        alertHistory.setStatus(Status.sent);
        try {
            AlertSaveResult savedAlert = alertsService.saveAlertService(alertHistory);
            notifyAndAnalyzeAlert(savedAlert);
        } catch (RuntimeException e) {
            log.error("Failed to save silence alert for service {}", service, e);
        }
    }

    private AlertHistory createAlertHistory(AlertRules alertRule, Instant triggeredAt) {
        AlertHistory alertHistory = new AlertHistory();
        alertHistory.setRule(alertRule);
        alertHistory.setService(alertRule.getService());
        alertHistory.setTriggeredAt(triggeredAt);
        alertHistory.setSignalType(alertRule.getSignalType());
        alertHistory.setMetricName(alertRule.getMetricName());
        alertHistory.setAggregation(alertRule.getAggregation());
        alertHistory.setWindowSeconds(alertRule.getWindowSeconds());
        alertHistory.setThreshold(alertRule.getThreshold());
        alertHistory.setSeverity(alertRule.getSeverity());
        alertHistory.setStatus(Status.sent);
        return alertHistory;
    }

    private void notifyAndAnalyzeAlert(AlertSaveResult savedAlert) {
        AlertHistory alertHistory = savedAlert.alertHistory();
        try {
            alertSessionRegistry.podcastAlert(createWebSocketAlertResponse(alertHistory));
            WebSocketNotificationResponse webSocketNotificationResponse = WebSocketNotificationResponse.builder()
                    .type(Type.Notification)
                    .data(new WebSocketNotificationResponse.Data(
                            alertHistory.getId(), alertHistory.getService(), alertHistory.getTriggeredAt(),
                            alertHistory.getMetricName(), alertHistory.getSignalType(), alertHistory.getSeverity(), false, null))
                    .build();
            for (AlertNotification alertNotification : savedAlert.alertNotifications()) {
                alertSessionRegistry.podcastNoticiation(webSocketNotificationResponse, alertNotification.getAlertNotificationId().getUserId());
            }
        } catch (RuntimeException e) {
            log.error("Failed to broadcast alert {}", alertHistory.getId(), e);
        }
        try {
            llmService.analyze(alertHistory, alertHistory.getRule());
        } catch (RuntimeException e) {
            log.error("Failed to start analysis for alert {}", alertHistory.getId(), e);
        }
    }

    private WebSocketAlertResponse createWebSocketAlertResponse(AlertHistory alertHistory) {
        AlertRules alertRule = alertHistory.getRule();
        User user = alertHistory.getUser();
        return WebSocketAlertResponse.builder()
                .type(Type.alert)
                .data(new WebSocketAlertResponse.Data(
                        alertHistory.getId(),
                        alertRule == null ? null : alertRule.getId(),
                        alertRule == null ? null : alertRulesGetAndPatchResponseMapper.map(alertRule),
                        alertHistory.getService(),
                        alertHistory.getSignalType(),
                        alertHistory.getMetricName(),
                        alertHistory.getAggregation(),
                        alertHistory.getWindowSeconds(),
                        alertHistory.getThreshold(),
                        alertHistory.getSeverity(),
                        alertHistory.getTriggeredAt(),
                        alertHistory.getLlmAnalysis(),
                        alertHistory.getStatus(),
                        user == null ? null : user.getId(),
                        alertHistory.getAckedAt(),
                        alertHistory.getAckedBy(),
                        alertHistory.getResolvedAt(),
                        alertHistory.getResolvedBy(),
                        alertHistory.getVersion()))
                .build();
    }
}
