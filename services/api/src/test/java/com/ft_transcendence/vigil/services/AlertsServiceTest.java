package com.ft_transcendence.vigil.services;

import com.ft_transcendence.vigil.domain.dtos.alerts.AlertRulesPostRequestDto;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertRules;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import com.ft_transcendence.vigil.exceptions.ForbiddenException;
import com.ft_transcendence.vigil.exceptions.InvalidRequestException;
import com.ft_transcendence.vigil.exceptions.ResourcesNotFoundException;
import com.ft_transcendence.vigil.mappers.AlertRulesGetAndPatchResponseMapper;
import com.ft_transcendence.vigil.mappers.AlertRulesPostRequestMapper;
import com.ft_transcendence.vigil.mappers.AlertRulesPostResponseMapper;
import com.ft_transcendence.vigil.repositories.alertsrepository.AlertAcksRepository;
import com.ft_transcendence.vigil.repositories.alertsrepository.AlertHistoryRepository;
import com.ft_transcendence.vigil.repositories.alertsrepository.AlertRuleRepository;
import com.ft_transcendence.vigil.websocket.AlertSessionRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AlertsServiceTest {
    private AlertRuleRepository rules;
    private AlertRulesPostRequestMapper requestMapper;
    private AlertsService service;

    @BeforeEach
    void setUp() {
        rules = mock(AlertRuleRepository.class);
        requestMapper = mock(AlertRulesPostRequestMapper.class);
        service = new AlertsService(
                mock(AlertAcksRepository.class), mock(AlertSessionRegistry.class), rules,
                mock(AlertHistoryRepository.class), mock(AlertRulesPostResponseMapper.class),
                requestMapper, mock(AlertRulesGetAndPatchResponseMapper.class));
    }

    @ParameterizedTest
    @CsvSource({"logs,invalid,null", "traces,invalid,null", "metrics,cpu_usage,null", "metrics,cpu_usage,median"})
    void rejectsInvalidMetricRulesBeforeSaving(String signal, String metric, String aggregation) {
        AlertRulesPostRequestDto request = request(SignalType.valueOf(signal), metric,
                "null".equals(aggregation) ? null : aggregation);

        assertThatThrownBy(() -> service.rulesPostService(request)).isInstanceOf(InvalidRequestException.class);
        verifyNoInteractions(rules, requestMapper);
    }

    @Test
    void acceptedMetricRuleIsNeverMarkedAsDefault() {
        AlertRulesPostRequestDto request = request(SignalType.metrics, "cpu_usage", "avg");
        AlertRules mapped = new AlertRules();
        mapped.setDefault(true);
        when(requestMapper.map(request)).thenReturn(mapped);

        service.rulesPostService(request);

        assertThat(mapped.isDefault()).isFalse();
        verify(rules).save(mapped);
    }

    @Test
    void rejectsAggregationForLogDerivedRule() {
        AlertRulesPostRequestDto request = request(SignalType.logs, "error_count", "sum");
        assertThatThrownBy(() -> service.rulesPostService(request)).isInstanceOf(InvalidRequestException.class);
        verifyNoInteractions(rules);
    }

    @Test
    void rulePaginationUsesLookaheadWithoutReturningExtraRule() {
        when(rules.getAlertRulesByCountAndOffset(3, 5))
                .thenReturn(new ArrayList<>(List.of(new AlertRules(), new AlertRules(), new AlertRules())));

        var page = service.getAlertRulesService(2, 5);

        assertThat(page.getData()).hasSize(2);
        assertThat(page.getHasMore()).isTrue();
        verify(rules).getAlertRulesByCountAndOffset(3, 5);
    }

    @Test
    void defaultRuleCannotBeDeleted() {
        UUID id = UUID.randomUUID();
        AlertRules rule = new AlertRules();
        rule.setDefault(true);
        when(rules.findById(id)).thenReturn(Optional.of(rule));

        assertThatThrownBy(() -> service.alertRulesDeleteService(id)).isInstanceOf(ForbiddenException.class);
        verify(rules, never()).deleteById(any());
    }

    @Test
    void missingRuleReportsNotFoundOnDelete() {
        UUID id = UUID.randomUUID();
        when(rules.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.alertRulesDeleteService(id)).isInstanceOf(ResourcesNotFoundException.class);
        verify(rules, never()).deleteById(any());
    }

    @Test
    void customRuleCanBeDeleted() {
        UUID id = UUID.randomUUID();
        when(rules.findById(id)).thenReturn(Optional.of(new AlertRules()));

        service.alertRulesDeleteService(id);

        verify(rules).deleteById(id);
    }

    private AlertRulesPostRequestDto request(SignalType signal, String metric, String aggregation) {
        AlertRulesPostRequestDto request = new AlertRulesPostRequestDto();
        request.setSignalType(signal);
        request.setMetricName(metric);
        request.setAggregation(aggregation);
        return request;
    }
}
