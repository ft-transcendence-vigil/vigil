package com.ft_transcendence.vigil.repositories.alertsrepository;

import com.ft_transcendence.vigil.domain.entities.Alerts.AlertRules;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AlertRuleRepository extends JpaRepository<AlertRules, UUID> {
}
