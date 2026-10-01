package com.ft_transcendence.vigil.repositories.alertsrepository;

import com.ft_transcendence.vigil.domain.entities.Alerts.AlertNotification;
import com.ft_transcendence.vigil.domain.entities.Alerts.AlertNotificationId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AlertNotificationRepository extends JpaRepository<AlertNotification, AlertNotificationId> {
    public AlertNotification findByUser_Id_IdAndAlertHistory(UUID UserId,UUID alertHistoryId);
}
