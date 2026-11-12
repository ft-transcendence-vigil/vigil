package com.ft_transcendence.vigil.repositories.alertsrepository;

import com.ft_transcendence.vigil.domain.entities.Alerts.AlertRules;
import com.ft_transcendence.vigil.domain.entities.Alerts.SignalType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AlertRuleRepository extends JpaRepository<AlertRules, UUID> {
    List<AlertRules> findByServiceAndSignalTypeAndEnabledTrue(String service, SignalType signalType);

    @Query(value = "SELECT * FROM alert_rules ORDER BY id LIMIT :count OFFSET :offset", nativeQuery = true)
    List<AlertRules> getAlertRulesByCountAndOffset(@Param("count") int count, @Param("offset") int offset);
}
