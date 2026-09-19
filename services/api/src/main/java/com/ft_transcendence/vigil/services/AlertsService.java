package com.ft_transcendence.vigil.services;

import com.ft_transcendence.vigil.domain.dtos.alerts.*;

import java.time.DateTimeException;
import java.time.temporal.ChronoUnit;

import com.ft_transcendence.vigil.domain.entities.Alerts.*;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import com.ft_transcendence.vigil.exceptions.InvalidRequestException;
import com.ft_transcendence.vigil.exceptions.ResourcesNotFoundException;
import com.ft_transcendence.vigil.mappers.AlertRulesGetAndPatchResponseMapper;
import com.ft_transcendence.vigil.mappers.AlertRulesPostRequestMapper;
import com.ft_transcendence.vigil.mappers.AlertRulesPostResponseMapper;
import com.ft_transcendence.vigil.repositories.alertsrepository.AlertAcksRepository;
import com.ft_transcendence.vigil.repositories.alertsrepository.AlertHistoryRepository;
import com.ft_transcendence.vigil.repositories.alertsrepository.AlertRuleRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AlertsService {
    final private AlertAcksRepository alertAcksRepository;
    final private AlertRuleRepository alertRuleRepository;
    final private AlertHistoryRepository alertHistoryRepository;
    final private AlertRulesPostResponseMapper alertRulesPostResponseMapper;
    final private AlertRulesPostRequestMapper alertRulesPostRequestMapper;
    final private AlertRulesGetAndPatchResponseMapper alertRulesGetAndPatchResponseMapper;

    private class CheckAlertParsingRules{
        public static final Set<String> allowedLogsForMetric = Set.of("error_count", "warning_count", "critical_count", "total_count");
        public static final Set<String> allowedTracesForMetric = Set.of("error_rate", "span_count", "avg_duration_ms", "p50_duration_ms", "p95_duration_ms", "p99_duration_ms", "max_duration_ms");
        public static final Set<String> isValidAggregation = Set.of("latest", "avg", "sum", "min", "max", "count", "p50", "p95", "p99");

        public static void validateTheMetrics(SignalType signalType, String metricName, String aggregeration) {
            switch (signalType) {
                case logs:
                    if (allowedLogsForMetric.contains(metricName)) {
                        if (aggregeration != null) {
                            throw new InvalidRequestException("Aggregation  not allowed with traces and logs");
                        }
                    } else
                        throw new InvalidRequestException("Invalid MetriceName" + metricName + " for logs");
                    break;
                case traces:
                    if (allowedTracesForMetric.contains(metricName)) {
                        if (aggregeration != null)
                            throw new InvalidRequestException("Aggregation not allowed with traces and logs");
                    } else {
                        throw new InvalidRequestException("Invalid MetriceName " + metricName + " for traces");
                    }
                    break;
                case metrics:
                    if (aggregeration == null)
                        throw new InvalidRequestException("Aggregation is required for metrics");
                    if (!isValidAggregation.contains(aggregeration))
                        throw new InvalidRequestException("Invalid aggregation: " + aggregeration);
                    // TODO: validate metricName against DB
                    break;
            }
        }
    }

    public AlertRulesPostDtoResponse rulesPostService(AlertRulesPostRequestDto alertRulesPostRequestDto) {
        CheckAlertParsingRules.validateTheMetrics(alertRulesPostRequestDto.getSignalType(),alertRulesPostRequestDto.getMetricName(),alertRulesPostRequestDto.getAggregation());
        AlertRules alertRules = alertRulesPostRequestMapper.map(alertRulesPostRequestDto);
        alertRuleRepository.save(alertRules);
        return alertRulesPostResponseMapper.map(alertRules);
    }

    public PaginationResponse<AlertRulesGetAndPatchResponseDto>getAlertRulesService(int count, UUID offset) {
        List<AlertRules> result = alertRuleRepository.getAlertRulesByCountAndOffset(count + 1, offset);
        boolean hasMore = result.size() > count;
        if (hasMore)
            result.remove(result.size() - 1);
        List<AlertRulesGetAndPatchResponseDto> finalResult = result.stream().map(alertRulesGetAndPatchResponseMapper::map).toList();
        return new PaginationResponse<>(finalResult, hasMore);
    }

    public PaginationResponse<AlertsGetResponseDto> getAlertsService(Integer count, String period, String service, String before) {
        Instant afterInstant = null;
        Instant beforeInstant = null;
        boolean hasMore = false;
        if (period != null)
            afterInstant = switch (period) {
                case "1h" -> Instant.now().minus(1, ChronoUnit.HOURS);
                case "24h" -> Instant.now().minus(24, ChronoUnit.HOURS);
                case "7d" -> Instant.now().minus(7, ChronoUnit.DAYS);
                case "30d" -> Instant.now().minus(30, ChronoUnit.DAYS);
                default -> throw new InvalidRequestException("Invalid period: " + period);
            };
        if (before != null) {
            try {
                beforeInstant = Instant.parse(before);
            } catch (DateTimeException e) {
                throw new InvalidRequestException("Invalid before date format 'ISO8601'");
            }
        }
        List<AlertHistory> alertHistories = alertHistoryRepository.findAlertHistoriesByAggregation(afterInstant, service, count + 1, beforeInstant);
        if (alertHistories.size() == count + 1) {
            alertHistories.remove(count);
            hasMore = true;
        }
        UserPrincipal userPrincipal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        List<AlertAcks> alertAcks = alertAcksRepository.findByIdUserIdAndIdAlertIdIn(userPrincipal.getUser().getId(), alertHistories.stream().map(AlertHistory::getId).toList());
        Map<UUID, AlertAcks> alertAcksMap = alertAcks.stream().collect(Collectors.toMap(a -> a.getId().getAlertId(), a -> a));
        List<AlertsGetResponseDto> alertsGetResponseDtos = alertHistories.stream().map(
                a -> {
                    return AlertsGetResponseDto.builder()
                            .id(a.getId())
                            .aggregation(a.getAggregation())
                            .metricName(a.getMetricName())
                            .myAck(alertAcksMap.get(a.getId()) != null ? new AlertsGetResponseDto.MyAck(alertAcksMap.get(a.getId()).getStatus(), alertAcksMap.get(a.getId()).getAckedAt()) : null)
                            .ruleId(a.getRule() != null ? a.getRule().getId() : null)
                            .llmAnalysis(a.getLlmAnalysis())
                            .signalType(a.getSignalType())
                            .severity(a.getSeverity())
                            .threshold(a.getThreshold())
                            .windowSeconds(a.getWindowSeconds())
                            .triggeredAt(a.getTriggeredAt())
                            .build();

                }
        ).toList();
        return new PaginationResponse<>(alertsGetResponseDtos, hasMore);
    }
    public AlertRulesGetAndPatchResponseDto alertRulesPatchService(UUID id, AlertRulesPatchRequestDto dto) {
        AlertRules alertRules = alertRuleRepository.findById(id)
                .orElseThrow(() -> new ResourcesNotFoundException("No alert rule with id: " + id));

        if (dto.getMetricName() != null || dto.getAggregation() != null) {
            String finalMetricName = alertRules.getMetricName();
            if (dto.getMetricName() != null)
                finalMetricName = dto.getMetricName();
            String finalAggregation = alertRules.getAggregation();
            if (dto.getAggregation() != null)
                finalAggregation = dto.getAggregation();
            CheckAlertParsingRules.validateTheMetrics(alertRules.getSignalType(), finalMetricName, finalAggregation);
        }
        if (dto.getService() != null)
            alertRules.setService(dto.getService());
        if (dto.getMetricName() != null)
            alertRules.setMetricName(dto.getMetricName());
        if (dto.getAggregation() != null)
            alertRules.setAggregation(dto.getAggregation());
        if (dto.getEnabled() != null)
            alertRules.setEnabled(dto.getEnabled());
        if (dto.getWindowSeconds() != null)
            alertRules.setWindowSeconds(dto.getWindowSeconds());
        if (dto.getThreshold() != null)
            alertRules.setThreshold(dto.getThreshold());
        if (dto.getSeverity() != null)
            alertRules.setSeverity(dto.getSeverity());

        alertRuleRepository.save(alertRules);
        return alertRulesGetAndPatchResponseMapper.map(alertRules);
    }
    public void alertRulesDeleteService(UUID id)
    {
        AlertRules alertRules = alertRuleRepository.findById(id).orElseThrow(() -> new ResourcesNotFoundException("Invalid alert rule with id: " + id));
        if (alertRules.isDefault())
            throw new InvalidRequestException("Cannot delete a default rule");
        alertRuleRepository.deleteById(id);
    }

    public AlertAcksPutDtoResponse alertAcksPutService(UUID id, Status status)
    {
        AlertHistory alertHistory = alertHistoryRepository.findById(id).orElseThrow(() -> new ResourcesNotFoundException("No alert with id: " + id));
        UserPrincipal userPrincipal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userPrincipal.getUser();
        AlertAcksId alertAcksId = new AlertAcksId(id, user.getId());
        AlertAcks alertAcks = alertAcksRepository.findById(alertAcksId).orElse(null);
        if (alertAcks == null) {
            alertAcks = new AlertAcks();
            alertAcks.setId(alertAcksId);
            alertAcks.setUser(user);
            alertAcks.setAlert(alertHistory);
            alertAcks.setAckedAt(Instant.now());
        }
        alertAcks.setStatus(status);
        alertAcksRepository.save(alertAcks);
        return new AlertAcksPutDtoResponse(alertHistory.getId(), user.getEmail(), alertAcks.getStatus(), alertAcks.getAckedAt());
    }

}