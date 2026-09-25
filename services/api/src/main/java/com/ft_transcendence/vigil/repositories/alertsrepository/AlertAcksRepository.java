package com.ft_transcendence.vigil.repositories.alertsrepository;

import com.ft_transcendence.vigil.domain.entities.Alerts.AlertAcks;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertAcksId;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertHistory;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertRules;
import com.ft_transcendence.vigil.domain.entities.UsersAuth.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AlertAcksRepository extends JpaRepository<AlertAcks, AlertAcksId> {
     List<AlertAcks> findByIdUserIdAndIdAlertIdIn(UUID userId, List<UUID> alertIds);
}
